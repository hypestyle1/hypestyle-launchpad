'use client';

import { useMemo, useState } from 'react';
import MayoristaProductCard from './MayoristaProductCard';
import type { MayoristaProduct } from '@/lib/mayorista-products';

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
