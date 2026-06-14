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

  useEffect(() => {
    const section = sectionRef.current;
    const card = cardRef.current;
    if (!section || !card) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Desktop/tablet: el contenedor crece de 767px → 1220px mientras el hero
      // queda pineado. Recién al completar, se despinea y sigue el scroll.
      mm.add('(min-width: 768px)', () => {
        gsap.fromTo(
          card,
          { maxWidth: 767 },
          {
            maxWidth: 1220,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: '+=110%',
              pin: true,
              scrub: 0.4,
              anticipatePin: 1,
            },
          }
        );
      });

      // Mobile: el contenedor crece de inset (con márgenes y bordes) a full-bleed.
      mm.add('(max-width: 767px)', () => {
        gsap.fromTo(
          card,
          { width: '84vw', borderRadius: 24 },
          {
            width: '100vw',
            borderRadius: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: '+=90%',
              pin: true,
              scrub: 0.4,
              anticipatePin: 1,
            },
          }
        );
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

      {/* Velo sutil para legibilidad del contenido */}
      <div className="absolute inset-0 bg-black/25 pointer-events-none" />

      {/* Contenedor que crece con el scroll */}
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div
          ref={cardRef}
          className="relative w-full max-w-[767px] aspect-[4/5] md:aspect-[990/503]
                     overflow-hidden bg-cover bg-center rounded-[24px]
                     flex flex-col items-center justify-center text-center"
          style={{ backgroundImage: `url('${CARD_IMG}')` }}
        >
          {/* oscurecido para contraste del texto sobre el cielo claro */}
          <div className="absolute inset-0 bg-black/30 pointer-events-none" />

          <div className="relative flex flex-col items-center gap-7 px-6">
            <div className="flex flex-col items-center gap-2.5">
              <p className="text-white/75 text-[11px] md:text-[13px] uppercase tracking-[0.32em]
                            [text-shadow:0_2px_16px_rgba(0,0,0,0.5)]">
                Mundial 26&apos;
              </p>
              <h1 className="text-white font-bold uppercase leading-[0.95] tracking-tight
                             text-[44px] sm:text-[64px] md:text-[88px]
                             [text-shadow:0_2px_24px_rgba(0,0,0,0.45)]">
                LA NUESTRA
              </h1>
            </div>
            {/* Botón liquid glass (estilo Apple): vidrio esmerilado + borde sutil + redondeado */}
            <Link
              href={PRODUCT_URL}
              className="group relative overflow-hidden rounded-full px-9 py-4
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
      </div>
    </section>
  );
}
