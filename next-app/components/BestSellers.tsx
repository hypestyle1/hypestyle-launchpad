'use client';

import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";

const HIDDEN_SLUGS = [
  'la-nuestra-jersey-mundial-26',
  'camo-full-set-combo',
];

export default function BestSellers() {
  const { data: raw = [] } = useProducts(16);
  const products = raw.filter(p => !HIDDEN_SLUGS.includes(p.slug)).slice(0, 8);
  const ref = useReveal([products]);

  return (
    <section id="best-sellers" className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
      <div className="reveal rd1">
        <SectionHeader title="New In" link="/best-sellers/" linkLabel="Ver más" />
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
              badge={p.originalPrice ? `−${Math.round((1 - p.price / p.originalPrice) * 100)}%` : undefined}
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
