// submit-order — saves a new order to the Supabase `orders` table.
// Emails are not sent; RaceNRoam reviews new orders via the /orders admin page.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
}

interface OrderPayload {
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  shipping_address: string;
  shipping_city: string;
  shipping_state?: string;
  shipping_zip: string;
  shipping_country?: string;
  notes?: string;
  items: CartItem[];
  shipping_amount?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as OrderPayload;

    // Basic validation
    const required = [
      "customer_name",
      "customer_email",
      "shipping_address",
      "shipping_city",
      "shipping_zip",
    ] as const;
    for (const key of required) {
      if (!body[key] || typeof body[key] !== "string" || body[key].trim() === "") {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${key}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
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
      const qty   = Number(item.quantity);
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("orders")
      .insert({
        customer_name:    body.customer_name.trim().slice(0, 200),
        customer_email:   body.customer_email.trim().toLowerCase().slice(0, 255),
        customer_phone:   body.customer_phone?.trim().slice(0, 50) || null,
        shipping_address: body.shipping_address.trim().slice(0, 500),
        shipping_city:    body.shipping_city.trim().slice(0, 100),
        shipping_state:   body.shipping_state?.trim().slice(0, 100) || null,
        shipping_zip:     body.shipping_zip.trim().slice(0, 20),
        shipping_country: (body.shipping_country || "US").trim().slice(0, 50),
        notes:            body.notes?.trim().slice(0, 1000) || null,
        items:            body.items,
        total_amount:     total.toFixed(2),
        status:           "pending",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: "Failed to save order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, order_id: data.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("submit-order error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
