'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import { useProducts, type NormalizedProduct } from '@/hooks/useProducts';
import { cyberCardPrice, cyberCatalogOrder, cyberCategoryMatches, CYBER_INITIAL_COUNT, CYBER_EXPANDED_COUNT } from '@/lib/cyber-catalog-view';
import { useCyberCatalogTransition } from '@/hooks/useCyberCatalogTransition';

/* Catálogo del evento — el sitio entero comprable sin salir del takeover.

   Productos, precios y stock REALES de Woo (useProducts viene hidratado desde
   el servidor, así que la grilla sale pintada en el primer render). La
   curaduría llega por props desde lib/cyber-cartelera, medida contra Woo el
   29/10.

   La previsualizacion autenticada usa las ofertas programadas del respaldo REST.
   Solo cambia presentacion; el carrito conserva el precio efectivo. Las
   referencias se limitan a la campana verificada, sin tachados historicos.

   Dentro de cada filtro: primero el orden curado, después el resto de la
   categoría (ningún producto desaparece), y lo agotado al final — visible,
   porque es la señal de qué reponer. */

export interface FiltroVista {
  id: string;
  label: string;
  cats: string[];
  slugs: string[];
}

/** Con stock primero; dentro de cada grupo conserva el orden recibido. */
function conStockPrimero(items: NormalizedProduct[]): NormalizedProduct[] {
  const hayStock = (p: NormalizedProduct) => Object.values(p.stock ?? {}).some((s) => s !== 'out');
  return [...items.filter(hayStock), ...items.filter((p) => !hayStock(p))];
}

export default function CyberCatalogoEvento({
  destacadosSlugs,
  filtros,
  pricePreview = {},
  preview = false,
  serverTime,
}: {
  destacadosSlugs: string[];
  filtros: FiltroVista[];
  pricePreview?: Record<string, { price: number; originalPrice: number }>;
  preview?: boolean;
  serverTime: number;
}) {
  const { data: cachedProducts } = useProducts();
  const live = useCyberCatalogTransition(preview, serverTime);
  const data = live.updating ? undefined : live.products ?? cachedProducts;
  const [vista, setVista] = useState<string>('destacados');
  const [expanded, setExpanded] = useState(false);

  const lista = useMemo(() => {
    if (!data) return [];
    const bySlug = new Map(data.map((p) => [p.slug, p]));
    const pick = (slugs: string[]) =>
      slugs.map((s) => bySlug.get(s)).filter(Boolean) as NormalizedProduct[];

    if (vista === 'destacados' || vista === 'todo') return cyberCatalogOrder(data, destacadosSlugs);

    const f = filtros.find((x) => x.id === vista);
    if (!f) return [];
    // Curados primero, el resto de la categoría después: así el filtro nunca
    // esconde un producto, solo decide con qué se abre.
    const curados = pick(f.slugs).filter(p => cyberCategoryMatches(p.category, f));
    const yaEstan = new Set(curados.map((p) => p.slug));
    const resto = conStockPrimero(
      data.filter((p) => cyberCategoryMatches(p.category, f) && !yaEstan.has(p.slug)),
    );
    return cyberCatalogOrder([...curados, ...resto], f.slugs);
  }, [data, vista, destacadosSlugs, filtros]);

  const pestañas = [
    { id: 'destacados', label: 'Destacados' },
    ...filtros.map((f) => ({ id: f.id, label: f.label })),
    { id: 'todo', label: 'Todo' },
  ];

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
          <p className="text-[12px] text-text-light">{live.preview ? 'Vista previa Cyber: ofertas desde las 19:00. El carrito conserva el precio vigente.' : 'Precios finales. Lo que ves es lo que pagás.'}</p>
        </div>

        <div className="-mx-4 mb-6 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
          {pestañas.map((p) => (
            <button
              key={p.id}
              onClick={() => { setVista(p.id); setExpanded(false); }}
              className={`shrink-0 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                vista === p.id
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border-mid text-foreground/70 hover:border-foreground/50 hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {live.updating && <p role="status" className="py-6 text-sm text-text-light">{live.error ? 'No pudimos actualizar los precios. ' : 'Actualizando precios Cyber…'}{live.error && <button type="button" className="underline" onClick={() => void live.retry()}>Reintentar</button>}</p>}
        <div className="grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-3 md:gap-x-4 md:gap-y-9 lg:grid-cols-4">
          {lista.slice(0, expanded ? CYBER_EXPANDED_COUNT : CYBER_INITIAL_COUNT).map((p) => (
            <ProductCard
              key={p.slug}
              id={p.slug}
              name={p.name}
              category={p.category}
              price={p.price}
              pricePresentation={cyberCardPrice(p.price, pricePreview[p.slug], live.preview)}
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
          {!expanded && lista.length > CYBER_INITIAL_COUNT ? (
            <button type="button" onClick={() => setExpanded(true)} className="inline-flex h-[52px] items-center justify-center rounded-full border border-foreground/25 px-10 text-[12px] font-bold uppercase tracking-[0.12em] text-foreground transition-colors hover:border-foreground">
              Ver más
            </button>
          ) : <Link
            href="/productos"
            className="inline-flex h-[52px] items-center justify-center rounded-full border border-foreground/25 px-10 text-[12px] font-bold uppercase tracking-[0.12em] text-foreground transition-colors hover:border-foreground"
          >
            Ver toda la colección
          </Link>}
        </div>
      </div>
    </section>
  );
}
