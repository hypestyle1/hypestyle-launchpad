'use client';

import { useMemo } from 'react';
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import CatalogHeader from "@/components/collection/CatalogHeader";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";

interface Group { label: string; slugs: string[] }

export interface CollectionConfig {
  title: string;
  subtitle: string;
  /** Quedan en el tipo por compatibilidad con las pages que los pasan, pero
      las cápsulas ya no llevan foto ni gradiente de cabecera (decisión 12/10:
      el stock residual no se presenta como gran colección comercial). */
  headerBg?: string;
  headerImage?: string;
  dark?: boolean;
  groups: Group[];
}

/**
 * Plantilla de las cápsulas y colecciones agrupadas (rediseño 2026): cabecera
 * editorial compacta, subtítulos de grupo del sistema y grilla con aire.
 */
export default function CollectionGroupedPage({ config }: { config: CollectionConfig }) {
  const allSlugs = config.groups.flatMap(g => g.slugs);
  const { data: allProducts = [] } = useProducts(0);

  const bySlug = useMemo(() => {
    const map: Record<string, (typeof allProducts)[0]> = {};
    allProducts.forEach(p => { map[p.slug] = p; });
    return map;
  }, [allProducts]);

  const total = useMemo(() => allSlugs.filter(s => bySlug[s]).length, [bySlug]);
  const ref = useReveal([bySlug]);

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)] bg-white">
        <section className="px-4 md:px-6 pt-2 pb-10 md:pb-14" ref={ref}>
          <CatalogHeader kicker="Colección" title={config.title} count={total} description={config.subtitle} />
          {config.groups.map(group => {
            const items = group.slugs.map(s => bySlug[s]).filter(Boolean);
            if (items.length === 0) return null;
            return (
              <div key={group.label} className="mb-12 md:mb-16 last:mb-0">
                {config.groups.length > 1 && (
                  <div className="flex items-baseline gap-2 mb-4 md:mb-5">
                    <h2 className="text-[20px] md:text-[26px] font-semibold tracking-[-0.03em] leading-none">{group.label}</h2>
                    <span className="text-[12px] md:text-[13px] text-muted-foreground tabular-nums">{items.length}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-2 md:gap-x-3 gap-y-7 lg:gap-y-9">
                  {items.map(p => (
                    <ProductCard
                      key={p.slug}
                      id={p.slug}
                      tags={p.tags}
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
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      </main>
      <Footer />
    </>
  );
}
