'use client';

import { useMemo } from 'react';
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";
import { FW26_GROUPS as GROUPS, FW26_SLUGS as ALL_SLUGS } from "@/lib/fw26";

export default function FW26Page() {
  const { data: allProducts = [] } = useProducts(0);
  const bySlug = useMemo(() => {
    const map: Record<string, (typeof allProducts)[0]> = {};
    allProducts.forEach(p => { map[p.slug] = p; });
    return map;
  }, [allProducts]);

  const total = useMemo(() => ALL_SLUGS.filter(s => bySlug[s]).length, [bySlug]);
  const ref = useReveal([bySlug]);

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">

        <section className="relative bg-bg-dark text-primary-foreground py-20 px-6 text-center overflow-hidden">
          <img src="/fw26-camo-editorial.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative z-10">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/40 mb-3">Colección</p>
            <h1 className="text-[36px] md:text-[52px] font-bold uppercase leading-none mb-3 text-white">FW26</h1>
            <p className="text-[14px] text-white/40">Fall / Winter 2026</p>
          </div>
        </section>

        <div className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
          <p className="text-[12px] text-muted-foreground mb-10">{total} productos</p>

          {GROUPS.map(group => {
            const items = group.slugs.map(s => bySlug[s]).filter(Boolean);
            if (items.length === 0) return null;
            return (
              <div key={group.label} className="mb-14">
                <div className="flex items-center gap-4 mb-5">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">
                    {group.label}
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
                  {items.map((p, i) => (
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
              </div>
            );
          })}
        </div>

      </main>
      <Footer />
    </>
  );
}
