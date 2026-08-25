'use client';

import { useMemo } from "react";
import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";
import NewInSwapEditorial from "./NewInSwapEditorial";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";
import { FW26_GROUPS } from "@/lib/fw26";
import { isFlashSaleActive } from "@/lib/flash-sale";
import { Skeleton } from "@/components/ui/skeleton";
import FaithDrop from "./FaithDrop";
import GroupLabel from "./GroupLabel";
import { HOME_GRID as GRID, filasCompletas } from "@/lib/home-grid";

// Mismo skeleton que CollectionBanner para mantener consistencia visual.
const SkeletonCard = () => (
  <div className="flex flex-col gap-3">
    <Skeleton className="aspect-square w-full rounded-none bg-bg-alt/60" />
    <div className="mt-3 px-0.5 space-y-2">
      <Skeleton className="h-3 w-1/4 rounded-none bg-bg-alt/60" />
      <Skeleton className="h-4 w-3/4 rounded-none bg-bg-alt/60" />
      <Skeleton className="h-3.5 w-1/3 rounded-none bg-bg-alt/60" />
    </div>
  </div>
);

// En NEW IN todos los productos llevan el badge "New In" y muestran ambos precios
// (sale en rojo + regular tachado). Excepción: estos productos son promos reales
// (ej. combos) y conservan su badge de descuento (−XX%) en lugar del "New In".
const KEEP_DISCOUNT = new Set<string>([
  'camo-full-set-combo',
]);

// Productos con regalo destacado (combos/promos). Vacío por ahora.
const GIFT_NOTES: Record<string, string> = {};

// Accesorios cierra el bloque en posición fija, no sigue el orden de FW26_GROUPS.
const ACCESORIOS_LABEL = 'Accesorios';
// Faith Is The Real Hype ya se renderiza aparte con <FaithDrop /> (maneja los
// flags live/blurred/preSale) — si no se excluye acá, FW26_GROUPS lo vuelve a
// mostrar una segunda vez con el loop genérico de grupos.
const FAITH_LABEL = 'Faith Is The Real Hype';
// Conjuntos: primera sección del bloque, la única con editorial. Hereda la imagen
// que swappea por scroll: Nicki Nicole primero, modelos después.
const CONJUNTOS_LABEL = 'Conjuntos';
const TRACKSUIT_SLIDES = [
  { src: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/08/nicki-nicole-hoodie-grey-hstars-01-scaled.jpg', alt: 'Nicki Nicole con el Hoodie Grey HStars', title: 'Hoodie Grey HStars' },
  { src: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/08/newin-swap-hstars-couple.jpg', alt: 'Conjunto HStars', title: 'Tracksuit HStars' },
];
// Napoli ya no es sección propia (3% del revenue): sus productos viven dentro de
// 'Remeras'. La constante queda porque renderNapoliCard usa el flag de
// lanzamiento para decidir si muestra vidriera o carrito.
const NAPOLI_SLUGS = new Set(['napoli-tee-azul', 'napoli-tee-blanca']);
// Lanzamiento domingo 20hs: hasta esa fecha los productos son vidriera (badge
// "Próximamente", sin talles ni carrito) — a partir de ahí pasan a "New In"
// y se habilita la compra, sin tocar código de nuevo (ver renderNapoliCard).
const NAPOLI_LAUNCH = new Date('2026-08-09T20:00:00-03:00');
const isNapoliLive = () => Date.now() >= NAPOLI_LAUNCH.getTime();

export default function NewInFW26() {
  const { data: allProducts = [], isLoading } = useProducts(0);
  const ref = useReveal([allProducts]);

  const bySlug = useMemo(() => new Map(allProducts.map(p => [p.slug, p])), [allProducts]);

  // Grupos genéricos: los que van en grilla simple, en el orden de FW26_GROUPS.
  // Conjuntos, Faith y Accesorios se excluyen acá porque tienen posición fija.
  const groups = useMemo(
    () => FW26_GROUPS
      .map(g => ({
        label: g.label,
        items: filasCompletas(g.slugs.map(s => bySlug.get(s)).filter(Boolean) as typeof allProducts),
      }))
      .filter(g => g.items.length > 0 && g.label !== ACCESORIOS_LABEL && g.label !== FAITH_LABEL && g.label !== CONJUNTOS_LABEL),
    [bySlug],
  );

  const accesoriosItems = useMemo(
    () => filasCompletas((FW26_GROUPS.find(g => g.label === ACCESORIOS_LABEL)?.slugs ?? [])
      .map(s => bySlug.get(s)).filter(Boolean) as typeof allProducts),
    [bySlug],
  );

  // Conjuntos: 41% del revenue. Los 4 primeros van al split contra la editorial
  // (2x2, que es exactamente el alto de la foto) y el resto sigue en filas de 4.
  const conjuntosItems = useMemo(
    () => filasCompletas((FW26_GROUPS.find(g => g.label === CONJUNTOS_LABEL)?.slugs ?? [])
      .map(s => bySlug.get(s)).filter(Boolean) as typeof allProducts),
    [bySlug],
  );

  const flashActive = isFlashSaleActive();
  const napoliLive = isNapoliLive();

  // Napoli lanza el domingo: hasta entonces es vidriera (sin talles/carrito,
  // sin link a la ficha) con badge "Próximamente"; ese mismo instante pasa a
  // comportarse como cualquier producto New In, sin tocar código de nuevo.
  const renderNapoliCard = (p: (typeof allProducts)[number]) => (
    <ProductCard
      key={p.slug}
      {...p}
      badge={napoliLive ? (p.badge ?? 'New In') : 'Próximamente'}
      mutedPrice={!napoliLive || !p.badge}
      disableLink={!napoliLive}
      sizes={napoliLive ? p.sizes : undefined}
      stock={napoliLive ? p.stock : undefined}
    />
  );

  const renderCard = (p: (typeof allProducts)[number]) => {
    if (NAPOLI_SLUGS.has(p.slug)) return renderNapoliCard(p);
    return (
      <ProductCard
        key={p.slug}
        {...p}
        // Con toda la web en sale, el descuento le gana al "New In": el badge de
        // novedad escondia el porcentaje justo en el bloque mas visto del home.
        badge={flashActive && !KEEP_DISCOUNT.has(p.slug) ? '−50%' : (p.badge ?? 'New In')}
        mutedPrice={!flashActive && !p.badge}
        giftNote={GIFT_NOTES[p.slug]}
      />
    );
  };

  // Mientras cargan los productos, mostramos skeletons (mismo estilo que CollectionBanner).
  if (isLoading) {
    return (
      <section id="new-in-fw26" className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
        <SectionHeader title="New In [FW26]" link="/colecciones/fw26/" linkLabel="Ver más" />
        <div className={GRID}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (groups.length === 0 && conjuntosItems.length === 0) return null;

  return (
    <section id="new-in-fw26" className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
      <div className="reveal rd1">
        <SectionHeader title="New In [FW26]" link="/colecciones/fw26/" linkLabel="Ver más" />
      </div>

      {/* ── Conjuntos — 41% del revenue: primera sección, apenas pasa el hero ── */}
      {conjuntosItems.length > 0 && (
        <div className="reveal rd2">
          <GroupLabel>{CONJUNTOS_LABEL}</GroupLabel>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[2px]">
            <NewInSwapEditorial slides={TRACKSUIT_SLIDES} side="right" />
            <div className="grid grid-cols-2 gap-[2px] order-1 lg:order-1">
              {conjuntosItems.slice(0, 4).map(renderCard)}
            </div>
          </div>
          {conjuntosItems.length > 4 && (
            <div className={`${GRID} mt-[2px]`}>
              {conjuntosItems.slice(4).map(renderCard)}
            </div>
          )}
        </div>
      )}

      {/* ── Faith Is The Real Hype — drop con layout propio ─────────────── */}
      <div className="reveal rd2 mt-12">
        <FaithDrop />
      </div>

      {groups.map((group, gi) => (
        <div key={group.label} className={`reveal rd${Math.min(gi + 3, 8)} mt-12`}>
          <GroupLabel>{group.label}</GroupLabel>
          <div className={GRID}>
            {group.items.map(renderCard)}
          </div>
        </div>
      ))}

      {/* ── Accesorios — cierran el bloque, después de todas las categorías ── */}
      {accesoriosItems.length > 0 && (
        <div className="reveal rd2 mt-12">
          <GroupLabel>{ACCESORIOS_LABEL}</GroupLabel>
          <div className={GRID}>
            {accesoriosItems.map(renderCard)}
          </div>
        </div>
      )}
    </section>
  );
}
