'use client';

import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { useReveal } from "@/hooks/useReveal";
import { PRODUCTS } from "@/data/products";

const SLUGS = [
  'zip-hoodie-pink',
  'sweatpant-pink',
  'lettering-pink-jort',
  'aeropink-tees',
  'forpain-sleveless-pink',
  'mesh-realtree-pink-tee',
  'jort-cargo-realtree-pink',
];

export default function PinkSetDropPage() {
  const products = PRODUCTS.filter(p => SLUGS.includes(p.slug));
  const ref = useReveal([products]);

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">

        <section className="py-20 px-6 text-center" style={{ background: "linear-gradient(135deg, #f9a8d4 0%, #fbcfe8 50%, #fce7f3 100%)" }}>
          <p className="text-[11px] uppercase tracking-[0.18em] text-pink-700/60 mb-3">Colección</p>
          <h1 className="text-[36px] md:text-[52px] font-bold uppercase leading-none mb-3 text-pink-900">Pink Set Drop</h1>
          <p className="text-[14px] text-pink-700/70">Drop limitado — Todo en rosa</p>
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

      </main>
      <Footer />
    </>
  );
}
