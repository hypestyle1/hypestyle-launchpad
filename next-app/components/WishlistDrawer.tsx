'use client';

import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { useLocale } from "@/context/LocaleContext";
import { PRODUCTS } from "@/data/products";
import { useState } from "react";

export default function WishlistDrawer() {
  const { items, toggle, drawerOpen, setDrawerOpen } = useWishlist();
  const { add, setDrawerOpen: openCart } = useCart();
  const { formatPrice } = useLocale();
  const [addedId, setAddedId] = useState<string | null>(null);

  if (!drawerOpen) return null;

  const products = items
    .map((slug) => PRODUCTS.find((p) => p.slug === slug))
    .filter(Boolean) as (typeof PRODUCTS[0])[];

  const handleAddToCart = (p: typeof PRODUCTS[0], size: string) => {
    add({ id: p.slug, name: p.name, price: p.price, image: p.images[0], size, quantity: 1 });
    setAddedId(p.slug);
    setTimeout(() => setAddedId(null), 1500);
    openCart(true);
    setDrawerOpen(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-[150] bg-black/40" onClick={() => setDrawerOpen(false)} />

      <div className="fixed right-0 top-0 bottom-0 z-[160] w-full max-w-[420px] bg-white flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <span className="text-[13px] font-semibold uppercase tracking-wider">
            Favoritos ({items.length})
          </span>
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-8 h-8 flex items-center justify-center text-foreground/40 hover:text-foreground transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-foreground/20">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <p className="text-[13px] text-muted-foreground">Todavía no guardaste nada</p>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-[12px] underline text-foreground/50 hover:text-foreground transition-colors"
              >
                Explorar productos
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {products.map((p) => {
                const availableSizes = p.sizes.filter((s) => p.stock[s] !== "out");
                return (
                  <div key={p.slug} className="flex gap-4">
                    <a href={`/producto/${p.slug}/`} className="w-20 h-24 bg-bg-alt flex-shrink-0 overflow-hidden rounded-[5px] block">
                      <img src={`/${p.images[0]}`} alt={p.name} className="w-full h-full object-cover" />
                    </a>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{p.category}</p>
                          <a href={`/producto/${p.slug}/`} className="text-[13px] font-medium leading-tight hover:underline block">{p.name}</a>
                          <p className="text-[13px] font-semibold mt-0.5">{formatPrice(p.price)}</p>
                        </div>
                        <button
                          onClick={() => toggle(p.slug)}
                          className="text-foreground/30 hover:text-foreground transition-colors flex-shrink-0 mt-0.5"
                          aria-label="Quitar de favoritos"
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M1 1l12 12M13 1L1 13" />
                          </svg>
                        </button>
                      </div>

                      {/* Quick add sizes */}
                      {availableSizes.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {availableSizes.map((s) => (
                            <button
                              key={s}
                              onClick={() => handleAddToCart(p, s)}
                              className="px-2.5 py-1 text-[10px] font-semibold uppercase border border-border hover:border-foreground hover:bg-foreground hover:text-background transition-colors rounded-[5px]"
                            >
                              {addedId === p.slug ? "✓" : s}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-destructive mt-2">Sin stock</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {products.length > 0 && (
          <div className="px-6 py-4 border-t border-border">
            <a
              href="/productos/"
              onClick={() => setDrawerOpen(false)}
              className="block w-full text-center py-3 text-[12px] font-bold uppercase tracking-[0.1em] border border-foreground hover:bg-foreground hover:text-background transition-colors rounded-[10px]"
            >
              Seguir explorando
            </a>
          </div>
        )}
      </div>
    </>
  );
}
