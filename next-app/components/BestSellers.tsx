'use client';

import { useMemo } from 'react';
import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";

const BEST_SELLERS_SLUGS = [
  // — orden original hasta Lettering Graphite Jort —
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
  // — nuevos —
  'fleece-jacket-v1-negrogris',
  'jort-cargo-realtree-beige',
  'jort-cargo-realtree-pink',
  'hoodie-shield-olive',
  'sweatpants-bombe-bordo',
  'sleeveless-ranglan',
  'knitted-tshirt-sand',
  'raglan-tee-tribal-cross',
  'hypestation-white-tee',
  'hypestation-black-tee',
  'honda-white-tee',
  'honda-black-tee',
  'skyline-tee',
  'aerogrey-tees',
];

export default function BestSellers() {
  const { data: allProducts = [] } = useProducts(0);
  const ref = useReveal([allProducts]);

  const products = useMemo(() => {
    const bySlug: Record<string, (typeof allProducts)[0]> = {};
    allProducts.forEach(p => { bySlug[p.slug] = p; });
    return BEST_SELLERS_SLUGS.map(s => bySlug[s]).filter(Boolean);
  }, [allProducts]);

  return (
    <section id="best-sellers" className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
      <div className="reveal rd1">
        <SectionHeader title="Best Sellers" link="/productos/" linkLabel="Ver todo" />
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
