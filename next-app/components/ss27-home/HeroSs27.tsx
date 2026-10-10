'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MediaFill } from './MediaTile';
import { SS27_HERO_SLIDES, SS27_MEDIA, SS27_VIDEOS, type Ss27Media } from '@/lib/ss27-home';

export type HeroVariant = 'film' | 'carrusel' | 'tira';

const SHOP_HREF = '#ss27';

function Cta({ dark = false }: { dark?: boolean }) {
  return (
    <a
      href={SHOP_HREF}
      className={`inline-flex items-center gap-2 h-11 px-6 text-[12px] font-semibold uppercase tracking-[0.14em] rounded-full transition-colors ${
        dark ? 'bg-foreground text-background hover:bg-foreground/85' : 'bg-white text-black hover:bg-white/85'
      }`}
    >
      Comprar el drop
    </a>
  );
}

/* ── 1. FILM ────────────────────────────────────────────────────────────────
   Mobile: el video vertical de estudio a pantalla completa.
   Desktop: tríptico foto | video | foto a sangre. */
function HeroFilm() {
  return (
    <section className="relative h-[calc(100svh-var(--offset))] min-h-[560px] max-h-[980px] overflow-hidden bg-black text-white">
      <div className="absolute inset-0 grid md:grid-cols-3 gap-[2px]">
        <div className="relative hidden md:block">
          <MediaFill media={SS27_MEDIA.lsPink} sizes="33vw" priority />
        </div>
        <div className="relative">
          <MediaFill
            media={{ id: 'estudio', kind: 'video', ...SS27_VIDEOS.estudio, alt: 'Spring Summer 27 en estudio' }}
            sizes="(min-width: 768px) 33vw, 100vw"
          />
        </div>
        <div className="relative hidden md:block">
          <MediaFill media={SS27_MEDIA.eagleElla} sizes="33vw" priority />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 px-5 pb-8 md:pb-12 flex flex-col items-center text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/80">Part 01 · Ya disponible</p>
        <h2 className="mt-2 font-semibold uppercase leading-[0.85] tracking-[-0.03em] text-[12.5vw] md:text-[8vw]">
          Spring Summer 27
        </h2>
        <div className="mt-6 pointer-events-auto">
          <Cta />
        </div>
      </div>
    </section>
  );
}

/* ── 2. CARRUSEL ────────────────────────────────────────────────────────────
   Provisorio con las fotos de estudio. Mobile: una foto por pantalla con
   swipe. Desktop: tres a la vez, avanza solo cada 4 s. Cada foto lleva a su
   ficha. */
function HeroCarrusel() {
  const track = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const paused = useRef(false);
  const n = SS27_HERO_SLIDES.length;

  const go = useCallback((i: number) => {
    const el = track.current;
    if (!el) return;
    const card = el.children[0] as HTMLElement | undefined;
    if (!card) return;
    const step = card.offsetWidth + 2;
    const perView = Math.round(el.clientWidth / step) || 1;
    const max = n - perView;
    const next = i > max ? 0 : i < 0 ? max : i;
    el.scrollTo({ left: next * step, behavior: 'smooth' });
  }, [n]);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => {
      const card = el.children[0] as HTMLElement | undefined;
      if (card) setIdx(Math.round(el.scrollLeft / (card.offsetWidth + 2)));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => { if (!paused.current) go(idx + 1); }, 4000);
    return () => clearInterval(t);
  }, [idx, go]);

  return (
    <section
      className="relative bg-white"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onTouchStart={() => (paused.current = true)}
    >
      <div
        ref={track}
        className="flex gap-[2px] overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SS27_HERO_SLIDES.map((m, i) => (
          <Link
            key={m.id}
            href={m.href ?? SHOP_HREF}
            className="group relative shrink-0 snap-start w-full md:w-[calc((100%-4px)/3)] aspect-[4/5] max-h-[calc(100svh-var(--offset)-64px)] overflow-hidden bg-bg-alt"
          >
            <Image
              src={m.src}
              alt={m.alt}
              fill
              priority={i < 3}
              sizes="(min-width: 768px) 33vw, 100vw"
              className="object-cover transition-transform duration-[1200ms] group-hover:scale-[1.03]"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
            <div className="absolute left-4 bottom-4 text-white">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/75">{m.kicker}</p>
              <p className="text-[16px] font-semibold leading-tight">{m.title}</p>
            </div>
          </Link>
        ))}
      </div>
      <div className="max-w-[1400px] mx-auto px-4 py-5 md:py-7 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Part 01 · Ya disponible</p>
          <h2 className="mt-1 text-[30px] md:text-[56px] font-semibold uppercase leading-[0.9] tracking-[-0.03em]">
            Spring Summer 27
          </h2>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button aria-label="Anterior" onClick={() => go(idx - 1)} className="w-10 h-10 rounded-full border border-border hover:border-foreground transition-colors">←</button>
          <button aria-label="Siguiente" onClick={() => go(idx + 1)} className="w-10 h-10 rounded-full border border-border hover:border-foreground transition-colors">→</button>
          <span className="ml-3"><Cta dark /></span>
        </div>
      </div>
      <div className="md:hidden px-4 pb-6 flex items-center justify-between">
        <div className="flex gap-1.5">
          {SS27_HERO_SLIDES.map((m, i) => (
            <span key={m.id} className={`h-[3px] rounded-full transition-all ${i === idx ? 'w-6 bg-foreground' : 'w-3 bg-foreground/20'}`} />
          ))}
        </div>
        <Cta dark />
      </div>
    </section>
  );
}

/* ── 3. TIRA ────────────────────────────────────────────────────────────────
   Una tira de fotos que corre sola de derecha a izquierda (contact sheet de
   la sesión de estudio) con el nombre del drop gigante encima. */
function HeroTira() {
  const strip: Ss27Media[] = [...SS27_HERO_SLIDES, SS27_MEDIA.pisoBoxy, SS27_MEDIA.crestGrid, SS27_MEDIA.splatter];
  return (
    <section className="relative overflow-hidden bg-white pt-4 md:pt-6">
      <div className="relative">
        <div className="flex w-max gap-[2px] animate-[marquee_60s_linear_infinite] motion-reduce:animate-none hover:[animation-play-state:paused]">
          {[...strip, ...strip].map((m, i) => (
            <Link
              key={`${m.id}-${i}`}
              href={m.href ?? SHOP_HREF}
              aria-hidden={i >= strip.length}
              tabIndex={i >= strip.length ? -1 : undefined}
              className="relative shrink-0 w-[62vw] md:w-[22vw] aspect-[4/5] overflow-hidden bg-bg-alt"
            >
              <Image src={m.src} alt={i >= strip.length ? '' : m.alt} fill priority={i < 4} sizes="(min-width: 768px) 22vw, 62vw" className="object-cover" />
            </Link>
          ))}
        </div>
        <h2 className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-semibold uppercase leading-[0.82] tracking-[-0.04em] text-white mix-blend-difference text-[19vw] md:text-[13vw]">
          SS27
        </h2>
      </div>
      <div className="max-w-[1400px] mx-auto px-4 py-6 md:py-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Spring Summer 27 · Part 01</p>
          <p className="mt-2 text-[15px] md:text-[17px] max-w-md leading-snug">
            Boxy tees, waffles lavados, hoodies gastados y la línea Athletic Dept. Ya disponible para todos.
          </p>
        </div>
        <Cta dark />
      </div>
    </section>
  );
}

export default function HeroSs27({ variant = 'film' }: { variant?: HeroVariant }) {
  if (variant === 'carrusel') return <HeroCarrusel />;
  if (variant === 'tira') return <HeroTira />;
  return <HeroFilm />;
}
