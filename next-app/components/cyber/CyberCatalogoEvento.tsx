'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import { useProducts, type NormalizedProduct } from '@/hooks/useProducts';
import { cyberCardPrice, cyberCatalogOrder, cyberCategoryMatches, CYBER_INITIAL_COUNT, CYBER_EXPANDED_COUNT } from '@/lib/cyber-catalog-view';
import { useCyberCatalogTransition } from '@/hooks/useCyberCatalogTransition';
import { DESCUENTO_TRANSFERENCIA } from '@/lib/precio-servidor';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/envio';
import { CreditCard, Truck, Zap } from 'lucide-react';

const formatARS = (n: number) => `$${n.toLocaleString('es-AR')}`;

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

  const hayStock = (p: NormalizedProduct) => Object.values(p.stock ?? {}).some((s) => s !== 'out');

  // Cuántas prendas con stock tiene cada filtro: el número va junto a la pestaña.
  const conteos = useMemo(() => {
    const out: Record<string, number> = {};
    if (!data) return out;
    for (const f of filtros) out[f.id] = data.filter((p) => cyberCategoryMatches(p.category, f) && hayStock(p)).length;
    // Destacados: los curados que hoy tienen stock (la grilla muestra hasta 36).
    const bySlug = new Map(data.map((p) => [p.slug, p]));
    out.destacados = destacadosSlugs.filter((s) => { const p = bySlug.get(s); return p && hayStock(p); }).length;
    return out;
  }, [data, filtros, destacadosSlugs]);

  // "Hasta X% OFF" sale de los precios reales con stock, nunca de una cifra
  // escrita a mano. Mientras los precios se verifican o es vista previa, no se muestra.
  const maxOff = useMemo(() => {
    if (!data || live.preview || pricePending) return 0;
    return data.reduce((m, p) => (hayStock(p) && p.originalPrice && p.originalPrice > p.price
      ? Math.max(m, Math.floor((1 - p.price / p.originalPrice) * 100)) : m), 0);
  }, [data, live.preview, pricePending]);

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
    <section id="catalogo" className="bg-background px-4 py-12 text-foreground md:px-10 md:py-16">
      <div className="mx-auto max-w-[1400px]">
        {/* Cabecera editorial (rediseño 7/11, referencia de Valentín). Radius 0,
            sin cajas ni sombras: la jerarquía la hacen la tipografía y el aire. */}
        <header className="pt-2 md:pt-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-foreground/70 md:text-[12px]">
            Todo el evento
          </p>
          <h2 className="mt-3 text-[clamp(2.6rem,11.5vw,7.5rem)] font-black uppercase leading-[0.86] tracking-[-0.045em] md:mt-4">
            Catálogo Cyber
          </h2>
          <p className="mt-4 text-[15px] font-normal leading-snug text-foreground/85 md:mt-5 md:text-[22px]">
            {live.preview
              ? 'Vista previa: las ofertas arrancan a las 19:00. El carrito conserva el precio vigente.'
              : pricePending
                ? 'Verificando precios Cyber…'
                : <>{maxOff > 0 && <><span className="block md:inline">Hasta {maxOff}% OFF</span><span aria-hidden className="mx-3.5 hidden text-foreground/40 md:inline">·</span></>}<span className="block md:inline">{transferencia}% extra pagando con transferencia</span></>}
          </p>
        </header>

        {/* Índice de categorías: esquinas rectas, subrayado en la activa, contadores reales. */}
        <nav aria-label="Categorías del catálogo" className="relative -mx-4 mt-8 md:mx-0 md:mt-12">
          <div className="flex snap-x snap-mandatory scroll-px-4 overflow-x-auto scroll-smooth px-4 [scrollbar-width:none] md:scroll-px-0 md:px-0 [&::-webkit-scrollbar]:hidden">
            {pestañas.map((p) => {
              const activa = vista === p.id;
              const n = conteos[p.id];
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => { setVista(p.id); setExpanded(false); }}
                  className={`group relative z-10 shrink-0 snap-start whitespace-nowrap pb-3.5 pr-7 pt-1 text-left text-[12px] font-bold uppercase tracking-[0.16em] transition-colors md:pb-4 md:pr-12 md:text-[14px] md:tracking-[0.18em] ${
                    activa ? 'text-foreground' : 'text-foreground/45 hover:text-foreground'
                  }`}
                >
                  {p.label}
                  {n ? <span className="ml-2 font-semibold tabular-nums text-foreground/35">{n}</span> : null}
                  <span aria-hidden className={`absolute bottom-0 left-0 right-7 h-[3px] bg-foreground transition-opacity md:right-12 ${activa ? 'opacity-100' : 'opacity-0'}`} />
                </button>
              );
            })}
          </div>
          <div aria-hidden className="absolute inset-x-4 bottom-0 -z-0 h-px bg-border-mid md:inset-x-0" />
        </nav>

        {/* Beneficios vigentes: una línea fina, sin tarjetas. */}
        <ul className="mb-8 mt-5 grid grid-cols-1 gap-y-3 bg-muted px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.11em] text-foreground md:mb-10 md:mt-7 md:grid-cols-3 md:gap-0 md:px-0 md:py-5 md:text-[12px] md:tracking-[0.18em]">
          {beneficios.map(({ Icono, texto }, i) => (
            <li key={texto} className={`flex items-center gap-3 md:justify-center md:gap-4 ${i > 0 ? 'md:border-l md:border-border-mid' : ''}`}>
              <Icono aria-hidden strokeWidth={1.6} className="h-[18px] w-[18px] shrink-0 md:h-6 md:w-6" />
              {texto}
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
            <button type="button" onClick={() => setExpanded(true)} className="inline-flex h-[56px] w-full items-center justify-center gap-3 border border-foreground px-14 text-[12px] font-bold uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-foreground hover:text-background md:w-auto">
              Ver más
              <span className="font-semibold tabular-nums opacity-50">+{faltan}</span>
            </button>
          ) : <Link
            href="/productos"
            className="inline-flex h-[54px] w-full items-center justify-center border border-foreground px-12 text-[12px] font-bold uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-foreground hover:text-background md:w-auto"
          >
            Ver toda la colección
          </Link>}
        </div>
      </div>
    </section>
  );
}
