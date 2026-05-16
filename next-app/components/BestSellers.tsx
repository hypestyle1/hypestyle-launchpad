'use client';

import { useMemo } from "react";
import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";
import type { NormalizedProduct } from "@/hooks/useProducts";

const HIDDEN_SLUGS: string[] = [];

const HOTSALE_PRIORITY = [
  'half-zip-polo-grey',
  'half-zip-polo-navy',
  'half-zip-polo-black',
  'ogcjm-blanca',
  'ogcjm-negra',
];

function sortHotSale(list: NormalizedProduct[]): NormalizedProduct[] {
  const visible = list.filter(p => !HIDDEN_SLUGS.includes(p.slug));
  const priority = HOTSALE_PRIORITY.map(slug => visible.find(p => p.slug === slug)).filter(Boolean) as NormalizedProduct[];
  const rest = visible.filter(p => !HOTSALE_PRIORITY.includes(p.slug));
  const restSorted = [...rest.filter(p => p.originalPrice), ...rest.filter(p => !p.originalPrice)];
  return [...priority, ...restSorted].slice(0, 8);
}

export default function BestSellers() {
  const { data: raw = [] } = useProducts(24);
  const products = useMemo(() => sortHotSale(raw), [raw]);
  const ref = useReveal([products]);

  return (
    <section id="best-sellers" className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
      <div className="reveal rd1">
        <SectionHeader title="Hot Week" link="/productos/" linkLabel="Ver todo">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border border-border px-2.5 py-1 leading-none">
            Termina el 17 de Mayo
          </span>
        </SectionHeader>
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
