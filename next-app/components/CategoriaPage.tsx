'use client';

import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import CatalogHeader from '@/components/collection/CatalogHeader';
import { useReveal } from '@/hooks/useReveal';
import { useProducts } from '@/hooks/useProducts';
import { CATEGORY_MAP } from '@/lib/category-config';

type SortKey = 'default' | 'price-asc' | 'price-desc';

/**
 * Plantilla de las páginas de categoría (rediseño 2026): cabecera editorial
 * compacta en lugar de la banda oscura de ~260px (los productos entran en la
 * primera pantalla), tabs como riel sticky con la gramática del índice de
 * colección, grilla con aire del sistema y orden por defecto "más nuevos
 * primero" (antes "Relevancia" era la fecha ascendente de la API: lo más
 * viejo primero).
 */
export default function CategoriaPage() {
  const pathname = usePathname();
  const normalizedPath = pathname.replace(/\/$/, '');
  const config = CATEGORY_MAP[normalizedPath] ?? CATEGORY_MAP['/productos'];
  const [activeTab, setActiveTab] = useState(0);
  const [sort, setSort] = useState<SortKey>('default');
  const [sizeFilter, setSizeFilter] = useState<string[]>([]);

  const { data: allProducts = [], isLoading } = useProducts(0);
  const ref = useReveal([allProducts]);

  const baseProducts = useMemo(() => {
    let base = config.categories.length === 0
      ? allProducts
      : allProducts.filter(p => config.categories.includes(p.category));
    if (config.tag) base = base.filter(p => p.tags.includes(config.tag!));
    if (!config.tabs || activeTab === 0 || config.tabs[activeTab].categories.length === 0) return base;
    return base.filter(p => config.tabs![activeTab].categories.includes(p.category));
  }, [allProducts, config, activeTab]);

  const availableSizes = useMemo(() => {
    const set = new Set<string>();
    baseProducts.forEach(p => p.sizes.forEach(s => set.add(s)));
    return ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'U'].filter(s => set.has(s));
  }, [baseProducts]);

  const products = useMemo(() => {
    let result = [...baseProducts];
    if (sizeFilter.length > 0) result = result.filter(p => sizeFilter.some(s => p.sizes.includes(s) && p.stock[s] !== 'out'));
    if (sort === 'price-asc') result.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') result.sort((a, b) => b.price - a.price);
    // Por defecto, lo más nuevo primero: /api/products ordena por fecha
    // ascendente, así que el orden natural era "lo más viejo primero".
    else result.reverse();
    return result;
  }, [baseProducts, sizeFilter, sort]);

  const toggleSize = (s: string) =>
    setSizeFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)] bg-white">
        <CatalogHeader
          kicker="Shop"
          title={config.title}
          count={isLoading ? undefined : baseProducts.length}
          description={config.subtitle}
        />

        {config.tabs && config.tabs.length > 1 && (
          /* Las tabs como riel del sistema sticky: mismo material glass y
             misma gramática ( / entre items, activo negro) que el índice de
             colección — pero por estado, no por ancla. */
          <div className="hs-collection-index sticky top-[var(--offset)] z-20 px-4 md:px-6 py-2.5 md:py-3 mb-1 flex items-center">
            <nav aria-label={`Categorías de ${config.title}`} className="flex items-baseline gap-x-1.5 md:gap-x-2 overflow-x-auto no-scrollbar whitespace-nowrap text-[14px] md:text-[20px] font-medium tracking-[-0.03em] leading-none pb-[0.2em] -mb-[0.2em]">
              {config.tabs.map((tab, i) => (
                <span key={tab.label} className="flex items-baseline gap-x-1.5 md:gap-x-2">
                  {i > 0 && <span aria-hidden className="text-foreground/25">/</span>}
                  <button onClick={() => setActiveTab(i)} aria-pressed={activeTab === i}
                    className={`transition-colors ${activeTab === i ? 'text-foreground' : 'text-foreground/45 hover:text-foreground/70'}`}>
                    {tab.label}
                  </button>
                </span>
              ))}
            </nav>
          </div>
        )}

        <div className="bg-background">
          <div className="px-4 md:px-6 py-3 flex flex-wrap items-center gap-3">
            {availableSizes.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {availableSizes.map(s => (
                  <button key={s} onClick={() => toggleSize(s)}
                    className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-wide border transition-colors rounded-[6px] ${sizeFilter.includes(s) ? 'bg-foreground text-background border-foreground' : 'border-border text-foreground/60 hover:border-foreground/40 hover:text-foreground'}`}>
                    {s}
                  </button>
                ))}
                {sizeFilter.length > 0 && (
                  <button onClick={() => setSizeFilter([])}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors ml-1 underline">
                    Limpiar
                  </button>
                )}
              </div>
            )}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground hidden sm:block">Ordenar:</span>
              <select value={sort} onChange={e => setSort(e.target.value as SortKey)}
                className="text-[11px] border border-border rounded-[6px] px-2.5 py-1.5 bg-background text-foreground cursor-pointer outline-none hover:border-foreground/40 transition-colors">
                <option value="default">Más nuevos</option>
                <option value="price-asc">Precio: menor a mayor</option>
                <option value="price-desc">Precio: mayor a menor</option>
              </select>
            </div>
          </div>
        </div>

        <section className="px-4 md:px-6 pt-3 pb-10 md:pb-14" ref={ref}>
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <p className="text-center text-muted-foreground py-20">No hay productos en esta categoría todavía.</p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-2 md:gap-x-3 gap-y-7 lg:gap-y-9">
              {products.map((p, i) => (
                <div key={p.slug} className={`reveal rd${Math.min(i + 1, 8)}`}>
                  <ProductCard id={p.slug} name={p.name} category={p.category} price={p.price}
                    originalPrice={p.originalPrice} badge={p.badge} image={p.image} images={p.images}
                    sizes={p.sizes} stock={p.stock} href={p.href} customizable={p.customizable} tags={p.tags} />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
