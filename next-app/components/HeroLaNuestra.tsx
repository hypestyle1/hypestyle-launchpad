'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import MatchWidget from '@/components/MatchWidget';

// Página del producto a la que lleva el botón.
const PRODUCT_URL = '/producto/la-nuestra-jersey-mundial-26';

// Video de fondo del lanzamiento (optimizado a 1080p para web).
const VIDEO_SRC = '/hero/la-nuestra-bg.mp4';
// Slideshow del contenedor: las 5 fotos del shoot Argentina (crossfade).
const CARD_IMGS = [1, 2, 3, 4, 5].map(n => `/hero/la-nuestra-card-${n}.jpg`);
const SLIDE_MS = 4000;

export default function HeroLaNuestra() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);

  // Rotación del slideshow del contenedor (crossfade entre las 5 fotos).
  useEffect(() => {
    const id = setInterval(() => setSlide(s => (s + 1) % CARD_IMGS.length), SLIDE_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const card = cardRef.current;
    const title = titleRef.current;
    if (!section || !card || !title) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Desktop/tablet: el contenedor crece 767→1220 y el título (top-left) se
      // agranda en SINCRO (misma timeline, misma posición 0). Al llegar al máximo,
      // se mantienen un rato (HOLD) antes de despinear.
      mm.add('(min-width: 768px)', () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: '+=210%',
            pin: true,
            scrub: 0.4,
            anticipatePin: 1,
          },
        });
        tl.fromTo(card, { maxWidth: 767 }, { maxWidth: 1220, ease: 'none', duration: 1 }, 0);
        tl.fromTo(title, { scale: 1 }, { scale: 1.5, transformOrigin: 'left top', ease: 'none', duration: 1 }, 0);
        tl.to({}, { duration: 1 }); // hold
      });

      // Mobile: contenedor inset → full-bleed, título escala en sincro, y hold.
      mm.add('(max-width: 767px)', () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: '+=180%',
            pin: true,
            scrub: 0.4,
            anticipatePin: 1,
          },
        });
        tl.fromTo(card, { width: '84vw', borderRadius: 24 }, { width: '100vw', borderRadius: 0, ease: 'none', duration: 1 }, 0);
        tl.fromTo(title, { scale: 1 }, { scale: 1.28, transformOrigin: 'left top', ease: 'none', duration: 1 }, 0);
        tl.to({}, { duration: 0.9 }); // hold
      });
    }, section);

    // Recalcular medidas cuando cambia el alto (carga del video, fuentes, etc.).
    let raf = 0;
    const refresh = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    };
    const ro = new ResizeObserver(refresh);
    ro.observe(document.body);
    window.addEventListener('load', refresh);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('load', refresh);
      ctx.revert();
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative w-full h-[100svh] overflow-hidden bg-bg-dark">
      {/* Video de fondo full-screen */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden
      >
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>

      {/* Velo sutil para legibilidad */}
      <div className="absolute inset-0 bg-black/25 pointer-events-none" />

      {/* Título FUERA del contenedor, top-left — escala con el scroll */}
      <div
        ref={titleRef}
        className="absolute top-[calc(var(--offset)+0.75rem)] left-6 md:left-12 z-20 origin-top-left pointer-events-none"
      >
        <p className="text-white/75 text-[10px] md:text-[12px] uppercase tracking-[0.32em]
                      [text-shadow:0_2px_16px_rgba(0,0,0,0.55)]">
          Mundial 26&apos;
        </p>
        <h1 className="text-white font-bold uppercase leading-[0.92] tracking-tight
                       text-[40px] sm:text-[52px] md:text-[64px]
                       [text-shadow:0_2px_24px_rgba(0,0,0,0.5)]">
          LA NUESTRA
        </h1>
      </div>

      {/* Widget arriba del contenedor + contenedor (slideshow) con el botón adentro */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 md:gap-6 px-4">
        {/* Widget de partido — arriba, sobre el video (no tapa las fotos) */}
        <div className="z-20 w-full flex flex-col items-center gap-2.5">
          <MatchWidget />
          <p className="text-white/85 text-[11px] md:text-[12px] font-medium tracking-[0.03em] text-center
                        max-w-[340px] px-4 [text-shadow:0_2px_12px_rgba(0,0,0,0.65)]">
            Por cada gol que meta Argentina tenés un <span className="font-bold">7% extra</span>
          </p>
        </div>

        {/* Contenedor: slideshow de las 5 fotos del shoot + botón Ver producto */}
        <div
          ref={cardRef}
          className="relative w-full max-w-[767px] aspect-[4/5] md:aspect-[990/503]
                     overflow-hidden rounded-[24px] bg-bg-dark"
        >
          {CARD_IMGS.map((src, i) => (
            <div
              key={src}
              className="absolute inset-0 bg-cover bg-[center_28%] transition-opacity duration-[1200ms] ease-in-out"
              style={{ backgroundImage: `url('${src}')`, opacity: i === slide ? 1 : 0 }}
            />
          ))}

          {/* Degradé inferior solo para que se lea el botón */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent pointer-events-none" />

          {/* Botón Ver producto — adentro, abajo (chico, no tapa el producto) */}
          <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center pb-5 md:pb-6">
            <Link
              href={PRODUCT_URL}
              className="group relative overflow-hidden rounded-full px-8 py-3.5
                         text-white text-[12px] md:text-[13px] font-semibold uppercase tracking-[0.16em]
                         bg-white/15 backdrop-blur-xl border border-white/30
                         shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.4)]
                         transition-all duration-300 hover:bg-white/25 hover:border-white/50"
            >
              <span className="relative z-10">Ver producto</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
