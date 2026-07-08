import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/racenroam/integrations/supabase/client";
import { Loader2, LogOut, Package } from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string | null;
  shipping_zip: string;
  shipping_country: string;
  notes: string | null;
  items: Array<{ name: string; price: number; quantity: number; size?: string }>;
  total_amount: number;
  status: string;
  created_at: string;
}

const btnStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 700,
  letterSpacing: '0.04em',
  color: '#fff',
  padding: '8px 14px',
  background: '#e63946',
  border: '2px solid #e63946',
  borderRadius: '0px',
  transition: 'all 0.2s',
  boxShadow: '0 4px 12px rgba(230, 57, 70, 0.4)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  cursor: 'pointer',
  textDecoration: 'none',
  whiteSpace: 'nowrap' as const,
};

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        navigate("/auth");
        return;
      }
      const userId = sessionData.session.user.id;
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (!mounted) return;
      if (!roleData) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      setIsAdmin(true);
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("Failed to load orders");
      } else {
        setOrders((ordersData as any) ?? []);
      }
      setLoading(false);
    };
    init();
    return () => { mounted = false; };
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error("Failed to update");
    if (status === "cancelled") {
      setOrders((prev) => prev.filter((o) => o.id !== id));
      toast.success("Order cancelled and removed");
    } else {
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
      toast.success("Status updated");
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-5">
        <div className="max-w-md text-center bg-grey-dark border border-grey-mid p-8">
          <h1 className="font-display text-3xl tracking-[4px] text-foreground mb-3">ACCESS DENIED</h1>
          <p className="font-body text-grey-text mb-2">Your account doesn't have admin access yet.</p>
          <p className="font-body text-sm text-grey-light mb-6">
            Open the backend dashboard, find your user in <span className="text-foreground">Database → user_roles</span>, and add a row with <span className="text-foreground">role = 'admin'</span> for your user ID.
          </p>
          <button onClick={handleSignOut} className="btn-ghost-race">SIGN OUT</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header — stacks to two rows on mobile */}
      <header className="border-b border-grey-mid px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Package className="w-5 h-5 text-primary-bright shrink-0" />
          <h1 className="font-display text-lg sm:text-2xl tracking-[3px] sm:tracking-[4px] truncate">ORDERS</h1>
          <span className="font-tech text-[9px] tracking-[2px] text-grey-light uppercase shrink-0">{orders.length} TOTAL</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href="/" style={btnStyle}>← BACK</a>
          <button onClick={handleSignOut} style={btnStyle}>
            <LogOut className="w-4 h-4" /> SIGN OUT
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-6 space-y-4">
        {orders.length === 0 ? (
          <div className="text-center py-20 font-tech text-[11px] tracking-[3px] text-grey-light uppercase">No orders yet</div>
        ) : (
          orders.map((o) => (
            <article key={o.id} className="bg-grey-dark border border-grey-mid p-4 sm:p-5">
              {/* Order header — name/date on top, total + status below on mobile */}
              <div className="mb-4">
                <div className="font-tech text-[10px] tracking-[2px] text-grey-light uppercase">
                  {new Date(o.created_at).toLocaleString()}
                </div>
                <div className="flex items-start justify-between gap-3 mt-1 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-body text-lg font-bold truncate">{o.customer_name}</div>
                    <div className="font-body text-sm text-grey-text break-all">{o.customer_email}{o.customer_phone ? ` • ${o.customer_phone}` : ""}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-display text-2xl sm:text-3xl tracking-wider">${Number(o.total_amount).toFixed(2)}</div>
                    <select
                      value={o.status}
                      onChange={(e) => updateStatus(o.id, e.target.value)}
                      className="mt-1 w-full bg-input border border-grey-mid font-tech text-[10px] tracking-[2px] uppercase px-2 py-1 text-foreground"
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Shipping + Items — stack on mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="font-tech text-[10px] tracking-[2px] text-primary-bright uppercase mb-2">Shipping</div>
                  <div className="font-body text-sm text-grey-text">
                    <div>{o.shipping_address}</div>
                    <div>{o.shipping_city}{o.shipping_state ? `, ${o.shipping_state}` : ""} {o.shipping_zip}</div>
                    <div>{o.shipping_country}</div>
                  </div>
                  {o.notes && (
                    <div className="mt-3">
                      <div className="font-tech text-[10px] tracking-[2px] text-grey-light uppercase mb-1">Notes</div>
                      <div className="font-body text-sm text-grey-text">{o.notes}</div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-tech text-[10px] tracking-[2px] text-primary-bright uppercase mb-2">Items</div>
                  <ul className="space-y-1">
                    {o.items.map((it, idx) => (
                      <li key={idx} className="font-body text-sm text-grey-text flex justify-between gap-3">
                        <span className="min-w-0 truncate">{it.quantity}× {it.name}{it.size ? ` (${it.size})` : ""}</span>
                        <span className="text-foreground shrink-0">${(Number(it.price) * it.quantity).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))
        )}
      </main>
    </div>
  );
};

export default Orders;
