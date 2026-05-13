'use client';

import { useMemo } from "react";
import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";

const ORDER = [
  'only-god-can-judge-me-blanca',
  'only-god-can-judge-me-negra',
  'camo-full-set-combo',
  'hoodie-grey-hstars',
  'half-zip-polo-navy',
  'half-zip-polo-melange',
  'half-zip-polo-black',
  'zip-hoodie-pink',
];

export default function BestSellers() {
  const { data: allProducts = [] } = useProducts(100);
  const products = useMemo(
    () => ORDER.map(slug => allProducts.find(p => p.slug === slug)).filter(Boolean) as typeof allProducts,
    [allProducts]
  );
  const ref = useReveal([products]);

  return (
    <section id="best-sellers" className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
      <div className="reveal rd1">
        <SectionHeader title="New In" link="/new-in/" linkLabel="Ver más" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
        {products.map((p, i) => (
          <div key={p.id} className={`reveal rd${Math.min(i + 2, 8)}`}>
            <ProductCard
              id={p.id}
              name={p.name}
              category={p.category}
              price={p.price}
              originalPrice={p.originalPrice}
              badge={p.badge}
              image={p.image}
              images={p.images}
              sizes={p.sizes}
              stock={p.stock}
              href={p.href}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
