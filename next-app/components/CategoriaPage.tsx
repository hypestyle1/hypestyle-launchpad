'use client';

import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { useReveal } from '@/hooks/useReveal';
import { useProducts } from '@/hooks/useProducts';

interface SubTab { label: string; categories: string[] }
interface CategoryConfig { title: string; subtitle: string; categories: string[]; tabs?: SubTab[] }

const CATEGORY_MAP: Record<string, CategoryConfig> = {
  '/arriba': {
    title: 'Arriba', subtitle: 'Hoodies, remeras, longsleeves y más',
    categories: ['Hoodie', 'Crewneck', 'Tee', 'Top', 'Sleeveless', 'Longsleeve', 'Jersey'],
    tabs: [
      { label: 'Todo', categories: [] }, { label: 'Hoodies', categories: ['Hoodie', 'Crewneck'] },
      { label: 'Remeras', categories: ['Tee'] }, { label: 'Longsleeves', categories: ['Longsleeve'] },
      { label: 'Sleeveless', categories: ['Sleeveless', 'Top'] }, { label: 'Jersey', categories: ['Jersey'] },
    ],
  },
  '/abajo': {
    title: 'Abajo', subtitle: 'Pantalones y jorts',
    categories: ['Pantalón', 'Jort'],
    tabs: [{ label: 'Todo', categories: [] }, { label: 'Pantalones', categories: ['Pantalón'] }, { label: 'Jorts', categories: ['Jort'] }],
  },
  '/accesorios': { title: 'Accesorios', subtitle: 'Gorras, anillos, beanies y más', categories: ['Accesorio'] },
  '/sets': {
    title: 'Sets & Packs', subtitle: 'Combos y packs de edición limitada',
    categories: ['Set', 'Pack'],
    tabs: [{ label: 'Todo', categories: [] }, { label: 'Sets', categories: ['Set'] }, { label: 'Packs', categories: ['Pack'] }],
  },
  '/productos': { title: 'Todos los productos', subtitle: 'Drops limitados · Envíos a todo el mundo', categories: [] },
  '/tees':    { title: 'Tees',    subtitle: 'Remeras y tops', categories: ['Tee', 'Top'] },
  '/hoodies': { title: 'Hoodies', subtitle: 'Hoodies y crewnecks', categories: ['Hoodie', 'Crewneck'] },
  '/pants':   { title: 'Pants',   subtitle: 'Pantalones y joggers', categories: ['Pantalón'] },
  '/jorts':   { title: 'Jorts',   subtitle: 'Jorts y shorts', categories: ['Jort'] },
};

type SortKey = 'default' | 'price-asc' | 'price-desc';

export default function CategoriaPage() {
  const pathname = usePathname();
  const normalizedPath = pathname.replace(/\/$/, '');
  const config = CATEGORY_MAP[normalizedPath] ?? CATEGORY_MAP['/productos'];
  const [activeTab, setActiveTab] = useState(0);
  const [sort, setSort] = useState<SortKey>('default');
  const [sizeFilter, setSizeFilter] = useState<string[]>([]);

  const { data: allProducts = [] } = useProducts(100);
  const ref = useReveal([allProducts]);

  const baseProducts = useMemo(() => {
    const base = config.categories.length === 0
      ? allProducts
      : allProducts.filter(p => config.categories.includes(p.category));
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
    return result;
  }, [baseProducts, sizeFilter, sort]);

  const toggleSize = (s: string) =>
    setSizeFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">
        <section className="bg-bg-dark text-primary-foreground py-16 md:py-20 px-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/40 mb-3">Shop</p>
          <h1 className="text-[36px] md:text-[52px] font-bold uppercase leading-none mb-3">{config.title}</h1>
          <p className="text-[14px] text-primary-foreground/40">{config.subtitle}</p>
        </section>

        {config.tabs && config.tabs.length > 1 && (
          <div className="border-b border-border sticky top-[var(--offset)] bg-background z-10">
            <div className="max-w-[1400px] mx-auto px-4 flex items-center gap-0 overflow-x-auto scrollbar-none">
              {config.tabs.map((tab, i) => (
                <button key={tab.label} onClick={() => setActiveTab(i)}
                  className={`shrink-0 text-[12px] font-medium uppercase tracking-[0.1em] px-5 py-4 border-b-2 transition-colors whitespace-nowrap ${activeTab === i ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-b border-border bg-background">
          <div className="max-w-[1400px] mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
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
                <option value="default">Relevancia</option>
                <option value="price-asc">Precio: menor a mayor</option>
                <option value="price-desc">Precio: mayor a menor</option>
              </select>
            </div>
          </div>
        </div>

        <section className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
          {products.length === 0 ? (
            <p className="text-center text-muted-foreground py-20">No hay productos en esta categoría todavía.</p>
          ) : (
            <>
              <p className="text-[12px] text-muted-foreground mb-6">{products.length} producto{products.length !== 1 ? 's' : ''}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
                {products.map((p, i) => (
                  <div key={p.slug} className={`reveal rd${Math.min(i + 1, 8)}`}>
                    <ProductCard id={p.slug} name={p.name} category={p.category} price={p.price}
                      originalPrice={p.originalPrice} image={p.image} images={p.images}
                      sizes={p.sizes} stock={p.stock} href={p.href} />
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
