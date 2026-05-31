// submit-order — saves a new order to the Supabase `orders` table via Cloudflare Pages Function
// No emails sent; RaceNRoam reviews orders manually via /orders page

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const onRequest = async (context) => {
  if (context.request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (context.request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    console.log("submit-order called");
    console.log("env vars:", {
      supabaseUrl: context.env.VITE_SUPABASE_URL ? "✓" : "✗",
      serviceRoleKey: context.env.SUPABASE_SERVICE_ROLE_KEY ? "✓" : "✗"
    });
    const body = await context.request.json();
    console.log("request body received:", { ...body, customer_email: body.customer_email?.slice(0, 10) + "..." });

    // Basic validation
    const required = ["customer_name", "customer_email", "shipping_address", "shipping_city", "shipping_zip"];
    for (const key of required) {
      if (!body[key] || typeof body[key] !== "string" || body[key].trim() === "") {
        return new Response(JSON.stringify({ error: `Missing required field: ${key}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.customer_email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return new Response(JSON.stringify({ error: "Cart is empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Recompute total server-side
    let total = 0;
    for (const item of body.items) {
      const price = Number(item.price);
      const qty = Number(item.quantity);
      if (!Number.isFinite(price) || !Number.isFinite(qty) || qty < 1) {
        return new Response(JSON.stringify({ error: "Invalid item" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      total += price * qty;
    }

    const shipping = Number.isFinite(Number(body.shipping_amount)) ? Number(body.shipping_amount) : 8;
    total += shipping;

    // Use Supabase REST API directly
    const supabaseUrl = context.env.VITE_SUPABASE_URL;
    const serviceRoleKey = context.env.SUPABASE_SERVICE_ROLE_KEY;

    const res = await fetch(`${supabaseUrl}/rest/v1/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
      body: JSON.stringify({
        customer_name: body.customer_name.trim().slice(0, 200),
        customer_email: body.customer_email.trim().toLowerCase().slice(0, 255),
        customer_phone: body.customer_phone?.trim().slice(0, 50) || null,
        shipping_address: body.shipping_address.trim().slice(0, 500),
        shipping_city: body.shipping_city.trim().slice(0, 100),
        shipping_state: body.shipping_state?.trim().slice(0, 100) || null,
        shipping_zip: body.shipping_zip.trim().slice(0, 20),
        shipping_country: (body.shipping_country || "US").trim().slice(0, 50),
        notes: body.notes?.trim().slice(0, 1000) || null,
        items: body.items,
        total_amount: total.toFixed(2),
        status: "pending",
      }),
    });

    console.log("Supabase response status:", res.status);
    const responseText = await res.text();
    console.log("Supabase response text:", responseText);

    if (!res.ok) {
      console.error("Supabase insert error:", res.status, responseText);
      return new Response(JSON.stringify({ error: "Failed to save order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse Supabase response:", e);
      // If response is empty but status 201, treat as success
      if (res.status === 201 && !responseText) {
        return new Response(JSON.stringify({ success: true, order_id: "created" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw e;
    }

    console.log("Supabase response:", JSON.stringify(data));
    const orderId = Array.isArray(data) ? data[0]?.id : data?.id;
    console.log("Extracted order ID:", orderId);
    return new Response(JSON.stringify({ success: true, order_id: orderId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("submit-order error:", err);
    return new Response(JSON.stringify({ error: "Server error", details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};
