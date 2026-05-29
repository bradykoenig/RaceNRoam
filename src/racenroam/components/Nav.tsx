import { useCart } from "@/racenroam/context/CartContext";
import { ShoppingCart } from "lucide-react";

export const Nav = () => {
  const { count, setIsOpen } = useCart();
  return (
    <nav className="fixed top-0 inset-x-0 z-[1000] flex items-center justify-between px-5 md:px-12 h-[72px] bg-background/90 backdrop-blur-md border-b border-primary/30">
      <a href="#" className="font-display text-[28px] tracking-[4px] text-primary-bright" style={{ textShadow: "0 0 20px hsl(var(--primary-bright) / 0.5)" }}>
        RaceNRoam
      </a>
      <ul className="hidden md:flex gap-10 list-none items-center">
        {[
          { label: "Shop", href: "#products" },
          { label: "About", href: "#about" },
          { label: "Socials", href: "#social" },
          { label: "Live Race Hub", href: "/watch-party", isLink: true },
        ].map((l) => (
          <li key={l.href}>
            {l.isLink ? (
              <a href={l.href} className="font-tech text-[11px] font-bold tracking-[3px] uppercase text-primary-bright border border-primary-bright px-4 py-2 hover:bg-primary-bright hover:text-background transition-colors">
                {l.label}
              </a>
            ) : (
              <a href={l.href} className="font-tech text-[11px] font-bold tracking-[3px] uppercase text-grey-text hover:text-foreground transition-colors relative group">
                {l.label}
                <span className="absolute -bottom-1 inset-x-0 h-px bg-primary-bright scale-x-0 group-hover:scale-x-100 transition-transform" />
              </a>
            )}
          </li>
        ))}
      </ul>
      <button
        onClick={() => setIsOpen(true)}
        className="font-tech text-[11px] font-bold tracking-[2px] text-background bg-primary px-5 py-2.5 clip-angle-sm hover:bg-primary-bright transition-colors flex items-center gap-2"
      >
        <ShoppingCart className="w-4 h-4" /> CART ({count})
      </button>
    </nav>
  );
};
