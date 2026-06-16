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

const BTN_CLASS =
  'group relative overflow-hidden rounded-full px-8 py-3.5 text-white text-[12px] md:text-[13px] ' +
  'font-semibold uppercase tracking-[0.16em] bg-white/15 backdrop-blur-xl border border-white/30 ' +
  'shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.4)] ' +
  'transition-all duration-300 hover:bg-white/25 hover:border-white/50';

export default function HeroLaNuestra() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);

  // Rotación del slideshow del contenedor (crossfade entre las 5 fotos).
  useEffect(() => {
    const id = setInterval(() => setSlide(s => (s + 1) % CARD_IMGS.length), SLIDE_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const card = cardRef.current;
    if (!section || !card) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Desktop/tablet: el contenedor crece 767→1220 mientras el hero queda pineado,
      // se mantiene un rato (HOLD) y recién ahí se despinea.
      mm.add('(min-width: 768px)', () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: section, start: 'top top', end: '+=200%', pin: true, scrub: 0.4, anticipatePin: 1 },
        });
        tl.fromTo(card, { maxWidth: 767 }, { maxWidth: 1220, ease: 'none', duration: 1 }, 0);
        tl.to({}, { duration: 1 }); // hold
      });

      // Mobile: contenedor inset → full-bleed, y hold.
      mm.add('(max-width: 767px)', () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: section, start: 'top top', end: '+=160%', pin: true, scrub: 0.4, anticipatePin: 1 },
        });
        tl.fromTo(card, { width: '88vw', borderRadius: 24 }, { width: '100vw', borderRadius: 0, ease: 'none', duration: 1 }, 0);
        tl.to({}, { duration: 0.8 }); // hold
      });
    }, section);

    let raf = 0;
    const refresh = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => ScrollTrigger.refresh()); };
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
    // -mt-[var(--offset)] sube el hero bajo el navbar → full-screen real y el pin arranca en el primer contacto.
    <section ref={sectionRef} className="relative w-full h-[100svh] -mt-[var(--offset)] overflow-hidden bg-bg-dark">
      {/* Video de fondo full-screen */}
      <video className="absolute inset-0 w-full h-full object-cover" autoPlay loop muted playsInline aria-hidden>
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>

      {/* Velo: oscurece arriba (título) y abajo (socket), deja ver la foto en el medio */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/15 to-black/55 pointer-events-none" />

      {/* Contenedor (slideshow) centrado — crece con el scroll */}
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div
          ref={cardRef}
          className="relative w-full max-w-[767px] aspect-[4/5] md:aspect-[990/503] overflow-hidden rounded-[24px] bg-bg-dark"
        >
          {CARD_IMGS.map((src, i) => (
            <div
              key={src}
              className="absolute inset-0 bg-cover bg-[center_22%] transition-opacity duration-[1200ms] ease-in-out"
              style={{ backgroundImage: `url('${src}')`, opacity: i === slide ? 1 : 0 }}
            />
          ))}
        </div>
      </div>

      {/* Columna top-left: título + (desktop) widget + botón */}
      <div className="absolute top-[calc(var(--offset)+0.75rem)] left-6 md:left-12 z-20 max-w-[88vw] md:max-w-[440px]">
        <p className="text-white/75 text-[10px] md:text-[12px] uppercase tracking-[0.32em] [text-shadow:0_2px_16px_rgba(0,0,0,0.6)]">
          Mundial 26&apos;
        </p>
        <h1 className="text-white font-bold uppercase leading-[0.92] tracking-tight
                       text-[40px] sm:text-[52px] md:text-[64px] [text-shadow:0_2px_24px_rgba(0,0,0,0.55)]">
          LA NUESTRA
        </h1>

        {/* Desktop: widget del countdown debajo del título */}
        <div className="hidden md:flex flex-col items-start gap-2.5 mt-6">
          <MatchWidget />
          <p className="text-white/85 text-[12px] font-medium tracking-[0.02em] max-w-[300px] [text-shadow:0_2px_12px_rgba(0,0,0,0.7)]">
            Por cada gol que meta Argentina tenés un <span className="font-bold">7% extra</span>
          </p>
        </div>

        {/* Botón debajo del título (mobile + desktop) */}
        <Link href={PRODUCT_URL} className={`inline-flex mt-5 md:mt-6 ${BTN_CLASS}`}>
          <span className="relative z-10">Ver producto</span>
        </Link>
      </div>

      {/* Mobile: widget compacto tipo socket en el pie */}
      <div className="md:hidden absolute inset-x-3 bottom-3 z-20 flex flex-col gap-1.5">
        <p className="text-center text-[10px] text-white/85 font-medium [text-shadow:0_2px_10px_rgba(0,0,0,0.7)]">
          Por cada gol de Argentina, <span className="font-bold">7% extra</span>
        </p>
        <MatchWidget compact />
      </div>
    </section>
  );
}
