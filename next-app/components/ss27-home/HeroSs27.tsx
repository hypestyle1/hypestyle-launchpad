'use client';

import { useEffect, useRef, useState } from 'react';
import { preload } from 'react-dom';
import Image from 'next/image';
import { gsap } from 'gsap';
import { MediaFill } from './MediaTile';
import { LiquidButton } from '@/components/ui/liquid-glass-button';
import { EDITORIAL_QUALITY, SS27_VIDEOS, type Ss27Media } from '@/lib/ss27-home';

const COLECCION = '/colecciones/ss27';

const ESTUDIO: Ss27Media = { id: 'estudio', kind: 'video', ...SS27_VIDEOS.estudio, alt: 'Spring Summer 27 en estudio' };

/**
 * Hero del drop SS27 (rediseño 13/10, elegido tras el laboratorio):
 * - Desktop: split "Showroom" — el flatlay de la colección completa de un
 *   lado, el film de estudio (vertical, a sangre en media pantalla) del otro,
 *   y la marca + CTA sobre la costura. La sección queda sticky detrás del
 *   contenido: la "cortina blanca" (la sección siguiente pasa por arriba) con
 *   CSS puro, sin GSAP. El hero anterior (card que crece con pin) quedó
 *   archivado en docs/HEROES.md.
 * - Mobile: 50/50 AL AZAR entre el video de estudio aprobado y el flatlay.
 *   El server siempre manda el video (sin mismatch de hidratación) y la mitad
 *   de las visitas cambia al montar.
 * Cada pieza tiene su STYLE&CULTURE con data-intro-target; LoadingScreen toma
 * el que está visible.
 */
export default function HeroSs27() {
  const [mobileFlatlay, setMobileFlatlay] = useState(false);
  useEffect(() => { setMobileFlatlay(Math.random() < 0.5); }, []);
  return (
    <>
      {mobileFlatlay ? <HeroMobileFlatlay /> : <HeroMobile />}
      <HeroDesktopSplit />
    </>
  );
}

/**
 * Flechita de scroll (12/10: "la gente no navegaba"): SCROLL + chevron que
 * rebota, se desvanece al primer scroll y al tocarla baja un viewport.
 */
function ScrollCue() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <button
      onClick={() => window.scrollBy({ top: window.innerHeight * 0.9, behavior: 'smooth' })}
      aria-label="Scroll hacia abajo"
      className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5
                  text-white/85 transition-opacity duration-500 ${scrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <span className="text-[9px] uppercase tracking-[0.22em] font-medium [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]">Scroll</span>
      <svg className="animate-bounce" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.5))' }}>
        <path d="M3 6l5 5 5-5" />
      </svg>
    </button>
  );
}

function Brand({ className = '' }: { className?: string }) {
  return (
    <Image
      src="/STYLE&CULTURE WHITE.png"
      alt="Style & Culture"
      data-intro-target
      width={1778}
      height={113}
      className={`h-auto [filter:drop-shadow(0_2px_16px_rgba(0,0,0,0.55))] ${className}`}
    />
  );
}

/**
 * STYLE&CULTURE que crece con el scroll (13/10): arranca un poco más chico y
 * llega a su tamaño ORIGINAL (scale 1, el de los márgenes) justo cuando la
 * cortina empieza a asomar — el "hold" lo da el spacer (HeroHold) después de
 * la sección sticky: durante ese tramo solo crece el logo, y recién al topear
 * entra el contenido por abajo. Sin GSAP (listener pasivo + rAF);
 * reduced-motion lo apaga.
 *
 * `dist` = fracción del alto de viewport que dura el crecimiento. Tiene que
 * coincidir con el scroll que falta para que la cortina asome: spacer + alto
 * del hero − 100svh.
 */
function BrandScale({ from, dist, origin = 'center', className = '', children }: {
  from: number; dist: number; origin?: string; className?: string; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.transform = 'none';
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const p = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * dist)));
      el.style.transform = `scale(${from + (1 - from) * p})`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [from, dist]);
  return (
    <div ref={ref} className={`will-change-transform ${className}`} style={{ transformOrigin: origin, transform: `scale(${from})` }}>
      {children}
    </div>
  );
}

/** El colchón de scroll que sostiene el "hold" del hero sticky en desktop. */
function HeroHold() {
  return <div className="hidden md:block h-[45svh]" aria-hidden />;
}

function HeroMobile() {
  const boxRef = useRef<HTMLDivElement>(null);

  // El poster del video es lo primero que se ve y el LCP en mobile, pero el
  // navegador no lo descubre solo: el preload scanner lee <img>, no el poster
  // de un <video>. Así se pide desde el <head>, con prioridad alta.
  preload(SS27_VIDEOS.estudio.poster, { as: 'image', fetchPriority: 'high' });

  // Aparición al cargar, como el hero mobile de la tienda.
  useEffect(() => {
    const box = boxRef.current;
    if (!box || !window.matchMedia('(max-width: 767px)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const tw = gsap.fromTo(box, { scale: 0.88, borderRadius: 24 }, { scale: 1, borderRadius: 0, ease: 'power2.out', duration: 0.9, delay: 0.15 });
    return () => { tw.kill(); };
  }, []);

  return (
    // Sin overflow-hidden en la sección: el S&C es sticky y el clip de un
    // ancestro lo anularía (la media se recorta en el box de adentro).
    <section className="md:hidden relative w-full h-[calc(100svh-var(--offset))] min-h-[560px] max-h-[980px] bg-bg-dark text-white">
      <div ref={boxRef} className="absolute inset-0 overflow-hidden">
        <MediaFill media={ESTUDIO} sizes="100vw" priority />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/45" />

        {/* Kicker + botón liquid glass con contorno metálico. Bien arriba del borde: abajo flotan el badge de
            reseñas, el WhatsApp y el botón de accesibilidad. */}
        <div className="absolute inset-x-4 bottom-[168px] flex flex-col items-center text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.04em]">SS27-01 · Ya disponible</p>
          <LiquidButton href={COLECCION} size="xl" onDark metalRim className="mt-4 text-white text-[14px] font-semibold tracking-[0.01em]">
            Ver colección
          </LiquidButton>
        </div>
      </div>

      {/* Marca al centro + bajada en dos puntas — STICKY (pedido 13/10): al
          scrollear sube con la página, se clava justo debajo del navbar y la
          sección siguiente se la lleva al llegar (mismo handoff que el índice
          de colección). CSS puro. */}
      <div className="relative h-full flex flex-col justify-center px-5 pointer-events-none">
        <div className="sticky top-[calc(var(--offset)+10px)] w-full max-w-[88vw] mx-auto">
          <Image
            src="/STYLE&CULTURE WHITE.png"
            alt="Style & Culture"
            data-intro-target
            width={1778}
            height={113}
            priority
            // Ocupa el 88 % del ancho en mobile. Sin sizes, next/image pedía el
            // ancho intrínseco (w=3840) para un logo de ~350 px.
            sizes="88vw"
            className="w-full h-auto [filter:drop-shadow(0_2px_24px_rgba(0,0,0,0.35))]"
          />
          <div className="mt-3 flex justify-between text-[13px] font-semibold tracking-[-0.01em] [text-shadow:0_1px_12px_rgba(0,0,0,0.35)]">
            <span>Part 01</span>
            <span>Spring Summer 27</span>
          </div>
        </div>
      </div>

      {/* Flechita de scroll (la gente no navegaba): se desvanece al scrollear. */}
      <ScrollCue />
    </section>
  );
}

/* ── Mobile · flatlay ──────────────────────────────────────────────────────────
   El flatlay de la colección a pantalla completa con la anatomía del hero
   mobile aprobado (STYLE&CULTURE al centro + CTA liquid abajo), sin video. */
function HeroMobileFlatlay() {
  return (
    // Sin overflow-hidden: el S&C sticky lo necesita (ver HeroMobile).
    <section className="md:hidden relative w-full h-[calc(100svh-var(--offset))] min-h-[560px] max-h-[980px] bg-bg-dark text-white">
      <div className="absolute inset-0 overflow-hidden">
        {/* En mobile el flatlay va a sangre (cover): el contain dejaba bandas
            arriba y abajo. La foto completa queda para el split de desktop. */}
        <Image
          src="/ss27/coleccion/hero-flatlay-hd.webp"
          alt="Spring Summer 27 Part 01 completa, vista desde arriba"
          fill
          priority
          sizes="100vw"
          quality={EDITORIAL_QUALITY}
          className="object-cover object-center"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-black/10 to-black/50" />
      </div>
      {/* Marca sticky: crece hasta su tamaño original, se clava bajo el navbar
          y la sección siguiente se la lleva (handoff). */}
      <div className="relative h-full flex flex-col justify-center px-5 pointer-events-none">
        <div className="sticky top-[calc(var(--offset)+10px)] w-full max-w-[88vw] mx-auto">
          <BrandScale from={0.68} dist={0.35}>
            <Brand className="w-full" />
          </BrandScale>
          <div className="mt-3 flex justify-between text-[13px] font-semibold tracking-[-0.01em] [text-shadow:0_1px_12px_rgba(0,0,0,0.35)]">
            <span>Part 01</span>
            <span>Spring Summer 27</span>
          </div>
        </div>
      </div>
      <div className="absolute inset-x-4 bottom-[168px] flex flex-col items-center text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em]">SS27-01 · Ya disponible</p>
        <LiquidButton href={COLECCION} size="xl" onDark metalRim className="mt-4 text-white text-[14px] font-semibold tracking-[0.01em]">
          Ver colección
        </LiquidButton>
      </div>
      <ScrollCue />
    </section>
  );
}

/* ── Desktop · split "Showroom" ────────────────────────────────────────────────
   La sección queda STICKY detrás del contenido: la "cortina blanca" (la
   sección siguiente, z-10 bg-white en page.tsx, pasa por arriba) con CSS puro.
   El z-0 encierra el stacking de los CTAs para que no floten sobre la cortina. */
function HeroDesktopSplit() {
  // El video se monta solo en desktop: en mobile esta sección está oculta y
  // no tiene que bajar nada (mismo patrón que el hero anterior). El flatlay
  // queda sin gate: en desktop es el LCP y conviene que salga en el HTML.
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => setDesktop(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return (
    <>
    <section className="hidden md:block md:sticky md:top-0 z-0 relative w-full h-[100svh] min-h-[560px] -mt-[var(--offset)] overflow-hidden bg-bg-dark">
      {/* Split: la presentación de la colección (flatlay) de un lado y el film
          de estudio —que es vertical, entra a sangre en media pantalla— del
          otro. La marca y el CTA sobre la costura, como en el split de los
          creativos. */}
      <div className="absolute inset-0 grid grid-cols-2 gap-px bg-bg-dark">
        <div className="relative overflow-hidden">
          <Image
            src="/ss27/coleccion/hero-flatlay-hd.webp"
            alt="Spring Summer 27 Part 01 completa, vista desde arriba"
            fill
            priority
            sizes="50vw"
            quality={EDITORIAL_QUALITY}
            className="object-cover object-center"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/45" />
        </div>
        <div className="relative overflow-hidden">
          {desktop && <MediaFill media={ESTUDIO} sizes="50vw" priority />}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/45" />
        </div>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-8">
        <div className="w-full max-w-[560px]">
          <BrandScale from={0.62} dist={0.45}>
            <Brand className="w-full" />
          </BrandScale>
          <div className="mt-3 flex justify-between text-white text-[13px] font-semibold tracking-[-0.01em] [text-shadow:0_1px_12px_rgba(0,0,0,0.4)]">
            <span>Part 01</span>
            <span>Spring Summer 27</span>
          </div>
        </div>
        <div className="pointer-events-auto mt-8 flex flex-col items-center">
          <p className="mb-3 text-white text-[11px] font-semibold uppercase tracking-[0.04em] [text-shadow:0_1px_10px_rgba(0,0,0,0.4)]">
            SS27-01 · Ya disponible
          </p>
          <LiquidButton href={COLECCION} size="xl" onDark metalRim className="text-white text-[14px] font-semibold tracking-[0.01em]">
            Ver colección
          </LiquidButton>
        </div>
      </div>
      <ScrollCue />
    </section>
    <HeroHold />
    </>
  );
}
