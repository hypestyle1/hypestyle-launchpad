'use client';

import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";

export default function BackInStockPage() {
  const { data: products = [], isLoading } = useProducts(100, undefined, 'best-seller');
  const ref = useReveal([products]);

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">

        <section className="bg-bg-dark text-primary-foreground py-20 px-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/40 mb-3">Shop</p>
          <h1 className="text-[36px] md:text-[52px] font-bold uppercase leading-none mb-3">Best Sellers</h1>
          <p className="text-[14px] text-primary-foreground/40">Los clásicos que volvieron — por tiempo limitado</p>
        </section>

        <section className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <p className="text-[12px] text-muted-foreground mb-6">{products.length} productos</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
                {products.map((p, i) => (
                  <div key={p.slug} className={`reveal rd${Math.min(i + 1, 8)}`}>
                    <ProductCard {...p} />
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

      </main>
      <Footer />
    </>
  );
}
