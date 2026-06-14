'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Página del producto a la que lleva el botón.
const PRODUCT_URL = '/producto/la-nuestra-jersey-mundial-26';

// Video de fondo del lanzamiento (optimizado a 1080p para web).
const VIDEO_SRC = '/hero/la-nuestra-bg.mp4';
// Imagen del contenedor (analógica de Río, corregida de rotación).
const CARD_IMG = '/hero/la-nuestra-card.jpg';

export default function HeroLaNuestra() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

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
        className="absolute top-6 left-6 md:top-10 md:left-12 z-20 origin-top-left pointer-events-none"
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

      {/* Contenedor que crece con el scroll (solo el botón adentro) */}
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div
          ref={cardRef}
          className="relative w-full max-w-[767px] aspect-[4/5] md:aspect-[990/503]
                     overflow-hidden bg-cover bg-center rounded-[24px]
                     flex items-end justify-center text-center"
          style={{ backgroundImage: `url('${CARD_IMG}')` }}
        >
          {/* oscurecido para contraste */}
          <div className="absolute inset-0 bg-black/25 pointer-events-none" />

          {/* Botón liquid glass (estilo Apple) */}
          <Link
            href={PRODUCT_URL}
            className="group relative mb-10 md:mb-12 overflow-hidden rounded-full px-9 py-4
                       text-white text-[12px] md:text-[13px] font-semibold uppercase tracking-[0.16em]
                       bg-white/15 backdrop-blur-xl border border-white/30
                       shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.4)]
                       transition-all duration-300 hover:bg-white/25 hover:border-white/50"
          >
            <span className="relative z-10">Ver producto</span>
            <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2
                             bg-gradient-to-b from-white/25 to-transparent" />
          </Link>
        </div>
      </div>
    </section>
  );
}
