import { useCart } from "@/racenroam/context/CartContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/racenroam/components/ui/sheet";
import { ProductIcon } from "./ProductIcon";
import { Trash2, Minus, Plus } from "lucide-react";

export const CartDrawer = () => {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, total, setIsCheckoutOpen, count } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="right" className="bg-background border-l border-primary/30 text-foreground w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-6 border-b border-grey-mid">
          <SheetTitle className="font-display text-3xl tracking-[4px] text-foreground">YOUR CART</SheetTitle>
          <p className="font-tech text-[10px] tracking-[3px] text-grey-light uppercase">{count} {count === 1 ? "ITEM" : "ITEMS"}</p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-20">
              <div className="font-tech text-[11px] tracking-[3px] text-grey-light uppercase">Your cart is empty</div>
              <button onClick={() => setIsOpen(false)} className="btn-ghost-race mt-6">Keep Shopping</button>
            </div>
          ) : (
            items.map((item) => (
              <div key={`${item.id}-${item.size ?? ""}`} className="flex gap-3 bg-grey-dark p-3 border border-grey-mid">
                <div className="w-20 h-20 bg-grey-mid flex items-center justify-center text-grey-light shrink-0">
                  <ProductIcon type={item.icon} className="w-10 h-10 opacity-40" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-tech text-[9px] tracking-[3px] text-primary-bright uppercase">{item.category}</div>
                  <div className="font-body font-bold text-sm truncate">{item.name}</div>
                  {item.size && <div className="font-tech text-[10px] text-grey-light">SIZE: {item.size}</div>}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1 border border-grey-mid">
                      <button onClick={() => updateQuantity(item.id, item.size, item.quantity - 1)} className="p-1.5 hover:bg-grey-mid"><Minus className="w-3 h-3" /></button>
                      <span className="font-tech text-xs px-2 min-w-[24px] text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)} className="p-1.5 hover:bg-grey-mid"><Plus className="w-3 h-3" /></button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-tech text-sm font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                      <button onClick={() => removeItem(item.id, item.size)} className="text-grey-light hover:text-primary-bright"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-grey-mid p-6 space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-tech text-[11px] tracking-[3px] text-grey-light uppercase">Subtotal</span>
                <span className="font-tech text-sm text-foreground">${total.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-tech text-[11px] tracking-[3px] text-grey-light uppercase">Shipping</span>
                <span className="font-tech text-sm text-foreground">$8.00</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-grey-mid">
                <span className="font-tech text-[11px] tracking-[3px] text-grey-light uppercase">Total</span>
                <span className="font-display text-3xl tracking-wider text-foreground">${(total + 8).toFixed(2)}</span>
              </div>
            </div>
            <p className="font-body text-xs text-grey-light">Enter shipping info, then pay with PayPal.</p>
            <button
              onClick={() => { setIsOpen(false); setIsCheckoutOpen(true); }}
              className="btn-race w-full"
            >
              Checkout · ${(total + 8).toFixed(2)}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
