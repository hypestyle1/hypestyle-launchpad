'use client';

import { useMemo, useRef, useState } from 'react';
import MayoristaProductCard from './MayoristaProductCard';
import MayoristaCampaignHero from './MayoristaCampaignHero';
import MayoristaHowItWorks from './MayoristaHowItWorks';
import MayoristaDropBanner, { type MayoristaDropProps } from './MayoristaDropBanner';
import MayoristaDropPopup from './MayoristaDropPopup';
import type { MayoristaProduct } from '@/lib/mayorista-products';
import { filterByPromo, sortPromoFirst, type CampaignBanner, type PromoFilter } from '@/lib/mayorista-campaign-view';

const chip = (active: boolean) =>
  `px-3 py-1.5 text-[11px] uppercase tracking-wide rounded-full border transition-colors ${
    active ? 'bg-bg-dark text-primary-foreground border-bg-dark' : 'border-border text-muted-foreground hover:border-foreground/40'
  }`;

export default function MayoristaCatalog({ products, banner, preview, drop }: { products: MayoristaProduct[]; banner: CampaignBanner | null; preview?: boolean; drop?: MayoristaDropProps | null }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [promo, setPromo] = useState<PromoFilter>('all');
  const [onlyDrop, setOnlyDrop] = useState(false);
  const catalogRef = useRef<HTMLDivElement>(null);

  const hasPromo = products.some(p => p.promo);
  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category).filter(Boolean));
    return ['Todos', ...Array.from(set)];
  }, [products]);

  // Con campaña vigente el catálogo arranca con la liquidación arriba; los
  // filtros de grupo solo aparecen si hay productos en ese grupo.
  const base = hasPromo ? sortPromoFirst(products) : products;
  const filtered = filterByPromo(base, promo).filter(p => {
    if (onlyDrop && !p.drop) return false;
    const matchesCategory = category === 'Todos' || p.category === category;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  const promoActive = promo !== 'all';
  const scrollToCatalog = () => catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const showDrop = () => { setOnlyDrop(true); setPromo('all'); setCategory('Todos'); scrollToCatalog(); };
  const showAll = () => { setOnlyDrop(false); setPromo('all'); scrollToCatalog(); };

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
          onCta={() => { setOnlyDrop(false); setPromo('promo'); setCategory('Todos'); scrollToCatalog(); }}
          onCatalog={showAll}
        />
      )}

      <MayoristaHowItWorks />

      <div ref={catalogRef} className="scroll-mt-24">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <h2 className="text-lg font-bold tracking-tight">{onlyDrop && drop ? `${drop.name}${drop.subtitle ? ` ${drop.subtitle}` : ''}` : promoActive && banner ? banner.name : 'Catálogo'}</h2>
          <p className="text-[12px] text-muted-foreground">
            {onlyDrop && drop ? `${filtered.length} modelos nuevos · ${drop.beforePublic ? `antes que el público (sale el ${drop.publicOpenLabel})` : 'recién salidos'}` : promoActive && banner ? `${filtered.length} productos en ${banner.badge.toLowerCase()} · precio mayorista con el extra ya aplicado` : '50% del PVP. Pedís hoy, lo preparamos esta semana.'}
          </p>
        </div>

        <input
          type="text"
          placeholder="Buscar producto…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent border-b border-border px-1 py-2.5 text-sm focus:outline-none focus:border-foreground transition-colors mb-4"
        />

        {hasPromo && banner && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <button onClick={() => setPromo(promo === 'promo' ? 'all' : 'promo')} className={chip(promo === 'promo')}>
              Solo {banner.badge.toLowerCase()}
            </button>
            {banner.groups.filter(g => g.count > 0).map(g => (
              <button key={g.key} onClick={() => setPromo(typeof promo === 'object' && promo.group === g.key ? 'all' : { group: g.key })} className={chip(typeof promo === 'object' && promo.group === g.key)}>
                {g.label}
              </button>
            ))}
            {promoActive && <button onClick={() => setPromo('all')} className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-4 ml-1">Ver todo</button>}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-6">
          {drop && (
            <button onClick={() => setOnlyDrop(!onlyDrop)} className={`${chip(onlyDrop)} inline-flex items-center gap-1.5`}>
              <span className={`w-1.5 h-1.5 rounded-full ${onlyDrop ? 'bg-[hsl(142,70%,62%)]' : 'bg-[hsl(142,71%,32%)]'}`} aria-hidden />
              Nuevo · {drop.name}
            </button>
          )}
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)} className={chip(category === c)}>
              {c}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm py-12 text-center">No hay productos que coincidan con la búsqueda.</p>
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
