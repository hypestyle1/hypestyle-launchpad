'use client';

import { useMemo, useRef, useState, type PointerEvent } from "react";
import { useLocale } from "@/context/LocaleContext";
import SectionHeader from "./SectionHeader";
import { useDragScroll } from "@/hooks/useDragScroll";
import { useReveal } from "@/hooks/useReveal";
import { useProducts, type NormalizedProduct } from "@/hooks/useProducts";
import { LOOKS, lookFoto, type Angulo, type Look } from "@/data/looks";

/**
 * Shop the look — line-up + giro (SS27).
 *
 * Arriba, todos los looks parados uno al lado del otro sobre la misma pared del
 * estudio (las fotos comparten fondo, distancia y altura de cámara, por eso se
 * leen como un solo plano). Al tocar una figura, abajo se abre el look: la foto
 * gira con el cursor por frente, perfil, espalda y detalle, y al lado van las
 * prendas con precio, stock y link a la ficha.
 *
 * Los datos de producto salen de la query ['products'] (precargada en el
 * servidor en el home), así que el primer render ya trae precios y no hay
 * salto. El look seleccionado arranca en el primero visible, igual en server y
 * cliente, sin orden al azar: el orden del line-up es curado.
 */

const ANGULO_LABEL: Record<Angulo, string> = {
  frente: 'Frente',
  perfil: 'Perfil',
  espalda: 'Espalda',
  detalle: 'Detalle',
};

interface Pieza {
  slug: string;
  name: string;
  category: string;
  image: string;
  price?: number;
  originalPrice?: number;
  href?: string;
  agotado: boolean;
  pendiente: boolean;
}

function resolver(look: Look, bySlug: Map<string, NormalizedProduct>): Pieza[] {
  // Un ítem que no está en el catálogo y no está marcado como pendiente (un
  // producto que se despublicó, o el catálogo todavía sin cargar) se omite.
  return look.items.filter((it) => it.pendiente || bySlug.has(it.slug)).map((it) => {
    const p = bySlug.get(it.slug);
    if (p) {
      return {
        slug: p.slug,
        name: p.name,
        category: p.category,
        image: p.image,
        price: p.price,
        originalPrice: p.originalPrice,
        href: p.href,
        agotado: Object.values(p.stock).every((s) => s === 'out'),
        pendiente: false,
      };
    }
    // Todavía no está en Woo: nombre provisorio y la foto de detalle del look.
    const detalle = look.angulos.includes('detalle') ? 'detalle' : look.angulos[look.angulos.length - 1];
    return {
      slug: it.slug,
      name: it.pendiente?.name ?? it.slug,
      category: it.pendiente?.category ?? '',
      image: lookFoto(look, detalle),
      agotado: false,
      pendiente: true,
    };
  });
}

const titulo = (piezas: Pieza[]) =>
  piezas[0]?.name.replace(/^(Athletic Dept|Hype Department|Hype)\s+/i, '') ?? '';

export default function ShopTheLook() {
  const dragRef = useDragScroll();
  const revealRef = useReveal();
  const { formatPrice } = useLocale();
  const { data: allProducts = [] } = useProducts(0);

  const looks = useMemo(() => {
    const bySlug = new Map(allProducts.map((p) => [p.slug, p]));
    return LOOKS.map((look) => ({ look, piezas: resolver(look, bySlug) }))
      // Un look se oculta solo si todo lo que tiene cargado en Woo está agotado.
      .filter(({ piezas }) => piezas.some((p) => p.pendiente || !p.agotado));
  }, [allProducts]);

  const [selId, setSelId] = useState<string | null>(null);
  const selIdx = Math.max(0, looks.findIndex((l) => l.look.id === selId));
  const sel = looks[selIdx];

  const elegir = (i: number) => {
    const next = looks[(i + looks.length) % looks.length];
    if (!next) return;
    setSelId(next.look.id);
    // Lleva la figura elegida a la vista dentro del line-up, sin mover la página.
    const rail = dragRef.current;
    const fig = rail?.querySelector<HTMLElement>(`[data-look="${next.look.id}"]`);
    if (rail && fig) {
      const left = fig.offsetLeft - (rail.clientWidth - fig.clientWidth) / 2;
      rail.scrollTo({ left, behavior: 'smooth' });
    }
  };

  if (!sel) return null;

  return (
    <section className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={revealRef}>
      <div className="reveal rd1">
        <SectionHeader title="Shop the look" link="/looks/" />
      </div>

      {/* Line-up: una sola pared, sin separación entre fotos. */}
      <div
        ref={dragRef}
        className="reveal rd2 flex overflow-x-auto no-scrollbar cursor-grab select-none rounded-[8px] bg-[#ecebe8]"
      >
        {looks.map(({ look, piezas }, i) => {
          const activo = i === selIdx;
          return (
            <button
              key={look.id}
              type="button"
              data-look={look.id}
              onClick={() => elegir(i)}
              aria-pressed={activo}
              aria-label={`Look ${i + 1}: ${titulo(piezas)}`}
              className={`flex-none w-[38vw] md:w-[calc(100%/5.5)] lg:w-[calc(100%/7)] text-left transition-[opacity,filter] duration-300 ${
                activo ? '' : 'opacity-40 grayscale-[0.6] hover:opacity-80 hover:grayscale-0'
              }`}
            >
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src={lookFoto(look, 'frente')}
                  alt=""
                  width={960}
                  height={1280}
                  loading={i < 4 ? 'eager' : 'lazy'}
                  decoding="async"
                  draggable={false}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-baseline gap-2 px-2.5 pt-2.5 pb-3 text-[11px]">
                <span className="font-semibold text-[12px] tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                {activo && <span className="w-1.5 h-1.5 rounded-full bg-foreground self-center" aria-hidden />}
                <span className="truncate text-foreground/60">{titulo(piezas)}</span>
              </div>
            </button>
          );
        })}
      </div>

      <LookPanel
        key={sel.look.id}
        look={sel.look}
        piezas={sel.piezas}
        numero={selIdx + 1}
        total={looks.length}
        onPrev={() => elegir(selIdx - 1)}
        onNext={() => elegir(selIdx + 1)}
        formatPrice={formatPrice}
      />
    </section>
  );
}

interface PanelProps {
  look: Look;
  piezas: Pieza[];
  numero: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  formatPrice: (n: number) => string;
}

function LookPanel({ look, piezas, numero, total, onPrev, onNext, formatPrice }: PanelProps) {
  const [ang, setAng] = useState(0);
  const fotoRef = useRef<HTMLDivElement>(null);
  const n = look.angulos.length;

  // Con mouse: la posición horizontal del cursor elige el ángulo (el modelo
  // "gira"). Con touch no hay hover, así que un toque pasa al siguiente.
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !fotoRef.current) return;
    const r = fotoRef.current.getBoundingClientRect();
    setAng(Math.min(n - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * n))));
  };

  const conPrecio = piezas.filter((p) => p.price && !p.agotado);
  const sumaLook = conPrecio.reduce((a, p) => a + (p.price ?? 0), 0);
  const hayPendientes = piezas.some((p) => p.pendiente);

  return (
    <div className="grid grid-cols-[42%_minmax(0,1fr)] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-cols-[400px_minmax(0,1fr)] gap-4 md:gap-10 pt-5 md:pt-6">
      <div>
        <div
          ref={fotoRef}
          onPointerMove={onMove}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setAng(0)}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            setAng((a) => (a + 1) % n);
          }}
          className="relative aspect-[3/4] overflow-hidden rounded-[8px] bg-[#ecebe8] cursor-ew-resize touch-pan-y"
        >
          {look.angulos.map((a, i) => (
            <img
              key={a}
              src={lookFoto(look, a)}
              alt={i === ang ? `${titulo(piezas)}, ${ANGULO_LABEL[a].toLowerCase()}` : ''}
              width={960}
              height={1280}
              decoding="async"
              draggable={false}
              className={`absolute inset-0 w-full h-full object-cover ${i === ang ? 'opacity-100' : 'opacity-0'}`}
            />
          ))}
          <span className="absolute left-2.5 top-2.5 md:left-3 md:top-3 bg-white/85 text-[#0a0a0a] text-[10px] font-semibold uppercase tracking-[0.1em] px-2 py-1 rounded-[6px]">
            {ANGULO_LABEL[look.angulos[ang]]}
          </span>
          <span className="hidden md:flex absolute right-3 top-3 items-center gap-1 text-[10px] uppercase tracking-[0.06em] text-[#0a0a0a]/55">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5" aria-hidden>
              <path d="M2 8h12M4.5 5.5 2 8l2.5 2.5M11.5 5.5 14 8l-2.5 2.5" />
            </svg>
            Girar
          </span>
          <div className="absolute left-2.5 right-2.5 bottom-2 md:left-3 md:right-3 md:bottom-3 flex gap-1">
            {look.angulos.map((a, i) => (
              <button
                key={a}
                type="button"
                onClick={() => setAng(i)}
                aria-label={ANGULO_LABEL[a]}
                aria-pressed={i === ang}
                className="flex-1 h-6 flex items-end pb-1.5"
              >
                <span className={`block w-full h-[2px] transition-colors ${i === ang ? 'bg-[#0a0a0a]' : 'bg-[#0a0a0a]/20'}`} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.15em] text-text-light">
              Look <span className="tabular-nums">{String(numero).padStart(2, '0')}</span> · {look.modelo === 'ella' ? 'Ella' : 'Él'}
            </p>
            <h3 className="text-[17px] md:text-[22px] font-semibold tracking-[-0.01em] leading-tight mt-1">{titulo(piezas)}</h3>
          </div>
        </div>

        <ul className="mt-3 md:mt-5 border-t border-border">
          {piezas.map((p) => {
            const contenido = (
              <>
                <img
                  src={p.image}
                  alt=""
                  width={64}
                  height={64}
                  loading="lazy"
                  decoding="async"
                  className={`hidden md:block w-16 h-16 object-cover bg-bg-alt ${p.agotado ? 'opacity-45 grayscale' : ''}`}
                />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-text-light">
                    {p.category}
                    {p.pendiente && <span className="ml-1.5 normal-case tracking-normal text-foreground/50">· Próximamente</span>}
                  </p>
                  <p className={`text-[13px] md:text-[14px] font-medium leading-tight mt-0.5 underline-offset-[3px] ${p.href && !p.agotado ? 'group-hover:underline' : ''} ${p.agotado ? 'text-text-light' : 'text-foreground'}`}>
                    {p.name}
                  </p>
                  {/* En mobile el precio va abajo del nombre: la columna es angosta. */}
                  <PrecioPieza p={p} formatPrice={formatPrice} className="md:hidden mt-1" />
                </div>
                <div className="hidden md:flex flex-col items-end gap-1 flex-none">
                  <PrecioPieza p={p} formatPrice={formatPrice} />
                  {p.href && !p.agotado && <span className="text-[11px] text-foreground/50">Ver producto →</span>}
                </div>
              </>
            );
            const cls = "grid grid-cols-[minmax(0,1fr)] md:grid-cols-[64px_minmax(0,1fr)_auto] gap-3 md:gap-4 items-center py-3 border-b border-border";
            return (
              <li key={p.slug}>
                {p.href ? (
                  <a href={p.href} className={`${cls} group`}>{contenido}</a>
                ) : (
                  <div className={cls}>{contenido}</div>
                )}
              </li>
            );
          })}
        </ul>

        {sumaLook > 0 && conPrecio.length > 1 && (
          <div className="flex justify-between items-baseline pt-4">
            <span className="text-[12px] text-foreground/60">Look completo</span>
            <span suppressHydrationWarning className="text-[16px] font-semibold tabular-nums">{formatPrice(sumaLook)}</span>
          </div>
        )}
        {hayPendientes && (
          <p className="text-[11px] text-foreground/50 pt-3 leading-snug">Las prendas nuevas de SS27 se suman a la web en el próximo drop.</p>
        )}

        {/* Desktop: los ángulos también como miniaturas, para elegir sin girar. */}
        <div className="hidden md:flex items-end justify-between gap-6 mt-auto pt-8">
        <div className="grid grid-cols-4 gap-1.5 w-full max-w-[380px]">
          {look.angulos.map((a, i) => (
            <button
              key={a}
              type="button"
              onClick={() => setAng(i)}
              onMouseEnter={() => setAng(i)}
              aria-label={`Ver ${ANGULO_LABEL[a].toLowerCase()}`}
              className="text-left group"
            >
              <span className={`block aspect-[3/4] overflow-hidden rounded-[6px] bg-[#ecebe8] border transition-colors ${i === ang ? 'border-foreground' : 'border-transparent'}`}>
                <img src={lookFoto(look, a)} alt="" width={96} height={128} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              </span>
              <span className={`block text-[10px] uppercase tracking-[0.1em] mt-1.5 ${i === ang ? 'text-foreground' : 'text-foreground/45 group-hover:text-foreground/70'}`}>
                {ANGULO_LABEL[a]}
              </span>
            </button>
          ))}
        </div>
          <div className="flex gap-1.5 flex-none items-center">
            <span className="text-[11px] text-foreground/50 mr-1.5 tabular-nums">{numero}/{total}</span>
            <FlechaBtn dir="prev" onClick={onPrev} />
            <FlechaBtn dir="next" onClick={onNext} />
          </div>
        </div>

        <div className="flex md:hidden gap-1.5 mt-auto pt-4">
          <FlechaBtn dir="prev" onClick={onPrev} />
          <FlechaBtn dir="next" onClick={onNext} />
          <span className="text-[11px] text-foreground/50 self-center ml-1 tabular-nums">{numero}/{total}</span>
        </div>
      </div>
    </div>
  );
}

function PrecioPieza({ p, formatPrice, className = '' }: { p: Pieza; formatPrice: (n: number) => string; className?: string }) {
  if (p.pendiente) return null;
  if (p.agotado) return <p className={`text-[12px] text-text-light ${className}`}>Agotado</p>;
  if (!p.price) return null;
  return (
    <p suppressHydrationWarning className={`text-[13px] md:text-[14px] font-semibold tabular-nums ${className}`}>
      {formatPrice(p.price)}
      {p.originalPrice && (
        <span className="ml-1.5 font-normal text-text-light line-through">{formatPrice(p.originalPrice)}</span>
      )}
    </p>
  );
}

function FlechaBtn({ dir, onClick }: { dir: 'prev' | 'next'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 'prev' ? 'Look anterior' : 'Look siguiente'}
      className="w-9 h-9 grid place-items-center border border-border hover:border-foreground transition-colors"
    >
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-3.5 h-3.5" aria-hidden>
        <path d={dir === 'prev' ? 'M10 2 4 8l6 6' : 'm6 2 6 6-6 6'} />
      </svg>
    </button>
  );
}
