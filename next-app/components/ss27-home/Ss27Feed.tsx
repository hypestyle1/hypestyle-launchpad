'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import CollectionIndex from '@/components/collection/CollectionIndex';
import { useScrollSpy } from '@/components/collection/useScrollSpy';
import MediaTile, { MediaFill } from './MediaTile';
import { toCardProps, type Ss27Product } from '@/lib/ss27-coleccion';
import { SS27_CATEGORIAS } from '@/lib/ss27-categorias';
import { EDITORIAL_QUALITY, SS27_LOOPS, SS27_MEDIA, SS27_PROXIMAMENTE, SS27_REMERAS_CAROUSEL, SS27_UPCOMING, type Ss27Media, type Ss27Upcoming } from '@/lib/ss27-home';

const COLECCION = '/colecciones/ss27/';

/**
 * Lugares reservados en "Próximamente". Si hay menos prendas comingSoon que
 * esto, los que faltan se completan con una celda "Muy pronto" (sin link).
 */
const PROX_SLOTS = 4;

function Card({ p }: { p: Ss27Product }) {
  const props = toCardProps(p);
  return <ProductCard key={p.slug} {...props} badge={props.badge ?? 'New In'} mutedPrice />;
}

/** Celda chica con un giro 360: mismo alto que una card (foto cuadrada + texto). */
function LoopCell({ m }: { m: Ss27Media }) {
  return (
    <Link href={m.href ?? COLECCION} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-[4px] bg-bg-alt">
        <MediaFill media={m} sizes="25vw" />
      </div>
      <div className="mt-3 px-0.5">
        <p className="text-[13px] leading-tight">{m.title}</p>
        <p className="text-[12px] text-muted-foreground mt-1 underline underline-offset-4 decoration-foreground/30">Ver prenda</p>
      </div>
    </Link>
  );
}

/** Lugar reservado para una prenda de Próximamente que todavía no está cargada. */
function SoonSlot() {
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-[4px] bg-bg-alt flex items-center justify-center">
        <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-black/70 text-white rounded-[6px]">
          Próximamente
        </span>
        <Image src="/STYLE&CULTURE WHITE.png" alt="" width={1778} height={113} className="w-1/2 h-auto invert opacity-15" />
      </div>
      <div className="mt-3 px-0.5">
        <p className="text-[13px] leading-tight">Muy pronto</p>
        <p className="text-[12px] text-muted-foreground mt-1">Spring Summer 27</p>
      </div>
    </div>
  );
}

type Slide = { src: string; alt: string; title?: string; href?: string };

/**
 * Foto grande que pasa sola entre varias (crossfade), con indicadores. Si los
 * slides traen title/href, el texto y el link siguen al slide visible.
 */
function PhotoCarousel({ slides, kicker, title, className = '' }: { slides: Slide[]; kicker: string; title?: string; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (slides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 3200);
    return () => clearInterval(t);
  }, [slides.length]);
  const cur = slides[i];
  return (
    <div className={`relative overflow-hidden rounded-[4px] bg-bg-alt ${className}`}>
      {slides.map((s, k) => (
        <Image
          key={s.src}
          src={s.src}
          alt={s.alt}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          quality={EDITORIAL_QUALITY}
          className="object-cover object-top transition-opacity duration-700"
          style={{ opacity: k === i ? 1 : 0 }}
        />
      ))}
      {cur.href && <Link href={cur.href} aria-label={cur.title ?? cur.alt} className="absolute inset-0 z-[1]" />}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
      <div className="pointer-events-none absolute left-4 bottom-4 md:left-5 md:bottom-5 z-[2] text-white">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/75 mb-1">{kicker}</p>
        <p className="text-[17px] md:text-[20px] font-semibold leading-tight">{cur.title ?? title}</p>
      </div>
      <div className="absolute right-4 bottom-5 md:right-5 z-[2] flex gap-1.5">
        {slides.map((s, k) => (
          <button
            key={s.src}
            aria-label={`Foto ${k + 1}`}
            onClick={() => setI(k)}
            className={`h-[3px] rounded-full transition-all ${k === i ? 'w-6 bg-white' : 'w-3 bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  );
}

/** Prenda que todavía no está cargada en Woo: solo el mockup, sin link ni precio. */
function UpcomingCell({ item }: { item: Ss27Upcoming }) {
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-[4px] bg-bg-alt">
        <Image src={item.src} alt={item.name} fill sizes="(max-width: 1024px) 50vw, 25vw" quality={EDITORIAL_QUALITY} className="object-cover" />
        <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-black/70 text-white rounded-[6px]">
          Próximamente
        </span>
      </div>
      <div className="mt-3 px-0.5">
        <p className="text-[13px] leading-tight uppercase">{item.name}</p>
        <p className="text-[12px] text-muted-foreground mt-1">Muy pronto</p>
      </div>
    </div>
  );
}

/**
 * Banner a sangre de dos mitades (foto + video), como los "For him / For her"
 * de Nude: sin texto encima salvo una etiqueta chica subrayada abajo.
 */
function SplitBanner({ items }: { items: [Ss27Media, Ss27Media] }) {
  return (
    <div className="-mx-4 md:-mx-6 mb-10 md:mb-14 grid grid-cols-2 gap-px bg-white">
      {items.map((m) => (
        <Link key={m.id} href={m.href ?? COLECCION} className="group relative block aspect-[3/4] md:aspect-[4/5] overflow-hidden bg-bg-alt">
          <MediaFill media={m} sizes="50vw" />
          <span className="absolute left-3 bottom-3 md:left-5 md:bottom-5 text-white text-[11px] md:text-[13px] font-semibold uppercase tracking-[0.02em] underline underline-offset-4 [text-shadow:0_1px_10px_rgba(0,0,0,0.4)]">
            {m.title}
          </span>
        </Link>
      ))}
    </div>
  );
}

/* ── Secciones por producto ──────────────────────────────────────────────────
   Remeras → Longsleeves → Hoodies → (resto) → Próximamente. Cada sección:
   título, grilla con una foto/video grande adentro (como EME) y la fila final
   completada con giros 360 de esa misma línea. Entre sección y sección, un
   banner a sangre de dos mitades (como Nude). Lo que no matchee ninguna cae
   en "Accesorios" (hoy, las medias), nunca desaparece. */
type Section = {
  id: string;
  label: string;
  test: (p: Ss27Product) => boolean;
  /** Banner que abre la sección (la primera no lleva: viene pegada al hero). */
  banner?: [Ss27Media, Ss27Media];
  tile?: Ss27Media;
  /** En vez de tile: foto grande que pasa entre varias (una por modelo). */
  carousel?: Slide[];
  loops: string[];
};
const cat = (p: Ss27Product) => `${p.category} ${p.name}`.toLowerCase();
// Las categorías (ids, labels y tests) viven en lib/ss27-categorias para que
// la landing /colecciones/ss27 agrupe exactamente igual. Acá solo se les
// cuelga la media editorial de cada sección del home.
// Orden: de lo más caro a lo más barato de la colección (hoodies primero,
// accesorios al final). Adentro de cada sección, igual: ver byPrice.
const SECTION_MEDIA: Record<string, Pick<Section, 'banner' | 'tile' | 'carousel' | 'loops'>> = {
  hoodies: { tile: SS27_MEDIA.duoVideo, loops: ['l-eagle', 'l-distressed'] },
  remeras: { banner: [SS27_MEDIA.hHype, SS27_MEDIA.piso018], carousel: SS27_REMERAS_CAROUSEL, loops: ['l-018', 'l-hhype'] },
  longsleeves: { banner: [SS27_MEDIA.lsPink, SS27_MEDIA.crossVideo], tile: SS27_MEDIA.waffleBlack, loops: ['l-pink', 'l-blue', 'l-raglan', 'l-waffle'] },
  mas: { loops: [] },
};
const SECTIONS: Section[] = SS27_CATEGORIAS.map((c) => ({
  id: c.id,
  label: c.label,
  test: (p) => c.test(cat(p)),
  loops: [],
  ...SECTION_MEDIA[c.id],
}));
/** Precio de lista (sin la oferta): el orden no cambia cuando se cae el sale. Empate: el orden de Woo. */
const listPrice = (p: Ss27Product) => p.originalPrice ?? p.price;
const byPrice = (items: Ss27Product[]) => items.map((p, i) => ({ p, i })).sort((x, y) => listPrice(y.p) - listPrice(x.p) || x.i - y.i).map((x) => x.p);
const PROX_BANNER: [Ss27Media, Ss27Media] = [SS27_MEDIA.pisoBoxy, SS27_MEDIA.eagleVideo];
const GRID = 'grid grid-cols-2 lg:grid-cols-4 gap-x-2 md:gap-x-3 gap-y-7 lg:gap-y-9 [grid-auto-flow:row_dense]';

export default function Ss27Feed({ products }: { products: Ss27Product[] }) {
  const groups = useMemo(() => {
    const left = products.filter((p) => !p.comingSoon);
    return SECTIONS.map((s) => {
      const items = left.filter(s.test);
      for (const p of items) left.splice(left.indexOf(p), 1);
      return { s, items: byPrice(items) };
    }).filter((g) => g.items.length > 0);
  }, [products]);
  const proximamente = useMemo(() => products.filter((p) => p.comingSoon), [products]);
  const nav = useMemo(
    () => [...groups.map((g) => ({ id: g.s.id, label: g.s.label })), ...(proximamente.length ? [{ id: 'proximamente', label: 'Próximamente' }] : [])],
    [groups, proximamente.length],
  );
  // Índice del título: marca la sección que está en pantalla (ver useScrollSpy;
  // reemplaza al IntersectionObserver que quedaba desincronizado tras un salto
  // por ancla — SS-11).
  const { active, onAnchorClick } = useScrollSpy(nav.map((x) => x.id), 'ss27-');

  if (products.length === 0) return null;
  const proxUpcoming = SS27_UPCOMING.filter((u) => u.section === 'proximamente');

  return (
    <section id="ss27" className="px-4 md:px-6 pt-8 md:pt-10 pb-6 scroll-mt-[var(--offset)]">
      {/* Título + índice, como el "Novedades Hombre / Mujer" de EME. */}
      <CollectionIndex
        title="Spring Summer 27"
        shortTitle="SS27"
        items={nav}
        active={active}
        prefix="ss27-"
        cta={{ href: COLECCION, label: 'Ver todo' }}
        onSelect={onAnchorClick}
      />

      {groups.map(({ s, items }, gi) => {
        const loops = SS27_LOOPS.filter((m) => s.loops.includes(m.id));
        const upcoming = SS27_UPCOMING.filter((u) => u.section === s.id);
        const big = s.tile || s.carousel ? 4 : 0;
        const used = items.length + upcoming.length + big;
        const fill = Math.min((4 - (used % 4)) % 4, loops.length);
        return (
          <div key={s.id} id={`ss27-${s.id}`} className="scroll-mt-[calc(var(--offset)+120px)] mb-12 md:mb-16">
            {gi > 0 && s.banner && <SplitBanner items={s.banner} />}
            <SectionTitle label={s.label} count={items.length + upcoming.length} />
            <div className={GRID}>
              {s.carousel ? (
                <PhotoCarousel
                  slides={s.carousel}
                  kicker={s.label}
                  className={`col-span-2 row-span-1 lg:row-span-2 aspect-[4/5] lg:aspect-auto lg:min-h-full ${gi % 2 ? 'lg:col-start-3' : 'lg:col-start-1'}`}
                />
              ) : s.tile && (
                <MediaTile
                  media={s.tile}
                  className={`col-span-2 row-span-1 lg:row-span-2 aspect-[4/5] lg:aspect-auto lg:min-h-full ${gi % 2 ? 'lg:col-start-3' : 'lg:col-start-1'}`}
                />
              )}
              {items.map((p) => <Card key={p.slug} p={p} />)}
              {upcoming.map((u) => <UpcomingCell key={u.id} item={u} />)}
              {loops.slice(0, fill).map((m) => <LoopCell key={m.id} m={m} />)}
            </div>
          </div>
        );
      })}

      {proximamente.length > 0 && (
        <div id="ss27-proximamente" className="scroll-mt-[calc(var(--offset)+120px)]">
          <SplitBanner items={PROX_BANNER} />
          <SectionTitle label="Próximamente" count={Math.max(PROX_SLOTS, proximamente.length)} />
          {/* Carrusel grande + los lugares de lo que viene (2x2 al costado). */}
          <div className={GRID}>
            <PhotoCarousel slides={SS27_PROXIMAMENTE} kicker="Spring Summer 27" title="Lo que viene" className="col-span-2 row-span-1 lg:row-span-2 aspect-[4/5] lg:aspect-auto lg:min-h-full" />
            {proximamente.map((p) => <Card key={p.slug} p={p} />)}
            {proxUpcoming.map((u) => <UpcomingCell key={u.id} item={u} />)}
            {Array.from({ length: Math.max(0, PROX_SLOTS - proximamente.length - proxUpcoming.length) }, (_, k) => <SoonSlot key={k} />)}
          </div>
        </div>
      )}
    </section>
  );
}

function SectionTitle({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-baseline gap-2 mb-4 md:mb-5">
      <h3 className="text-[20px] md:text-[26px] font-semibold tracking-[-0.03em] leading-none">{label}</h3>
      <span className="text-[12px] md:text-[13px] text-muted-foreground tabular-nums">{count}</span>
    </div>
  );
}
