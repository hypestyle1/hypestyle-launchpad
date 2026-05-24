'use client';

import { useMemo } from 'react';
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";

interface Group { label: string; slugs: string[] }

export interface CollectionConfig {
  title: string;
  subtitle: string;
  headerBg?: string;
  headerImage?: string;
  dark?: boolean;
  groups: Group[];
}

export default function CollectionGroupedPage({ config }: { config: CollectionConfig }) {
  const allSlugs = config.groups.flatMap(g => g.slugs);
  const { data: allProducts = [] } = useProducts(100);

  const bySlug = useMemo(() => {
    const map: Record<string, (typeof allProducts)[0]> = {};
    allProducts.forEach(p => { map[p.slug] = p; });
    return map;
  }, [allProducts]);

  const total = useMemo(() => allSlugs.filter(s => bySlug[s]).length, [bySlug]);
  const ref = useReveal([bySlug]);

  const isDark = config.dark !== false;

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">

        <section
          className={`relative py-20 px-6 text-center overflow-hidden ${isDark ? 'bg-bg-dark text-primary-foreground' : ''}`}
          style={config.headerBg ? { background: config.headerBg } : undefined}
        >
          {config.headerImage && (
            <>
              <img
                src={config.headerImage}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/55" />
            </>
          )}
          <div className="relative z-10">
            <p className={`text-[11px] uppercase tracking-[0.18em] mb-3 ${isDark || config.headerImage ? 'text-white/40' : 'text-black/40'}`}>
              Colección
            </p>
            <h1 className={`text-[36px] md:text-[52px] font-bold uppercase leading-none mb-3 ${isDark || config.headerImage ? 'text-white' : 'text-black'}`}>
              {config.title}
            </h1>
            <p className={`text-[14px] ${isDark || config.headerImage ? 'text-white/40' : 'text-black/50'}`}>
              {config.subtitle}
            </p>
          </div>
        </section>

        <div className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
          <p className="text-[12px] text-muted-foreground mb-10">{total} productos</p>

          {config.groups.map(group => {
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
