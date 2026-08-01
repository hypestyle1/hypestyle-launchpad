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

// Sección combinada: Remeras (OGCJM) + Conjunto Gris (Grey HStars) se
// renderizan juntos con una editorial que swappea por scroll, en la posición
// del PRIMERO de los dos labels que aparezca en FW26_GROUPS (respeta el orden
// del array en vez de ir siempre al final).
const SWAP_GROUP_LABELS = new Set<string>(['Remeras', 'Conjunto Gris']);

// Accesorios se muestra en posición fija (justo después de Faith), no sigue
// el orden de FW26_GROUPS como el resto de los grupos.
const ACCESORIOS_LABEL = 'Accesorios';
// Faith Is The Real Hype ya se renderiza aparte con <FaithDrop /> (maneja los
// flags live/blurred/preSale) — si no se excluye acá, FW26_GROUPS lo vuelve a
// mostrar una segunda vez con el loop genérico de grupos.
const FAITH_LABEL = 'Faith Is The Real Hype';
const SWAP_PRODUCT_SLUGS = [
  'only-god-can-judge-me-blanca',
  'only-god-can-judge-me-negra',
  'hoodie-grey-hstars',
  'sweatpant-grey-hstars',
];
const SWAP_SLIDES = [
  { src: '/newin/ogcjm.webp', alt: 'Only God Can Judge Me', title: 'Only God Can Judge Me' },
  { src: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/08/cande-grey-hstars-clean-scaled.jpg', alt: 'Conjunto Grey HStars — Cande', title: 'Conjunto Grey HStars' },
];

const BLACK_DROP_LABEL = 'Black Drop';

const GROUP_EDITORIAL: Record<string, GroupMedia> = {
  'Black Drop': {
    type: 'image',
    src: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/08/RIP_THE_WOO.png',
    alt: 'Black Drop — Shoot For The Stars, Aim For The Moon',
    side: 'left',
  },
  'Half-Zip Polo': { type: 'video', src: '/newin/polo-video-1.mp4', alt: 'Half-Zip Polo — HypeStyle Department FW26', side: 'right' },
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
// reusarlo tanto en la posición fija de Black Drop (primera sección) como en
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
              <video
                className="absolute inset-0 h-full w-full object-cover object-center"
                src={editorial.src}
                poster={editorial.poster}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
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

  // Grupos con al menos un producto disponible (Accesorios se excluye acá porque
  // se renderiza en posición fija, ver más abajo). Remeras/Conjunto Gris SÍ quedan
  // en su posición del array — el loop de render detecta el primero de los dos
  // y ahí mismo mete la sección swap combinada.
  const groups = useMemo(
    () => FW26_GROUPS
      .map(g => ({ label: g.label, items: g.slugs.map(s => bySlug.get(s)).filter(Boolean) as typeof allProducts }))
      .filter(g => g.items.length > 0 && g.label !== ACCESORIOS_LABEL && g.label !== FAITH_LABEL && g.label !== BLACK_DROP_LABEL),
    [bySlug],
  );

  const firstSwapIndex = useMemo(() => groups.findIndex(g => SWAP_GROUP_LABELS.has(g.label)), [groups]);

  // Productos de la sección combinada (OGCJM + Grey HStars), en orden fijo.
  const swapProducts = useMemo(
    () => SWAP_PRODUCT_SLUGS.map(s => bySlug.get(s)).filter(Boolean) as typeof allProducts,
    [bySlug],
  );

  // Accesorios: posición fija entre Faith Is The Real Hype y Stars For Venezuela.
  const accesoriosItems = useMemo(
    () => (FW26_GROUPS.find(g => g.label === ACCESORIOS_LABEL)?.slugs ?? [])
      .map(s => bySlug.get(s)).filter(Boolean) as typeof allProducts,
    [bySlug],
  );

  // Black Drop: primera sección de todas, mismo patrón visual que Camo Drop
  // (grilla 2x2 + banner editorial) pero en posición fija, no en el loop.
  const blackDropItems = useMemo(
    () => (FW26_GROUPS.find(g => g.label === BLACK_DROP_LABEL)?.slugs ?? [])
      .map(s => bySlug.get(s)).filter(Boolean) as typeof allProducts,
    [bySlug],
  );

  const flashActive = isFlashSaleActive();

  // Render de cada tarjeta: durante el flash sale → badge "−50%". Si no,
  // badge "New In" (o el descuento del combo si está en KEEP_DISCOUNT).
  const renderCard = (p: (typeof allProducts)[number]) => (
    <ProductCard
      key={p.slug}
      {...p}
      badge={flashActive ? '−50%' : (KEEP_DISCOUNT.has(p.slug) ? p.badge : 'New In')}
      mutedPrice={!flashActive}
      giftNote={GIFT_NOTES[p.slug]}
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

      {/* ── Black Drop — primera sección, mismo patrón que Camo Drop ────── */}
      <GroupBlock
        label={BLACK_DROP_LABEL}
        items={blackDropItems}
        editorial={GROUP_EDITORIAL[BLACK_DROP_LABEL]}
        revealClass="reveal rd2 !mt-0"
        renderCard={renderCard}
      />

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
        if (SWAP_GROUP_LABELS.has(group.label)) {
          // Sección combinada: se renderiza una sola vez, en la posición del
          // primero de los dos labels (Remeras / Conjunto Gris) que aparezca.
          if (gi !== firstSwapIndex || swapProducts.length === 0) return null;
          return (
            <div key="swap-section" className={`reveal rd${Math.min(gi + 3, 8)} mt-10`}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px]">
                <NewInSwapEditorial slides={SWAP_SLIDES} />
                <div className="grid grid-cols-2 gap-[2px] order-1 lg:order-2">
                  {swapProducts.map(renderCard)}
                </div>
              </div>
            </div>
          );
        }

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
