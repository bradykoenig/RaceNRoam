import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  badge?: string;
  icon: "shirt" | "hat" | "hoodie" | "sticker";
  sizes?: string[];
  image?: string;
}

export interface CartItem extends Product {
  quantity: number;
  size?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, size?: string) => void;
  removeItem: (id: string, size?: string) => void;
  updateQuantity: (id: string, size: string | undefined, qty: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = "racenroam_cart";

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const keyOf = (id: string, size?: string) => `${id}::${size ?? ""}`;

  const addItem = (product: Product, size?: string) => {
    setItems((prev) => {
      const k = keyOf(product.id, size);
      const idx = prev.findIndex((i) => keyOf(i.id, i.size) === k);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { ...product, size, quantity: 1 }];
    });
  };

  const removeItem = (id: string, size?: string) => {
    setItems((prev) => prev.filter((i) => keyOf(i.id, i.size) !== keyOf(id, size)));
  };

  const updateQuantity = (id: string, size: string | undefined, qty: number) => {
    if (qty < 1) return removeItem(id, size);
    setItems((prev) =>
      prev.map((i) => (keyOf(i.id, i.size) === keyOf(id, size) ? { ...i, quantity: qty } : i)),
    );
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, total, count, isOpen, setIsOpen, isCheckoutOpen, setIsCheckoutOpen }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
