'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import MayoristaProductCard from './MayoristaProductCard';
import MayoristaCampaignHero from './MayoristaCampaignHero';
import type { MayoristaProduct } from '@/lib/mayorista-products';
import { filterByPromo, sortPromoFirst, type CampaignBanner, type PromoFilter } from '@/lib/mayorista-campaign-view';

const HELP_DISMISSED_KEY = 'hype_mayorista_help_dismissed';

const STEPS = [
  { title: 'Elegí tus productos', text: 'Buscá o filtrá por categoría y sumá cada talle que necesites al pedido.' },
  { title: 'Revisá tu pedido', text: 'Arriba a la derecha, en "Pedido", ajustás cantidades o sacás productos antes de confirmar.' },
  { title: 'Cargá los datos de envío', text: 'Nombre, DNI y cómo lo recibís: Via Cargo, Andreani (domicilio o sucursal) o un expreso a coordinar. Solo hace falta la primera vez, después queda guardado.' },
  { title: 'Confirmá', text: 'Te contactamos para coordinar preparación y entrega. Podés descargar el resumen en PDF o Excel.' },
];

function HowItWorks() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    setShow(!localStorage.getItem(HELP_DISMISSED_KEY));
  }, []);

  function dismiss() {
    localStorage.setItem(HELP_DISMISSED_KEY, '1');
    setShow(false);
  }

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="text-[11px] uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        ¿Cómo funciona? →
      </button>
    );
  }

  return (
    <div className="rounded-[16px] border border-border bg-bg-alt/50 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] uppercase tracking-wide font-semibold text-foreground/70">Cómo pedir</p>
        <button onClick={dismiss} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
          Entendido, no mostrar más
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STEPS.map((step, i) => (
          <div key={step.title}>
            <div className="text-[11px] font-bold text-foreground/40 mb-1">{i + 1}</div>
            <div className="text-[13px] font-semibold mb-0.5">{step.title}</div>
            <div className="text-[12px] text-muted-foreground leading-snug">{step.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const chip = (active: boolean) =>
  `px-3 py-1.5 text-[11px] uppercase tracking-wide rounded-full border transition-colors ${
    active ? 'bg-bg-dark text-primary-foreground border-bg-dark' : 'border-border text-muted-foreground hover:border-foreground/40'
  }`;

export default function MayoristaCatalog({ products, banner, preview }: { products: MayoristaProduct[]; banner: CampaignBanner | null; preview?: boolean }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [promo, setPromo] = useState<PromoFilter>('all');
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
    const matchesCategory = category === 'Todos' || p.category === category;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  const promoActive = promo !== 'all';
  const scrollToCatalog = () => catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="px-5 sm:px-8 py-6">
      <MayoristaCampaignHero
        banner={banner}
        preview={preview}
        onCta={() => { setPromo('promo'); setCategory('Todos'); scrollToCatalog(); }}
        onCatalog={() => { setPromo('all'); scrollToCatalog(); }}
      />

      <HowItWorks />

      <div ref={catalogRef} className="scroll-mt-24">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <h2 className="text-lg font-bold tracking-tight">{promoActive && banner ? banner.name : 'Catálogo'}</h2>
          <p className="text-[12px] text-muted-foreground">
            {promoActive && banner ? `${filtered.length} productos en ${banner.badge.toLowerCase()} · precio mayorista con el extra ya aplicado` : '50% del PVP. Pedís hoy, lo preparamos esta semana.'}
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
