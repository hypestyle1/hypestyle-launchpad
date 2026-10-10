'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import MediaTile, { MediaFill } from './MediaTile';
import { toCardProps, type Ss27Product } from '@/lib/ss27-coleccion';
import { SS27_LOOPS, SS27_MEDIA, SS27_PROXIMAMENTE, interleave, splitChapters, type Ss27Media } from '@/lib/ss27-home';

export type FeedVariant = 'grilla' | 'capitulos' | 'split';

const COLECCION = '/colecciones/ss27/';

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

/**
 * Las prendas "Próximamente" no van sueltas en la grilla: todas juntas en la
 * última celda, con sus fotos pasando solas. Sin link ni talles (todavía no
 * se venden); el texto lista los nombres.
 */
function ProximamenteCell({ items }: { items: Ss27Product[] }) {
  const slides = SS27_PROXIMAMENTE;
  const [i, setI] = useState(0);
  useEffect(() => {
    if (slides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 2800);
    return () => clearInterval(t);
  }, [slides.length]);
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-[4px] bg-bg-alt">
        {slides.map((s, k) => (
          <Image
            key={s.src}
            src={s.src}
            alt={s.alt}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover object-top transition-opacity duration-700"
            style={{ opacity: k === i ? 1 : 0 }}
          />
        ))}
        <span className="absolute top-3 left-3 z-10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-black/70 backdrop-blur-md text-white rounded-[6px]">
          Próximamente
        </span>
        <div className="absolute bottom-3 left-3 z-10 flex gap-1">
          {slides.map((s, k) => (
            <span key={s.src} className={`h-[3px] rounded-full transition-all ${k === i ? 'w-5 bg-white' : 'w-2.5 bg-white/50'}`} />
          ))}
        </div>
      </div>
      <div className="mt-3 px-0.5">
        <p className="text-[13px] leading-tight">{items.length > 1 ? `${items.length} prendas más` : items[0]?.name}</p>
        <p className="text-[12px] text-muted-foreground mt-1 leading-snug">
          {items.length > 1 ? items.map((p) => p.name).join(' · ') : 'Muy pronto'}
        </p>
      </div>
    </div>
  );
}

function Header({ count }: { count: number }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5 md:mb-7">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">New in · {count} prendas</p>
        <h2 className="mt-1 text-[26px] md:text-[40px] font-semibold tracking-[-0.02em] leading-none">Spring Summer 27</h2>
      </div>
      <Link href={COLECCION} className="shrink-0 text-[12px] underline underline-offset-4 decoration-foreground/40 hover:decoration-foreground">
        Ver todo
      </Link>
    </div>
  );
}

/* ── A. GRILLA VIVA ───────────────────────────────────────────────────────────
   Toda la colección en una sola grilla (2 col mobile / 4 desktop), con una
   foto o video grande cada 6 prendas, alternando lado. Filtros por tipo
   arriba. Las celdas que sobran al final se completan con giros 360. */
const FILTERS: { id: string; label: string; test: (c: string) => boolean }[] = [
  { id: 'todo', label: 'Todo', test: () => true },
  { id: 'tees', label: 'Remeras', test: (c) => c === 'Tee' || c === 'Polo' },
  { id: 'ls', label: 'Longsleeves', test: (c) => c === 'Longsleeve' },
  { id: 'hoodies', label: 'Hoodies', test: (c) => c === 'Hoodie' },
];
const GRID_INSERTS = [SS27_MEDIA.duoVideo, SS27_MEDIA.pisoBoxy, SS27_MEDIA.eagleVideo, SS27_MEDIA.crestGrid, SS27_MEDIA.crossVideo, SS27_MEDIA.waffleBlack];
const EVERY = 6;

function Grilla({ products }: { products: Ss27Product[] }) {
  const [filter, setFilter] = useState('todo');
  const ordered = useMemo(() => interleave(products.filter((p) => !p.comingSoon)), [products]);
  const proximamente = useMemo(() => products.filter((p) => p.comingSoon), [products]);
  const f = FILTERS.find((x) => x.id === filter)!;
  const list = ordered.filter((p) => f.test(p.category));
  const withMedia = filter === 'todo';
  // La celda Próximamente cierra la grilla; los giros 360 completan la fila antes.
  const prox = withMedia && proximamente.length > 0 ? 1 : 0;
  const fill = withMedia ? (4 - ((list.length + prox) % 4)) % 4 : 0;

  return (
    <>
      <div className="sticky top-[var(--offset)] z-20 -mx-4 px-4 py-2.5 mb-3 bg-white/90 backdrop-blur-md flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {FILTERS.filter((x) => x.id === 'todo' || products.some((p) => x.test(p.category))).map((x) => (
          <button
            key={x.id}
            onClick={() => setFilter(x.id)}
            className={`shrink-0 h-8 px-4 rounded-full text-[12px] border transition-colors ${
              filter === x.id ? 'bg-foreground text-background border-foreground' : 'border-border hover:border-foreground'
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-[2px] gap-y-6 lg:gap-y-8 [grid-auto-flow:row_dense]">
        {list.map((p, i) => {
          const k = Math.floor(i / EVERY);
          const media = withMedia && i > 0 && i % EVERY === 0 ? GRID_INSERTS[(k - 1) % GRID_INSERTS.length] : null;
          return (
            <Fragment key={p.slug}>
              {media && (
                <MediaTile
                  media={media}
                  className={`col-span-2 row-span-1 lg:row-span-2 aspect-[4/5] lg:aspect-auto lg:min-h-full ${k % 2 ? 'lg:col-start-1' : 'lg:col-start-3'}`}
                />
              )}
              <Card p={p} />
            </Fragment>
          );
        })}
        {SS27_LOOPS.slice(0, fill).map((m) => <LoopCell key={m.id} m={m} />)}
        {prox > 0 && <ProximamenteCell items={proximamente} />}
      </div>
    </>
  );
}

/* ── B. CAPÍTULOS ─────────────────────────────────────────────────────────────
   La colección partida por línea. Cada capítulo: número y título grandes,
   y una tira horizontal que arranca con la foto/video de la línea y sigue con
   las prendas. En mobile se pasa con el dedo; en desktop con flechas. */
function Rail({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const by = (d: number) => ref.current?.scrollBy({ left: d * (ref.current.clientWidth * 0.75), behavior: 'smooth' });
  return (
    <div className="relative">
      <div ref={ref} className="flex gap-[2px] overflow-x-auto snap-x snap-mandatory -mx-4 px-4 scroll-px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
      <div className="hidden md:flex absolute -top-14 right-0 gap-2">
        <button aria-label="Anterior" onClick={() => by(-1)} className="w-10 h-10 rounded-full border border-border hover:border-foreground bg-white">←</button>
        <button aria-label="Siguiente" onClick={() => by(1)} className="w-10 h-10 rounded-full border border-border hover:border-foreground bg-white">→</button>
      </div>
    </div>
  );
}

function Capitulos({ products }: { products: Ss27Product[] }) {
  const chapters = useMemo(() => splitChapters(products), [products]);
  return (
    <div className="space-y-14 md:space-y-20">
      {chapters.map(({ chapter, items }, ci) => (
        <div key={chapter.id}>
          <div className="flex items-baseline gap-3 md:gap-5 mb-4 md:mb-6 border-b border-foreground pb-3">
            <span className="text-[13px] md:text-[15px] tabular-nums text-muted-foreground">{String(ci + 1).padStart(2, '0')}</span>
            <h3 className="text-[34px] md:text-[72px] font-semibold uppercase tracking-[-0.035em] leading-[0.85]">{chapter.title}</h3>
            <span className="ml-auto hidden md:block text-[13px] text-muted-foreground max-w-[260px] text-right mr-28">{chapter.line}</span>
          </div>
          <Rail>
            <MediaTile media={chapter.cover} className="shrink-0 snap-start w-[78vw] md:w-[38vw] lg:w-[30vw] aspect-[4/5]" />
            {items.map((p, i) => (
              <Fragment key={p.slug}>
                <div className="shrink-0 snap-start w-[46vw] md:w-[24vw] lg:w-[19vw]">
                  <Card p={p} />
                </div>
                {/* Una foto/video de la línea cada dos prendas. */}
                {i % 2 === 1 && chapter.inserts[(i - 1) / 2] && (
                  <MediaTile media={chapter.inserts[(i - 1) / 2]} className="shrink-0 snap-start w-[62vw] md:w-[28vw] lg:w-[22vw] aspect-[4/5]" />
                )}
              </Fragment>
            ))}
          </Rail>
          <p className="md:hidden mt-3 text-[12px] text-muted-foreground">{chapter.line}</p>
        </div>
      ))}
    </div>
  );
}

/* ── C. SPLIT EDITORIAL ───────────────────────────────────────────────────────
   Por capítulo: media mitad foto/video y mitad 4 prendas (2x2), alternando
   el lado en cada capítulo. Lo que sobra de 4 sigue abajo en filas de 4. */
function Split({ products }: { products: Ss27Product[] }) {
  const chapters = useMemo(() => splitChapters(products), [products]);
  return (
    <div className="space-y-12 md:space-y-16">
      {chapters.map(({ chapter, items }, ci) => {
        const first = items.slice(0, 4);
        const rest = items.slice(4);
        const right = ci % 2 === 1;
        return (
          <div key={chapter.id}>
            <div className="flex items-baseline justify-between border-b border-border pb-2 mb-[2px]">
              <h3 className="text-[15px] md:text-[17px] font-semibold">{chapter.title}</h3>
              <span className="text-[12px] text-muted-foreground hidden sm:block">{chapter.line}</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[2px]">
              <MediaTile
                media={chapter.cover}
                caption="none"
                className={`aspect-[4/5] lg:aspect-auto lg:min-h-[560px] ${right ? 'lg:order-2' : ''}`}
              />
              <div className="grid grid-cols-2 gap-x-[2px] gap-y-6 content-start">
                {first.map((p) => <Card key={p.slug} p={p} />)}
              </div>
            </div>
            {rest.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-[2px] gap-y-6 mt-6">
                {rest.map((p) => <Card key={p.slug} p={p} />)}
                {chapter.inserts.slice(0, (4 - (rest.length % 4)) % 4 >= 2 ? 1 : 0).map((m) => (
                  <MediaTile key={m.id} media={m} className="col-span-2 aspect-[4/5] lg:aspect-auto" />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Ss27Feed({ products, variant = 'grilla' }: { products: Ss27Product[]; variant?: FeedVariant }) {
  if (products.length === 0) return null;
  const forSale = products.filter((p) => !p.comingSoon).length;
  return (
    <section id="ss27" className="max-w-[1400px] mx-auto px-4 pt-10 md:pt-14 pb-6 scroll-mt-[var(--offset)]">
      <Header count={forSale} />
      {variant === 'capitulos' ? <Capitulos products={products} /> : variant === 'split' ? <Split products={products} /> : <Grilla products={products} />}
    </section>
  );
}
