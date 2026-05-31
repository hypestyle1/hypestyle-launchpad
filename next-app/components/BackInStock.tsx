'use client';

import { useMemo } from "react";
import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";

const BEST_SELLERS_SLUGS = [
  'per-aspera-ad-astra-zippo',
  'jersey-fileteado-x-alfredo-genovese',
  'no-service-for-the-faithless-hoodie',
  'lettering-melange-jort',
  'no-service-for-the-faithless-white',
  'no-service-for-the-faithless-black',
  'no-service-for-the-faithless-grey',
  'no-service-for-the-faithless-green',
  'baby-come-back-tees',
  'baby-come-back-black',
  'trucker-cap-baby-come-back',
  'race-tee',
  'mesh-realtree-pink-tee',
  'mesh-realtree-tee',
  'lettering-graphite-hoodie',
  'lettering-graphite-jort',
  'jort-cargo-realtree-pink',
  'jort-cargo-realtree-beige',
  'fleece-jacket-v1-negrogris',
  'hoodie-shield-olive',
  'sweatpants-bombe-bordo',
  'knitted-tshirt-sand',
  'sleeveless-ranglan-white',
  'sleeveless-ranglan-militar-green',
  'sleeveless-ranglan-grey',
  'sleeveless-ranglan-black',
  'raglan-tee-tribal-cross',
  'hypestation-white-tee',
  'hypestation-black-tee',
  'honda-white-tee',
  'honda-black-tee',
  'skyline-tee',
  'aerogrey-tees',
  'mesh-camo-blue-tee',
  'mesh-camo-grey-tee',
  'lettering-pink-jort',
  'hoodie-stay-hustle',
  'no-love-only-style-tops',
];

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
