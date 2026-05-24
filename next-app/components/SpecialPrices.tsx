'use client';

import { useMemo } from "react";
import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";

export default function SpecialPrices() {
  const { data: allProducts = [] } = useProducts(8, undefined, 'special-price');
  const products = useMemo(() =>
    allProducts.map(p => ({
      ...p,
      badge: p.originalPrice && p.originalPrice > p.price
        ? `−${Math.round((1 - p.price / p.originalPrice!) * 100)}%`
        : undefined,
    })),
    [allProducts]
  );

  const ref = useReveal([products]);

  return (
    <section id="special-prices" className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
      <div className="reveal rd1">
        <SectionHeader title="SPECIAL PRICES" link="/special-prices/" linkLabel="Ver más" />
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
