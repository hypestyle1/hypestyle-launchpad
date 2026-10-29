'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import { useProducts, type NormalizedProduct } from '@/hooks/useProducts';

/* Catálogo del evento — el sitio entero comprable sin salir del takeover.

   Productos y precios REALES de Woo (useProducts viene hidratado desde el
   servidor, así que la grilla sale pintada en el primer render, sin salto).
   La curaduría de Destacados llega por props desde el servidor
   (lib/cyber-cartelera.ts); el resto se organiza por las categorías reales
   del catálogo. Dentro de cada vista, lo que tiene stock va primero y lo
   agotado al final (visible: es la señal de reestock, como en Best Sellers).

   Acá no se escribe ningún monto ni ningún porcentaje. */

const VISTAS = ['Destacados', 'Tees', 'Hoodies', 'Longsleeves', 'Packs', 'Todo'] as const;
type Vista = (typeof VISTAS)[number];

const CAT_POR_VISTA: Record<Exclude<Vista, 'Destacados' | 'Todo'>, string[]> = {
  Tees: ['Tee'],
  Hoodies: ['Hoodie', 'Set'],
  Longsleeves: ['Longsleeve', 'Polo'],
  Packs: ['Pack'],
};

/** Con stock primero; dentro de cada grupo conserva el orden recibido. */
function conStockPrimero(items: NormalizedProduct[]): NormalizedProduct[] {
  const hayStock = (p: NormalizedProduct) =>
    Object.values(p.stock ?? {}).some((s) => s !== 'out');
  return [...items.filter(hayStock), ...items.filter((p) => !hayStock(p))];
}

export default function CyberCatalogoEvento({ destacadosSlugs }: { destacadosSlugs: string[] }) {
  const { data } = useProducts();
  const [vista, setVista] = useState<Vista>('Destacados');

  const lista = useMemo(() => {
    if (!data) return [];
    if (vista === 'Destacados') {
      const bySlug = new Map(data.map((p) => [p.slug, p]));
      return destacadosSlugs
        .map((s) => bySlug.get(s))
        .filter(Boolean) as NormalizedProduct[];
    }
    if (vista === 'Todo') return conStockPrimero(data).slice(0, 24);
    const cats = CAT_POR_VISTA[vista];
    return conStockPrimero(data.filter((p) => cats.includes(p.category)));
  }, [data, vista, destacadosSlugs]);

  return (
    <section id="catalogo" className="bg-background px-4 py-12 text-foreground md:px-10 md:py-16">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 md:mb-6">
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-text-light md:text-[11px]">
              Todo el evento
            </p>
            <h2 className="text-[26px] font-black uppercase leading-[0.95] tracking-[-0.01em] md:text-[36px]">
              Catálogo Cyber
            </h2>
          </div>
          <p className="text-[12px] text-text-light">Precios finales. Lo que ves es lo que pagás.</p>
        </div>

        {/* Filtros */}
        <div className="-mx-4 mb-6 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
          {VISTAS.map((v) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={`shrink-0 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                vista === v
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border-mid text-foreground/70 hover:border-foreground/50 hover:text-foreground'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Grilla */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-3 md:gap-x-4 md:gap-y-9 lg:grid-cols-4">
          {lista.map((p) => (
            <ProductCard
              key={p.slug}
              id={p.slug}
              name={p.name}
              category={p.category}
              price={p.price}
              originalPrice={p.originalPrice}
              image={p.images[0]}
              images={p.images}
              sizes={p.sizes}
              stock={p.stock}
              href={`/producto/${p.slug}`}
              tags={p.tags}
              mutedPrice
              dense
            />
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/productos"
            className="inline-flex h-[52px] items-center justify-center rounded-full border border-foreground/25 px-10 text-[12px] font-bold uppercase tracking-[0.12em] text-foreground transition-colors hover:border-foreground"
          >
            Ver el catálogo completo
          </Link>
        </div>
      </div>
    </section>
  );
}
