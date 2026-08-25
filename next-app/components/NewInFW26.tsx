'use client';

import { useMemo, type ReactNode } from "react";
import Image from "next/image";
import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";
import EditorialSlider from "./EditorialSlider";
import NewInSwapEditorial from "./NewInSwapEditorial";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";
import { FW26_GROUPS } from "@/lib/fw26";
import { isFlashSaleActive } from "@/lib/flash-sale";
import { Skeleton } from "@/components/ui/skeleton";
import FaithDrop from "./FaithDrop";
import LaNuestraSection from "./LaNuestraSection";
import LazyVideo from "./LazyVideo";

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

// Editorial por grupo (key = label del grupo en FW26_GROUPS).
// El grupo con editorial se renderiza en layout split: productos (máx 4) de un
// lado y la editorial (imagen o video) del otro. `side` = dónde va la editorial.
type SlideItem = { src: string; type?: 'image' | 'video' };
type GroupMedia = {
  type: 'image' | 'video' | 'slider';
  src?: string;          // image / video
  images?: string[];     // slider solo imágenes (legacy)
  slides?: SlideItem[];  // slider mixto imagen+video
  alt: string;
  side: 'left' | 'right';
  poster?: string;
  more?: { href: string }; // botón "Ver más" debajo de la editorial (grupos con +4 productos)
};

// Accesorios se muestra en posición fija (justo después de Faith), no sigue
// el orden de FW26_GROUPS como el resto de los grupos.
const ACCESORIOS_LABEL = 'Accesorios';
// Faith Is The Real Hype ya se renderiza aparte con <FaithDrop /> (maneja los
// flags live/blurred/preSale) — si no se excluye acá, FW26_GROUPS lo vuelve a
// mostrar una segunda vez con el loop genérico de grupos.
const FAITH_LABEL = 'Faith Is The Real Hype';
// Tracksuit HStars: hereda la editorial que swappea por scroll (antes era de
// "OGCJM & HStars Grey"). Dos slides alternados: primero Nicki Nicole con el
// conjunto gris, después las modelos juntas.
const TRACKSUIT_LABEL = 'Tracksuit HStars';
const TRACKSUIT_SLIDES = [
  { src: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/08/nicki-nicole-grey-hstars-set-02-scaled.jpg', alt: 'Nicki Nicole con el conjunto Grey HStars', title: 'Conjunto Grey HStars' },
  { src: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/08/newin-swap-hstars-couple.jpg', alt: 'Conjunto HStars', title: 'Tracksuit HStars' },
];
// Napoli es la novedad del momento — va primero de todo NEW IN, antes incluso
// de Tracksuit HStars (mismo patrón de sección fija, no sigue el orden del loop).
const NAPOLI_LABEL = 'Napoli';
// Lanzamiento domingo 20hs: hasta esa fecha los productos son vidriera (badge
// "Próximamente", sin talles ni carrito) — a partir de ahí pasan a "New In"
// y se habilita la compra, sin tocar código de nuevo (ver renderNapoliCard).
const NAPOLI_LAUNCH = new Date('2026-08-09T20:00:00-03:00');
const isNapoliLive = () => Date.now() >= NAPOLI_LAUNCH.getTime();

const GROUP_EDITORIAL: Record<string, GroupMedia> = {
  'Napoli': {
    type: 'image',
    src: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/08/hero-napoli-DSC03106-scaled.jpg',
    alt: 'Napoli Tee — Honor y Gloria',
    side: 'left',
  },
<<<<<<< HEAD
=======
  'Black Drop': {
    type: 'slider',
    images: [
      'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/08/blackdrop-hoodie-DSC03191-scaled.jpg',
      'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/08/blackdrop-pants-DSC03194-1-scaled.jpg',
      'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/08/blackdrop-fullbody-DSC03189-scaled.jpg',
      'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/08/blackdrop-models-DSC03197-scaled.jpg',
    ],
    alt: 'Black Drop — HypeStyle Stars',
    side: 'left',
  },
>>>>>>> origin/main
  'Half-Zip Polo': { type: 'video', src: '/newin/polo-video-1.mp4', poster: '/newin/polo-video-1-poster.webp', alt: 'Half-Zip Polo — HypeStyle Department FW26', side: 'right' },
  'Pink Set': {
    type: 'slider',
    images: [
      'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/08/pink-set-juani-grey-wall-scaled.jpg',
      'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/08/pink-set-juani-dumpster-scaled.jpg',
      'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/08/pink-set-juani-detail-scaled.jpg',
      'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/08/pink-set-juani-hood-back-scaled.jpg',
    ],
    alt: 'Pink Set FW26 — Juani',
    side: 'left',
  },
  'Camo Drop': {
    type: 'slider',
    images: ['/newin/camo-1.webp', '/newin/camo-2.webp', '/newin/camo-3.webp', '/newin/camo-4.webp'],
    alt: 'Camo Drop FW26',
    side: 'right',
    more: { href: '/colecciones/camo-set-drop/' },
  },
};

// Bloque de grupo con editorial split o grilla simple — extraído para
// reusarlo tanto en las posiciones fijas (Napoli, Accesorios) como en
// el loop genérico de FW26_GROUPS.
function GroupBlock({
  label, items, editorial, revealClass, renderCard,
}: {
  label: string;
  items: ReturnType<typeof useProducts>['data'];
  editorial?: GroupMedia;
  revealClass: string;
  renderCard: (p: NonNullable<ReturnType<typeof useProducts>['data']>[number]) => ReactNode;
}) {
  const list = items ?? [];
  if (list.length === 0) return null;
  return (
    <div className={`${revealClass} mt-10`}>
      <div className="flex items-center gap-4 mb-5">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">{label}</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {editorial ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px]">
          <div className={`relative overflow-hidden rounded-[8px] bg-bg-alt aspect-[3/4] lg:aspect-auto min-h-[320px] order-2 ${editorial.side === 'left' ? 'lg:order-1' : 'lg:order-2'}`}>
            {editorial.type === 'video' ? (
              <LazyVideo
                className="absolute inset-0 h-full w-full object-cover object-center"
                src={editorial.src ?? ''}
                poster={editorial.poster ?? ''}
              />
            ) : editorial.type === 'slider' ? (
              <EditorialSlider slides={editorial.slides} images={editorial.images} alt={editorial.alt} />
            ) : (
              <Image
                src={editorial.src ?? ''}
                alt={editorial.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
              />
            )}
          </div>

          <div className={`flex flex-col gap-[14px] order-1 ${editorial.side === 'left' ? 'lg:order-2' : 'lg:order-1'}`}>
            <div className="grid grid-cols-2 gap-[2px]">
              {list.slice(0, 4).map(renderCard)}
            </div>

            {editorial.more && (
              <a
                href={editorial.more.href}
                style={{
                  background: 'rgba(240, 238, 232, 0.82)',
                  backdropFilter: 'blur(32px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(32px) saturate(200%)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
                }}
                className="self-start inline-flex items-center justify-center rounded-full px-10 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground transition-transform hover:-translate-y-0.5"
              >
                Ver más
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
          {list.map(renderCard)}
        </div>
      )}
    </div>
  );
}

export default function NewInFW26() {
  const { data: allProducts = [], isLoading } = useProducts(0);
  const ref = useReveal([allProducts]);

  const bySlug = useMemo(() => new Map(allProducts.map(p => [p.slug, p])), [allProducts]);

  // Grupos con al menos un producto disponible (Accesorios, Faith, Tracksuit y
  // Napoli se excluyen acá porque se renderizan en posición fija, más abajo).
  const groups = useMemo(
    () => FW26_GROUPS
      .map(g => ({ label: g.label, items: g.slugs.map(s => bySlug.get(s)).filter(Boolean) as typeof allProducts }))
      .filter(g => g.items.length > 0 && g.label !== ACCESORIOS_LABEL && g.label !== FAITH_LABEL && g.label !== TRACKSUIT_LABEL && g.label !== NAPOLI_LABEL),
    [bySlug],
  );

  // Accesorios: posición fija entre Faith Is The Real Hype y Stars For Venezuela.
  const accesoriosItems = useMemo(
    () => (FW26_GROUPS.find(g => g.label === ACCESORIOS_LABEL)?.slugs ?? [])
      .map(s => bySlug.get(s)).filter(Boolean) as typeof allProducts,
    [bySlug],
  );

  // Tracksuit HStars: posición fija (segunda sección), con la editorial que
  // swappea por scroll en vez del slider automático.
  const tracksuitItems = useMemo(
    () => (FW26_GROUPS.find(g => g.label === TRACKSUIT_LABEL)?.slugs ?? [])
      .map(s => bySlug.get(s)).filter(Boolean) as typeof allProducts,
    [bySlug],
  );

  // Napoli: la novedad, primera sección de todas — posición fija, no en el loop.
  const napoliItems = useMemo(
    () => (FW26_GROUPS.find(g => g.label === NAPOLI_LABEL)?.slugs ?? [])
      .map(s => bySlug.get(s)).filter(Boolean) as typeof allProducts,
    [bySlug],
  );

  const flashActive = isFlashSaleActive();
  const napoliLive = isNapoliLive();

  // Render de cada tarjeta: durante el flash sale → badge "−50%". Si no,
  // badge "New In" (o el descuento del combo si está en KEEP_DISCOUNT).
  const renderCard = (p: (typeof allProducts)[number]) => (
    <ProductCard
      key={p.slug}
      {...p}
      // Con toda la web en sale, el descuento le gana al "New In": el badge de
      // novedad escondia el porcentaje justo en el bloque mas visto del home.
      badge={flashActive ? '−50%' : (p.badge ?? 'New In')}
      mutedPrice={!flashActive && !p.badge}
      giftNote={GIFT_NOTES[p.slug]}
    />
  );

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

  // Mientras cargan los productos, mostramos skeletons (mismo estilo que CollectionBanner).
  if (isLoading) {
    return (
      <section id="new-in-fw26" className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
        <SectionHeader title="New In [FW26]" link="/colecciones/fw26/" linkLabel="Ver más" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (groups.length === 0) return null;

  return (
    <section id="new-in-fw26" className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
      <div className="reveal rd1">
        <SectionHeader title="New In [FW26]" link="/colecciones/fw26/" linkLabel="Ver más" />
      </div>

      {/* ── Napoli — la novedad, primera sección de todas ────────────────── */}
      <GroupBlock
        label={NAPOLI_LABEL}
        items={napoliItems}
        editorial={GROUP_EDITORIAL[NAPOLI_LABEL]}
        revealClass="reveal rd2 !mt-0"
        renderCard={renderNapoliCard}
      />

      {/* ── Tracksuit HStars — conjuntos negro y gris, editorial con swap ── */}
      {tracksuitItems.length > 0 && (
        <div className="reveal rd2 mt-10">
          <div className="flex items-center gap-4 mb-5">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">{TRACKSUIT_LABEL}</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px]">
            <NewInSwapEditorial slides={TRACKSUIT_SLIDES} />
            <div className="grid grid-cols-2 gap-[2px] order-1 lg:order-2">
              {tracksuitItems.map(renderCard)}
            </div>
          </div>
        </div>
      )}

      {/* ── Faith Is The Real Hype — nuevo drop domingo ────────────────── */}
      <div className="reveal rd2 mt-10">
        <FaithDrop />
      </div>

      {/* ── La Nuestra — Jersey Mundial 26' ─────────────────────────────── */}
      <div className="reveal rd2">
        <LaNuestraSection />
      </div>

      {/* ── Accesorios — posición fija después de La Nuestra ────────────── */}
      {accesoriosItems.length > 0 && (
        <div className="reveal rd2 mt-10">
          <div className="flex items-center gap-4 mb-5">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">{ACCESORIOS_LABEL}</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
            {accesoriosItems.map(renderCard)}
          </div>
        </div>
      )}

      {groups.map((group, gi) => {
        return (
          <GroupBlock
            key={group.label}
            label={group.label}
            items={group.items}
            editorial={GROUP_EDITORIAL[group.label]}
            revealClass={`reveal rd${Math.min(gi + 3, 8)}`}
            renderCard={renderCard}
          />
        );
      })}
    </section>
  );
}
