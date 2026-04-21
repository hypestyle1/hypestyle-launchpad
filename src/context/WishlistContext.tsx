import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface WishlistContextType {
  items: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}

const WishlistContext = createContext<WishlistContextType | null>(null);
const KEY = "hy_wishlist";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(items)); }, [items]);

  const toggle = (id: string) =>
    setItems((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const has = (id: string) => items.includes(id);

  return (
    <WishlistContext.Provider value={{ items, toggle, has, drawerOpen, setDrawerOpen }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
