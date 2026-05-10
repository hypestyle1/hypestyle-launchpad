'use client';

import { useMemo } from 'react';
import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";

const BACK_SLUGS = [
  "lettering-pink-jort", "jort-cargo-realtree-beige", "jort-cargo-realtree-pink",
  "aerogrey-tees", "trucker-cap-11-x-art-by-randal",
  "waffle-crest-sleeveless-pearl-grey", "jersey-fileteado-x-alfredo-genovese",
  "camo-cap", "mesh-realtree-pink-tee", "per-aspera-ad-astra-zippo",
  "no-service-for-the-faithless-tees", "regular-tees-3-pack-black-white-melange",
];

export default function BackInStock() {
  const { data: allProducts = [] } = useProducts(100);
  const products = useMemo(
    () => allProducts.filter(p => BACK_SLUGS.includes(p.slug)),
    [allProducts]
  );
  const ref = useReveal();

  return (
    <section id="back-in-stock" className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
      <div className="reveal rd1">
        <SectionHeader title="Best Sellers" link="/back-in-stock/" linkLabel="Ver más" />
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
