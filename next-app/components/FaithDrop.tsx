'use client';

import { useMemo } from "react";
import ProductCard from "./ProductCard";
import { useProducts } from "@/hooks/useProducts";
import { FAITH_DROP_SLUGS } from "@/lib/faith-drop";

// Placeholder mientras el drop no esta cargado en WP — mismo layout que va a
// tener con los productos reales (grilla de Best Sellers: 4 col desktop x 3 filas = 12).
const PLACEHOLDERS = Array.from({ length: 12 }, (_, i) => ({
  name: `Producto ${i + 1}`,
  category: "Próximamente",
  price: 0,
  image: "",
  badge: "UGC",
}));

export default function FaithDrop() {
  const { data: allProducts = [] } = useProducts(0);

  const products = useMemo(() => {
    const bySlug = new Map(allProducts.map(p => [p.slug, p]));
    return FAITH_DROP_SLUGS.map(s => bySlug.get(s)).filter(Boolean) as typeof allProducts;
  }, [allProducts]);

  // Mientras no haya slugs reales cargados, mostramos la grilla con placeholders
  // para poder previsualizar el layout del drop antes de subir los productos.
  const items = products.length > 0 ? products.map(p => ({ ...p, badge: "UGC" })) : PLACEHOLDERS;

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
          <ProductCard key={('slug' in p && p.slug) || i} {...p} />
        ))}
      </div>
    </div>
  );
}
