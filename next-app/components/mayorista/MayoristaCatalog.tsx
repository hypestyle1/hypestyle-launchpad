'use client';

import { useEffect, useMemo, useState } from 'react';
import MayoristaProductCard from './MayoristaProductCard';
import type { MayoristaProduct } from '@/lib/mayorista-products';

const HELP_DISMISSED_KEY = 'hype_mayorista_help_dismissed';

const STEPS = [
  { title: 'Elegí tus productos', text: 'Buscá o filtrá por categoría y sumá cada talle que necesites al pedido.' },
  { title: 'Revisá tu pedido', text: 'Arriba a la derecha, en "Pedido", ajustás cantidades o sacás productos antes de confirmar.' },
  { title: 'Cargá los datos de envío', text: 'Nombre, DNI y la sucursal de Via Cargo donde lo recibís — solo hace falta la primera vez, después queda guardado.' },
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

export default function MayoristaCatalog({ products }: { products: MayoristaProduct[] }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');

  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category).filter(Boolean));
    return ['Todos', ...Array.from(set)];
  }, [products]);

  const filtered = products.filter(p => {
    const matchesCategory = category === 'Todos' || p.category === category;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="px-5 sm:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Precio mayorista</h1>
        <p className="text-[13px] text-muted-foreground mt-1">50% off del precio de lista. Pedís hoy, lo preparamos esta semana.</p>
      </div>

      <HowItWorks />

      <input
        type="text"
        placeholder="Buscar producto…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-transparent border-b border-border px-1 py-2.5 text-sm focus:outline-none focus:border-foreground transition-colors mb-4"
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1.5 text-[11px] uppercase tracking-wide rounded-full border transition-colors ${
              category === c ? 'bg-bg-dark text-primary-foreground border-bg-dark' : 'border-border text-muted-foreground hover:border-foreground/40'
            }`}
          >
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
  );
}
