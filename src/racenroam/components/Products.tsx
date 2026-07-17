import { PRODUCTS } from "@/racenroam/data/products";
import { useCart } from "@/racenroam/context/CartContext";
import { ProductIcon } from "./ProductIcon";
import { useState } from "react";
import { toast } from "sonner";

export const Products = () => {
  const { addItem } = useCart();
  const [sizeSelect, setSizeSelect] = useState<Record<string, string>>({});

  const handleAdd = (product: typeof PRODUCTS[number]) => {
    const size = product.sizes ? sizeSelect[product.id] || product.sizes[1] : undefined;
    addItem(product, size);
    toast.success(`Added: ${product.name}${size ? ` (${size})` : ""}`);
  };

  return (
    <section id="products" className="bg-grey-dark relative py-24 px-5 md:px-12">
      <div className="absolute top-0 inset-x-0 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)" }} />
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
          <div>
            <div className="font-tech text-[10px] tracking-[5px] text-primary-bright uppercase mb-3">001 // Collection</div>
            <h2 className="font-display text-[clamp(40px,6vw,72px)] tracking-[4px] leading-none">THE DROP</h2>
          </div>
          <div className="font-tech text-[10px] tracking-[3px] text-grey-light uppercase">{PRODUCTS.length} Items Available</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
          {PRODUCTS.map((product) => (
            <article key={product.id} className="bg-background overflow-hidden cursor-pointer transition-transform hover:-translate-y-1 group">
              <div className="aspect-square overflow-hidden bg-grey-mid relative">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 transition-transform group-hover:scale-105 text-grey-light font-body text-sm tracking-[2px] uppercase" style={{ background: "linear-gradient(135deg, hsl(var(--grey-mid)), hsl(var(--grey-dark)))" }}>
                    <div className="opacity-30"><ProductIcon type={product.icon} /></div>
                    {product.name}
                  </div>
                )}
                {product.badge && (
                  <div className={`absolute top-3 right-3 font-tech text-[9px] font-bold tracking-[2px] px-2.5 py-1 clip-angle-xs ${product.soldOut ? 'bg-grey-mid text-grey-light' : 'bg-primary text-foreground'}`}>
                    {product.badge}
                  </div>
                )}
                {!product.soldOut && (
                  <div className="absolute inset-0 bg-primary/[0.08] border-2 border-primary/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={() => handleAdd(product)} className="font-tech text-[11px] font-bold tracking-[2px] bg-primary text-foreground px-6 py-3 clip-angle-sm hover:bg-primary-bright">
                      + ADD TO CART
                    </button>
                  </div>
                )}
              </div>
              <div className="p-5 border-t border-grey-mid">
                <div className="font-tech text-[9px] tracking-[3px] text-primary-bright uppercase mb-1.5">{product.category}</div>
                <h3 className="font-body text-lg font-bold tracking-wider text-foreground mb-1">{product.name}</h3>
                {product.soldOut && (
                  <p className="font-tech text-[9px] tracking-[2px] uppercase text-grey-light mb-2">Out of stock</p>
                )}
                {product.sizes && (
                  <div className="flex gap-1 mb-3 flex-wrap">
                    {product.sizes.map((s) => {
                      const active = (sizeSelect[product.id] || product.sizes![1]) === s;
                      return (
                        <button
                          key={s}
                          onClick={() => setSizeSelect((p) => ({ ...p, [product.id]: s }))}
                          className={`font-tech text-[10px] font-bold tracking-wider px-2 py-1 border transition-colors ${
                            active ? "bg-primary border-primary text-foreground" : "bg-transparent border-grey-mid text-grey-light hover:border-grey-light"
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="font-tech text-base font-bold text-foreground">${product.price.toFixed(2)}</span>
                  <button onClick={() => !product.soldOut && handleAdd(product)} disabled={product.soldOut} className={`w-9 h-9 flex items-center justify-center clip-angle-xs text-xl leading-none ${product.soldOut ? 'bg-grey-dark text-grey-light cursor-not-allowed opacity-40' : 'bg-grey-mid text-foreground transition-colors hover:bg-primary'}`}>
                    +
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
