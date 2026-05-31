import { useState } from "react";
import { useCart } from "@/racenroam/context/CartContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/racenroam/components/ui/dialog";
import { supabase } from "@/racenroam/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  customer_name: z.string().trim().min(1, "Name required").max(200),
  customer_email: z.string().trim().email("Invalid email").max(255),
  customer_phone: z.string().trim().max(50).optional().or(z.literal("")),
  shipping_address: z.string().trim().min(1, "Address required").max(500),
  shipping_city: z.string().trim().min(1, "City required").max(100),
  shipping_state: z.string().trim().max(100).optional().or(z.literal("")),
  shipping_zip: z.string().trim().min(1, "ZIP required").max(20),
  shipping_country: z.string().trim().max(50),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

const inputClass =
  "w-full bg-input border border-grey-mid px-3 py-2.5 font-body text-sm text-foreground placeholder:text-grey-light focus:outline-none focus:border-primary transition-colors";
const labelClass = "font-tech text-[10px] tracking-[2px] text-grey-light uppercase block mb-1.5";

export const CheckoutDialog = () => {
  const { isCheckoutOpen, setIsCheckoutOpen, items, total, clearCart } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    shipping_address: "",
    shipping_city: "",
    shipping_state: "",
    shipping_zip: "",
    shipping_country: "US",
    notes: "",
  });

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleClose = (open: boolean) => {
    setIsCheckoutOpen(open);
    if (!open && submitted) {
      // reset for next time
      setSubmitted(false);
      setOrderId(null);
      setForm({ customer_name: "", customer_email: "", customer_phone: "", shipping_address: "", shipping_city: "", shipping_state: "", shipping_zip: "", shipping_country: "US", notes: "" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Please check the form");
      return;
    }
    setSubmitting(true);
    try {
      const shipping = 8;
      const orderTotal = total + shipping;
      const note = `Order for ${parsed.data.customer_name} — ${items.map(i => `${i.quantity}x ${i.name}${i.size ? ` (${i.size})` : ""}`).join(", ")} + $${shipping.toFixed(2)} shipping`;
      const res = await fetch("/api/submit-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, size: i.size })),
          shipping_amount: shipping,
        }),
      });
      console.log("submit-order response status:", res.status);
      if (!res.ok) {
        const errText = await res.text();
        console.error("submit-order error response:", errText);
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }
      const data = await res.json();
      console.log("submit-order response data:", data);
      if (!data?.success) throw new Error(data?.error || "Order failed");
      setOrderId(data.order_id);
      setSubmitted(true);
      clearCart();
      // Redirect to PayPal in a new tab
      const paypalUrl = `https://www.paypal.com/paypalme/RaceNRoam/${orderTotal.toFixed(2)}USD?note=${encodeURIComponent(note)}`;
      window.open(paypalUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error(err);
      toast.error("Could not place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isCheckoutOpen} onOpenChange={handleClose}>
      <DialogContent style={{ background: '#111111', borderColor: 'hsl(var(--primary) / 0.5)' }} className="border text-foreground max-w-2xl backdrop-blur-0 p-0 flex flex-col max-h-none h-auto">
        {submitted ? (
          <div className="text-center py-8 px-6">
            <CheckCircle2 className="w-16 h-16 text-primary-bright mx-auto mb-4" />
            <DialogTitle className="font-display text-4xl tracking-[4px] mb-2">ORDER SAVED</DialogTitle>
            <p className="font-body text-grey-text mb-2">Your shipping info is saved. Complete payment with PayPal to finalize your order.</p>
            {orderId && <p className="font-tech text-[10px] tracking-[2px] text-grey-light mb-4">ORDER ID: {orderId.slice(0, 8).toUpperCase()}</p>}
            <a
              href="https://www.paypal.com/paypalme/RaceNRoam"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-race inline-block"
            >
              OPEN PAYPAL
            </a>
            <button onClick={() => handleClose(false)} className="btn-ghost-race ml-2">CLOSE</button>
          </div>
        ) : (
          <>
            <div className="px-6 py-8 border-b border-grey-mid">
              <DialogTitle className="font-display text-3xl tracking-[4px] mb-3">CHECKOUT</DialogTitle>
              <p className="font-tech text-[10px] tracking-[3px] text-grey-light uppercase">{items.length} item(s) — ${total.toFixed(2)}</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6 overflow-y-auto max-h-[55vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Full Name *</label>
                  <input className={inputClass} value={form.customer_name} onChange={update("customer_name")} required maxLength={200} />
                </div>
                <div>
                  <label className={labelClass}>Email *</label>
                  <input type="email" className={inputClass} value={form.customer_email} onChange={update("customer_email")} required maxLength={255} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Phone (optional)</label>
                <input className={inputClass} value={form.customer_phone} onChange={update("customer_phone")} maxLength={50} />
              </div>

              <div className="border-t border-grey-mid pt-4">
                <div className="font-tech text-[10px] tracking-[3px] text-primary-bright uppercase mb-3">Shipping Address</div>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Street Address *</label>
                    <input className={inputClass} value={form.shipping_address} onChange={update("shipping_address")} required maxLength={500} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>City *</label>
                      <input className={inputClass} value={form.shipping_city} onChange={update("shipping_city")} required maxLength={100} />
                    </div>
                    <div>
                      <label className={labelClass}>State / Region</label>
                      <input className={inputClass} value={form.shipping_state} onChange={update("shipping_state")} maxLength={100} />
                    </div>
                    <div>
                      <label className={labelClass}>ZIP / Postal *</label>
                      <input className={inputClass} value={form.shipping_zip} onChange={update("shipping_zip")} required maxLength={20} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Country *</label>
                    <input className={inputClass} value={form.shipping_country} onChange={update("shipping_country")} required maxLength={50} />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Order Notes (optional)</label>
                <textarea className={`${inputClass} min-h-[70px] resize-none`} value={form.notes} onChange={update("notes")} maxLength={1000} placeholder="Any special instructions?" />
              </div>
            </form>

            <div className="border-t border-grey-mid px-6 py-6 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between font-tech text-xs text-grey-light">
                  <span className="tracking-[2px] uppercase">Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between font-tech text-xs text-grey-light">
                  <span className="tracking-[2px] uppercase">Shipping</span>
                  <span>$8.00</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-tech text-[10px] tracking-[3px] text-grey-light uppercase">Order Total</div>
                  <div className="font-display text-3xl tracking-wider">${(total + 8).toFixed(2)}</div>
                </div>
                <button onClick={handleSubmit} disabled={submitting || items.length === 0} style={{ background: '#e63946', color: '#fff', padding: '16px 24px', borderRadius: '0px', fontWeight: 700, border: '3px solid #e63946', transition: 'all 0.2s', cursor: 'pointer', fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', boxShadow: '0 4px 12px rgba(230, 57, 70, 0.4)', whiteSpace: 'nowrap' }} className="disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-display tracking-wider flex-shrink-0" onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.background = '#d62828', e.currentTarget.style.boxShadow = '0 6px 20px rgba(230, 57, 70, 0.6)', e.currentTarget.style.transform = 'translateY(-2px)')} onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.background = '#e63946', e.currentTarget.style.boxShadow = '0 4px 12px rgba(230, 57, 70, 0.4)', e.currentTarget.style.transform = 'translateY(0)')}>
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> SUBMITTING...</> : "CONTINUE TO PAYPAL"}
                </button>
              </div>
              <p className="font-body text-xs text-grey-light text-center">
                Your shipping info is saved, then you'll be redirected to PayPal to pay.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
