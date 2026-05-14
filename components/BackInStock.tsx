'use client';

import { useMemo } from "react";
import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";

const PINNED_ORDER = [
  'per-aspera-ad-astra-zippo',
  'mesh-realtree-pink-tee',
  'no-service-for-the-faithless-hoodie',
  'lettering-melange-jort',
  'jersey-fileteado-x-alfredo-genovese',
  'race-tee',
  'trucker-cap-baby-come-back',
  'mesh-realtree-tee',
  'lettering-graphite-hoodie',
  'lettering-graphite-jort',
];

export default function BackInStock() {
  const { data: raw = [] } = useProducts(100, undefined, 'best-seller');
  const ref = useReveal([raw]);

  const products = useMemo(() => {
    const bySlug = new Map(raw.map(p => [p.slug, p]));
    const pinned = PINNED_ORDER.map(s => bySlug.get(s)).filter(Boolean) as typeof raw;
    const pinnedSet = new Set(PINNED_ORDER);
    const rest = raw.filter(p => !pinnedSet.has(p.slug));
    return [...pinned, ...rest].slice(0, 20);
  }, [raw]);

  return (
    <section id="back-in-stock" className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
      <div className="reveal rd1">
        <SectionHeader title="Best Sellers" link="/best-sellers/" linkLabel="Ver más" />
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
