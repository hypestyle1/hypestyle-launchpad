'use client';

import { useMemo } from "react";
import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";
import { REGULAR_TEES_SLUGS } from "@/lib/regular-tees";

export default function BasicosSection() {
  const { data: allProducts = [] } = useProducts(100);
  const ref = useReveal([allProducts]);

  const products = useMemo(() => {
    const bySlug = new Map(allProducts.map(p => [p.slug, p]));
    return REGULAR_TEES_SLUGS.map(s => bySlug.get(s)).filter(Boolean) as typeof allProducts;
  }, [allProducts]);

  if (products.length === 0) return null;

  return (
    <section id="basicos" className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
      <div className="reveal rd1">
        <SectionHeader title="Básicos" link="/colecciones/regular-tees/" linkLabel="Ver más" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
        {products.map((p, i) => (
          <div key={p.slug} className={`reveal rd${Math.min(i + 2, 8)}`}>
            <ProductCard
              id={p.slug}
              name={p.name}
              category={p.category}
              price={p.price}
              originalPrice={p.originalPrice}
              badge={p.originalPrice ? `−${Math.round((1 - p.price / p.originalPrice) * 100)}%` : undefined}
              image={p.images[0]}
              images={p.images}
              sizes={p.sizes}
              stock={p.stock}
              href={`/producto/${p.slug}/`}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
