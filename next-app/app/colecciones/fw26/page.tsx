'use client';

import { useMemo } from 'react';
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";

const SLUGS = [
  // Half Zip Polo
  'half-zip-polo-grey',
  'half-zip-polo-navy',
  'half-zip-polo-black',
  // OGCJM
  'ogcjm-blanca',
  'ogcjm-negra',
  // Melange set
  'hoodie-melange',
  'sweatpant-melange',
  // Pink Set Drop
  'zip-hoodie-pink',
  'sweatpant-pink',
  // Camo Drop
  'zip-hoodie-camo',
  'sweatpant-camo',
  'camo-full-set-combo',
  'camo-cap',
  // HStars
  'hoodie-grey-hstars',
  'sweatpant-grey-hstars',
];

export default function FW26Page() {
  const { data: allProducts = [] } = useProducts(100);
  const products = useMemo(
    () => allProducts.filter(p => SLUGS.includes(p.slug)),
    [allProducts]
  );
  const ref = useReveal([products]);

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">

        <section className="bg-bg-dark text-primary-foreground py-20 px-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/40 mb-3">Colección</p>
          <h1 className="text-[36px] md:text-[52px] font-bold uppercase leading-none mb-3">FW26</h1>
          <p className="text-[14px] text-primary-foreground/40">Fall / Winter 2026 — Incluyendo Pink Set Drop</p>
        </section>

        <section className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
          <p className="text-[12px] text-muted-foreground mb-6">{products.length} productos</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
            {products.map((p, i) => (
              <div key={p.slug} className={`reveal rd${Math.min(i + 1, 8)}`}>
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

      </main>
      <Footer />
    </>
  );
}
