'use client';

import { useMemo } from "react";
import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";
import { BEST_SELLERS_SLUGS } from "@/lib/best-sellers";

export default function BackInStock() {
  const { data: allProducts = [] } = useProducts(0);
  const ref = useReveal([allProducts]);

  const products = useMemo(() => {
    const bySlug = new Map(allProducts.map(p => [p.slug, p]));
    return BEST_SELLERS_SLUGS.map(s => bySlug.get(s)).filter(Boolean) as typeof allProducts;
  }, [allProducts]);

  return (
    <section id="back-in-stock" className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
      <div className="reveal rd1">
        <SectionHeader title="Sale — Best Sellers" link="/best-sellers/" linkLabel="Ver más" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
        {products.map((p, i) => (
          <div key={p.slug} className={`reveal rd${Math.min(i + 2, 8)}`}>
            <ProductCard {...p} />
          </div>
        ))}
      </div>
    </section>
  );
}
