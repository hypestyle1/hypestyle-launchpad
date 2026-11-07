'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import { useProducts, type NormalizedProduct } from '@/hooks/useProducts';
import { cyberCardPrice, cyberCatalogOrder, cyberCategoryMatches, CYBER_INITIAL_COUNT, CYBER_EXPANDED_COUNT } from '@/lib/cyber-catalog-view';
import { useCyberCatalogTransition } from '@/hooks/useCyberCatalogTransition';
import { DESCUENTO_TRANSFERENCIA } from '@/lib/precio-servidor';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/envio';
import { CreditCard, Truck, Zap } from 'lucide-react';
import { CYBER_END } from '@/lib/cyber-hype';

const formatARS = (n: number) => `$${n.toLocaleString('es-AR')}`;

// Último día del evento, derivado de CYBER_END (que es el 9/11 00:00 ART): "8 de noviembre".
const ultimoDia = new Date(Date.parse(CYBER_END) - 1).toLocaleDateString('es-AR', {
  day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires',
});

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
  // Conservamos las fotos durante la actualización, sin exponer precios viejos.
  const data = live.products ?? cachedProducts;
  const pricePending = live.updating && !live.preview;
  const [vista, setVista] = useState<string>('destacados');
  const [expanded, setExpanded] = useState(false);

  const lista = useMemo(() => {
    if (!data) return [];
    const bySlug = new Map(data.map((p) => [p.slug, p]));
    const pick = (slugs: string[]) =>
      slugs.map((s) => bySlug.get(s)).filter(Boolean) as NormalizedProduct[];

    if (vista === 'destacados') return cyberCatalogOrder(data, destacadosSlugs);

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

  // Cuántos productos lista cada pestaña: el mismo conjunto que pinta la grilla
  // (incluye los agotados, que van al final a propósito), así el número y lo
  // que se ve coinciden. Destacados: los curados presentes en el catálogo.
  const conteos = useMemo(() => {
    const out: Record<string, number> = {};
    if (!data) return out;
    for (const f of filtros) out[f.id] = data.filter((p) => cyberCategoryMatches(p.category, f)).length;
    const slugs = new Set(data.map((p) => p.slug));
    out.destacados = destacadosSlugs.filter((s) => slugs.has(s)).length;
    return out;
  }, [data, filtros, destacadosSlugs]);

  // Pista de "hay más para deslizar": un fundido a la derecha del índice que se
  // apaga al llegar al final (y no aparece si todo entra, como en desktop).
  const indiceRef = useRef<HTMLDivElement>(null);
  const [quedaIndice, setQuedaIndice] = useState(false);
  const medirIndice = useCallback(() => {
    const el = indiceRef.current;
    if (el) setQuedaIndice(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);
  useEffect(() => {
    medirIndice();
    window.addEventListener('resize', medirIndice);
    return () => window.removeEventListener('resize', medirIndice);
  }, [medirIndice, conteos]);

  const pestañas = [
    { id: 'destacados', label: 'Destacados' },
    ...filtros.map((f) => ({ id: f.id, label: f.label })),
    // "Todo" salió el 7/11: mostraba exactamente lo mismo que Destacados.
  ];

  const visibles = Math.min(lista.length, CYBER_EXPANDED_COUNT);
  const faltan = visibles - CYBER_INITIAL_COUNT;

  // Beneficios vigentes, leídos de las constantes del checkout (no de texto suelto).
  const transferencia = Math.round(DESCUENTO_TRANSFERENCIA * 100);
  const beneficios = [
    { Icono: Zap, texto: `${transferencia}% extra con transferencia` },
    { Icono: CreditCard, texto: 'Hasta 3 cuotas sin interés' },
    { Icono: Truck, texto: `Envío gratis a sucursal desde ${formatARS(FREE_SHIPPING_THRESHOLD)}` },
  ];

  return (
    <section id="catalogo" className="bg-background px-4 pb-12 pt-7 text-foreground md:px-10 md:py-16">
      <div className="mx-auto max-w-[1400px]">
        {/* Cabecera editorial — iteraciones 2 a 4 del 7/11 (dirección EME Studios):
            título en caja baja y peso medium; la bajada informa, no grita.
            Radius 0, sin cajas ni sombras. */}
        <header className="max-w-[640px] md:pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-foreground/60 md:text-[11px]">
            Todo el evento
          </p>
          <h2 className="mt-2.5 text-[34px] font-medium leading-[1.02] tracking-[-0.03em] md:mt-4 md:text-[44px] md:tracking-[-0.025em]">
            Catálogo Cyber
          </h2>
          <p className="mt-2.5 text-[14px] font-normal leading-[1.5] text-foreground/75 md:mt-4 md:text-[16px]">
            La selección completa de Cyber Hype. Disponible hasta el {ultimoDia}.
          </p>
          {live.preview && (
            <p className="mt-2 text-[12px] text-text-light">Vista previa: las ofertas arrancan a las 19:00. El carrito conserva el precio vigente.</p>
          )}
        </header>

        {/* Índice de categorías: esquinas rectas, contadores reales. Hover:
            gris → negro; el subrayado crece de izquierda a derecha (≈220 ms). */}
        <nav aria-label="Categorías del catálogo" className="relative -mx-4 mt-6 md:mx-0 md:mt-10">
          <div
            ref={indiceRef}
            onScroll={medirIndice}
            className="flex snap-x snap-mandatory scroll-px-4 overflow-x-auto overscroll-x-contain scroll-smooth px-4 [scrollbar-width:none] md:scroll-px-0 md:px-0 lg:justify-between [&::-webkit-scrollbar]:hidden"
          >
            {pestañas.map((p) => {
              const activa = vista === p.id;
              const n = conteos[p.id];
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => { setVista(p.id); setExpanded(false); }}
                  className={`group relative z-10 shrink-0 snap-start touch-manipulation whitespace-nowrap pr-7 text-left text-[11px] font-semibold uppercase tracking-[0.16em] outline-none transition-colors duration-200 ease-out md:pr-11 lg:pr-0 md:text-[12px] md:tracking-[0.18em] focus-visible:text-foreground ${
                    activa ? 'text-foreground' : 'text-foreground/40 hover:text-foreground active:text-foreground'
                  }`}
                >
                  <span className="inline-flex flex-col items-stretch">
                    <span className="pb-3 pt-1 md:pb-3.5">
                      {p.label}
                      {n ? <span className={`ml-2 font-medium tabular-nums transition-colors duration-200 ${activa ? 'text-foreground/45' : 'text-foreground/30 group-hover:text-foreground/45'}`}>{n}</span> : null}
                    </span>
                    <span
                      aria-hidden
                      className={`block h-[2px] ease-out motion-reduce:!transition-none ${
                        activa ? 'w-full bg-foreground' : 'w-0 bg-foreground/25 group-hover:w-full group-focus-visible:w-full'
                      }`}
                      style={{ transitionProperty: 'width, background-color', transitionDuration: '220ms' }}
                    />
                  </span>
                </button>
              );
            })}
          </div>
          <div aria-hidden className="absolute inset-x-4 bottom-0 h-px bg-foreground/10 md:inset-x-0" />
          {/* Fundido a la derecha: indica que el índice sigue. Se apaga al final. */}
          <div
            aria-hidden
            className={`pointer-events-none absolute bottom-px right-0 top-0 z-20 w-12 bg-gradient-to-l from-background via-background/80 to-transparent transition-opacity duration-200 md:w-16 ${quedaIndice ? 'opacity-100' : 'opacity-0'}`}
          />
        </nav>

        {/* Beneficios — iteración 3: grilla con divisores finos. Mobile: transferencia
            y cuotas en dos columnas, envío a todo el ancho. Desktop: tres columnas
            iguales que ocupan todo el ancho. Liviano: no compite con el título. */}
        <ul className="mb-5 grid grid-cols-2 border-b border-foreground/10 text-[11.5px] font-normal leading-[1.35] text-foreground/75 md:mb-10 md:text-[13px] lg:grid-cols-3">
          {beneficios.map(({ Icono, texto }, i) => (
            <li
              key={texto}
              className={`flex items-center gap-2 py-3 md:gap-2.5 md:py-4 ${
                i === 0 ? 'border-r border-foreground/10 pr-3 md:pr-6'
                : i === 1 ? 'pl-3 md:pl-6 lg:border-r lg:border-foreground/10 lg:px-6'
                : 'col-span-2 hidden border-t border-foreground/10 md:flex lg:col-span-1 lg:border-t-0 lg:pl-6'
              }`}
            >
              <Icono aria-hidden strokeWidth={1.25} className="h-[15px] w-[15px] shrink-0 text-foreground/60" />
              <span>{texto}</span>
            </li>
          ))}
        </ul>

        {live.updating && <p role="status" className="mb-4 text-xs text-text-light">{live.error ? 'No pudimos actualizar los precios. ' : 'Consultando precios Cyber… '}{live.error && <button type="button" className="underline" onClick={() => void live.retry()}>Reintentar</button>}</p>}
        <div className="grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-3 md:gap-x-4 md:gap-y-9 lg:grid-cols-4">
          {lista.slice(0, expanded ? CYBER_EXPANDED_COUNT : CYBER_INITIAL_COUNT).map((p) => (
            <ProductCard
              key={p.slug}
              id={p.slug}
              name={p.name}
              category={p.category}
              price={p.price}
              pricePresentation={live.preview ? cyberCardPrice(p.price, pricePreview[p.slug], true) : undefined}
              originalPrice={live.preview ? undefined : p.originalPrice}
              showDiscountBadge={!live.preview && !pricePending}
              pricePending={pricePending}
              image={p.images[0]}
              images={p.images}
              sizes={p.sizes}
              stock={p.stock}
              href={`/producto/${p.slug}`}
              tags={p.tags}
              dense
            />
          ))}
        </div>

        <div className="mt-12 flex justify-center md:mt-16">
          {!expanded && faltan > 0 ? (
            <button type="button" onClick={() => setExpanded(true)} className="inline-flex h-[54px] w-full items-center justify-center gap-3 rounded-[14px] border border-foreground px-14 text-[12px] font-bold uppercase tracking-[0.18em] text-foreground transition-colors duration-200 ease-out hover:bg-foreground hover:text-background active:bg-foreground/90 active:text-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-foreground md:w-auto">
              Ver más
              <span className="font-semibold tabular-nums opacity-45">+{faltan}</span>
            </button>
          ) : <Link
            href="/productos"
            className="inline-flex h-[54px] w-full items-center justify-center gap-3 rounded-[14px] border border-foreground px-14 text-[12px] font-bold uppercase tracking-[0.18em] text-foreground transition-colors duration-200 ease-out hover:bg-foreground hover:text-background active:bg-foreground/90 active:text-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-foreground md:w-auto"
          >
            Ver toda la colección
          </Link>}
        </div>
      </div>
    </section>
  );
}
