'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import MayoristaProductCard from './MayoristaProductCard';
import MayoristaCampaignHero from './MayoristaCampaignHero';
import MayoristaHowItWorks from './MayoristaHowItWorks';
import MayoristaDropBanner, { type MayoristaDropProps } from './MayoristaDropBanner';
import MayoristaDropPopup from './MayoristaDropPopup';
import type { MayoristaProduct } from '@/lib/mayorista-products';
import { filterByPromo, sortPromoFirst, type CampaignBanner, type PromoFilter } from '@/lib/mayorista-campaign-view';
import { sortCatalog, isNewProduct, CATALOG_SORT_LABELS, type CatalogSort } from '@/lib/mayorista-catalog-sort';
import { useMayoristaPerfil } from '@/context/MayoristaPerfilContext';
import MayoristaDivisaNota from './MayoristaDivisaNota';

const chip = (active: boolean) =>
  `min-h-[36px] px-3 py-1.5 text-[11px] uppercase tracking-wide rounded-full border transition-colors ${
    active ? 'bg-bg-dark text-primary-foreground border-bg-dark' : 'border-border text-muted-foreground hover:border-foreground/40'
  }`;

// Los pilares se muestran enteros la primera vez; después quedan plegados
// para que el cliente que ya los conoce llegue antes a la grilla.
const PILLARS_SEEN_KEY = 'hy_mayorista_pilares_vistos';

export default function MayoristaCatalog({ products, banner, preview, drop }: { products: MayoristaProduct[]; banner: CampaignBanner | null; preview?: boolean; drop?: MayoristaDropProps | null }) {
  // Consignación: la bajada no puede decir "50% del PVP" (lib/mayorista-consignacion.ts).
  const { consignacion } = useMayoristaPerfil();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [promo, setPromo] = useState<PromoFilter>('all');
  const [onlyDrop, setOnlyDrop] = useState(false);
  const [onlyNew, setOnlyNew] = useState(false);
  const [sort, setSort] = useState<CatalogSort>('disponibilidad');
  const [pillarsOpen, setPillarsOpen] = useState(true);
  const catalogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(PILLARS_SEEN_KEY)) setPillarsOpen(false);
      else localStorage.setItem(PILLARS_SEEN_KEY, '1');
    } catch {}
  }, []);

  const hasPromo = products.some(p => p.promo);
  const newCount = useMemo(() => products.filter(p => isNewProduct(p)).length, [products]);
  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category).filter(Boolean));
    return ['Todos', ...Array.from(set)];
  }, [products]);

  // Con campaña vigente el catálogo arranca con la liquidación arriba; los
  // filtros de grupo solo aparecen si hay productos en ese grupo.
  const base = hasPromo ? sortPromoFirst(products) : products;
  const filtered = sortCatalog(filterByPromo(base, promo).filter(p => {
    if (onlyDrop && !p.drop) return false;
    if (onlyNew && !isNewProduct(p)) return false;
    const matchesCategory = category === 'Todos' || p.category === category;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  }), sort);
  const promoActive = promo !== 'all';
  const anyFilter = search !== '' || category !== 'Todos' || promoActive || onlyDrop || onlyNew;
  const scrollToCatalog = () => catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const showDrop = () => { setOnlyDrop(true); setOnlyNew(false); setPromo('all'); setCategory('Todos'); scrollToCatalog(); };
  const showAll = () => { setOnlyDrop(false); setOnlyNew(false); setPromo('all'); scrollToCatalog(); };
  const clearFilters = () => { setSearch(''); setCategory('Todos'); setPromo('all'); setOnlyDrop(false); setOnlyNew(false); };

  return (
    <div className="px-5 sm:px-8 py-6">
      {drop && (
        <>
          <MayoristaDropBanner drop={drop} onCta={showDrop} onCatalog={showAll} />
          <MayoristaDropPopup drop={drop} onCta={showDrop} />
        </>
      )}

      {/* Con drop y sin campaña, el banner del drop reemplaza al hero de marca. */}
      {(banner || !drop) && (
        <MayoristaCampaignHero
          banner={banner}
          preview={preview}
          onCta={() => { setOnlyDrop(false); setOnlyNew(false); setPromo('promo'); setCategory('Todos'); scrollToCatalog(); }}
          onCatalog={showAll}
        />
      )}

      {pillarsOpen ? (
        <MayoristaHowItWorks />
      ) : (
        <button type="button" onClick={() => setPillarsOpen(true)} className="mb-6 text-[11px] uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">
          Cómo funciona Hype Mayoristas
        </button>
      )}

      <div ref={catalogRef} className="scroll-mt-24">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <h2 className="text-lg font-bold tracking-tight">{onlyDrop && drop ? `${drop.name}${drop.subtitle ? ` ${drop.subtitle}` : ''}` : promoActive && banner ? banner.name : onlyNew ? 'Novedades' : 'Catálogo'}</h2>
          <p className="text-[12px] text-muted-foreground">
            {onlyDrop && drop ? `${filtered.length} modelos nuevos · ${drop.beforePublic ? `antes que el público (sale el ${drop.publicOpenLabel})` : 'recién salidos'}` : promoActive && banner ? `${filtered.length} productos en ${banner.badge.toLowerCase()} · precio mayorista con el extra ya aplicado` : consignacion ? `Precios de lista. De cada venta te quedás con el ${consignacion.pct}% y nos liquidás el resto.` : '50% del PVP. Pedís hoy, lo preparamos esta semana.'}
          </p>
        </div>
        <MayoristaDivisaNota className="mb-3" />

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <input
            type="search"
            aria-label="Buscar producto"
            placeholder="Buscar producto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-h-[44px] bg-transparent border-b border-border px-1 py-2.5 text-sm focus:outline-none focus:border-foreground transition-colors"
          />
          <label className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            Ordenar
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as CatalogSort)}
              className="min-h-[44px] bg-transparent border-b border-border px-1 py-2 text-[12px] normal-case tracking-normal text-foreground focus:outline-none focus:border-foreground"
            >
              {(Object.keys(CATALOG_SORT_LABELS) as CatalogSort[]).map(k => <option key={k} value={k}>{CATALOG_SORT_LABELS[k]}</option>)}
            </select>
          </label>
        </div>

        {hasPromo && banner && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <button type="button" aria-pressed={promo === 'promo'} onClick={() => setPromo(promo === 'promo' ? 'all' : 'promo')} className={chip(promo === 'promo')}>
              Solo {banner.badge.toLowerCase()}
            </button>
            {banner.groups.filter(g => g.count > 0).map(g => (
              <button key={g.key} type="button" aria-pressed={typeof promo === 'object' && promo.group === g.key} onClick={() => setPromo(typeof promo === 'object' && promo.group === g.key ? 'all' : { group: g.key })} className={chip(typeof promo === 'object' && promo.group === g.key)}>
                {g.label}
              </button>
            ))}
            {promoActive && <button type="button" onClick={() => setPromo('all')} className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-4 ml-1">Ver todo</button>}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Filtrar por categoría">
          {drop && (
            <button type="button" aria-pressed={onlyDrop} onClick={() => setOnlyDrop(!onlyDrop)} className={`${chip(onlyDrop)} inline-flex items-center gap-1.5`}>
              <span className={`w-1.5 h-1.5 rounded-full ${onlyDrop ? 'bg-[hsl(142,70%,62%)]' : 'bg-[hsl(142,71%,32%)]'}`} aria-hidden />
              Nuevo · {drop.name}
            </button>
          )}
          {newCount > 0 && (
            <button type="button" aria-pressed={onlyNew} onClick={() => setOnlyNew(!onlyNew)} className={chip(onlyNew)}>
              Nuevo ({newCount})
            </button>
          )}
          {categories.map((c) => (
            <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={chip(category === c)}>
              {c}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground text-sm">No hay productos que coincidan con {search ? `“${search}”` : 'los filtros'}.</p>
            {anyFilter && (
              <button type="button" onClick={clearFilters} className="mt-4 min-h-[44px] px-5 rounded-full border border-border text-[11px] font-semibold uppercase tracking-wide hover:border-foreground transition-colors">
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((p) => (
              <MayoristaProductCard key={p.slug} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
