'use client';

import { useMemo } from "react";
import ProductCard from "./ProductCard";
import EditorialSlider from "./EditorialSlider";
import { useProducts } from "@/hooks/useProducts";
import { FAITH_DROP_ITEMS, FAITH_DROP_MEDIA } from "@/lib/faith-drop";

// Placeholder mientras el drop no esta cargado en WP — mismo layout que va a
// tener con los productos reales (grilla de Best Sellers: 4 col desktop x 3 filas = 12).
const PLACEHOLDERS = Array.from({ length: 12 }, (_, i) => ({
  name: `Producto ${i + 1}`,
  category: "Próximamente",
  price: 0,
  image: "",
  badge: "New In",
}));

export default function FaithDrop() {
  const { data: allProducts = [] } = useProducts(0);

  const products = useMemo(() => {
    const bySlug = new Map(allProducts.map(p => [p.slug, p]));
    return FAITH_DROP_ITEMS.flatMap(cfg => {
      const p = bySlug.get(cfg.slug);
      if (!p) return [];
      return [{
        ...p,
        badge: cfg.live ? "New In" : "Próximamente",
        blurred: cfg.blurred,
        // Vidriera hasta el lanzamiento: sin link al producto ni talles/carrito.
        disableLink: !cfg.live,
        sizes: cfg.live ? p.sizes : undefined,
        stock: cfg.live ? p.stock : undefined,
      }];
    });
  }, [allProducts]);

  // Mientras no haya productos reales cargados, mostramos la grilla con placeholders
  // para poder previsualizar el layout del drop antes de subir los productos.
  const items = products.length > 0 ? products : PLACEHOLDERS;

  return (
    <div className="mt-10">
      {/* eyebrow — mismo estilo que "Benefit Drop" */}
      <div className="flex items-center gap-4 mb-5">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">
          Faith Is The Real Hype
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
        {items.map((p, i) => (
          <ProductCard key={i} {...p} />
        ))}
      </div>

      {/* Contenido de la comunidad, debajo de la grilla.
          Desktop: 2 carruseles lado a lado (misma logica que "Camo Drop" —
          EditorialSlider con crossfade + dots — repartida en 2 columnas).
          Mobile: se juntan todas las slides en un solo carrusel, como antes. */}
      <div className="mt-[2px]">
        <div className="hidden lg:grid grid-cols-2 gap-[2px]">
          {[
            FAITH_DROP_MEDIA.slice(0, Math.ceil(FAITH_DROP_MEDIA.length / 2)),
            FAITH_DROP_MEDIA.slice(Math.ceil(FAITH_DROP_MEDIA.length / 2)),
          ].map((slides, i) => (
            <div key={i} className="relative overflow-hidden rounded-[8px] bg-bg-alt aspect-[4/5]">
              {slides.length > 0 ? (
                <EditorialSlider slides={slides} alt="Faith Is The Real Hype" />
              ) : (
                <MediaPlaceholder />
              )}
            </div>
          ))}
        </div>

        <div className="lg:hidden relative overflow-hidden rounded-[8px] bg-bg-alt aspect-[4/5]">
          {FAITH_DROP_MEDIA.length > 0 ? (
            <EditorialSlider slides={FAITH_DROP_MEDIA} alt="Faith Is The Real Hype" />
          ) : (
            <MediaPlaceholder />
          )}
        </div>
      </div>
    </div>
  );
}

function MediaPlaceholder() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        Contenido próximamente
      </span>
    </div>
  );
}
