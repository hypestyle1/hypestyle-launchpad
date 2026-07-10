'use client';

import { useMemo } from "react";
import Image from "next/image";
import ProductCard from "./ProductCard";
import EditorialSlider from "./EditorialSlider";
import { useProducts } from "@/hooks/useProducts";
import { FAITH_DROP_SLUGS, FAITH_DROP_MEDIA } from "@/lib/faith-drop";

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
    return FAITH_DROP_SLUGS.map(s => bySlug.get(s)).filter(Boolean) as typeof allProducts;
  }, [allProducts]);

  // Mientras no haya slugs reales cargados, mostramos la grilla con placeholders
  // para poder previsualizar el layout del drop antes de subir los productos.
  const items = products.length > 0 ? products.map(p => ({ ...p, badge: "New In" })) : PLACEHOLDERS;

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

      {/* Imagen / carrusel de contenido de la comunidad, debajo de la grilla */}
      <div className="mt-[2px] relative overflow-hidden rounded-[8px] bg-bg-alt aspect-[16/9] lg:aspect-[21/9]">
        {FAITH_DROP_MEDIA?.type === 'video' ? (
          <video
            className="absolute inset-0 h-full w-full object-cover object-center"
            src={FAITH_DROP_MEDIA.src}
            poster={FAITH_DROP_MEDIA.poster}
            autoPlay loop muted playsInline preload="metadata"
          />
        ) : FAITH_DROP_MEDIA?.type === 'slider' ? (
          <EditorialSlider slides={FAITH_DROP_MEDIA.slides} images={FAITH_DROP_MEDIA.images} alt={FAITH_DROP_MEDIA.alt} />
        ) : FAITH_DROP_MEDIA?.type === 'image' ? (
          <Image src={FAITH_DROP_MEDIA.src} alt={FAITH_DROP_MEDIA.alt} fill sizes="100vw" className="object-cover object-center" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Contenido próximamente
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
