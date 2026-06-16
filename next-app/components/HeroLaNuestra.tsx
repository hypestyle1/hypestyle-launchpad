'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import MatchWidget from '@/components/MatchWidget';

const PRODUCT_URL = '/producto/la-nuestra-jersey-mundial-26';
const VIDEO_SRC = '/hero/la-nuestra-bg.mp4';
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
  const titleRef = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);

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

      // Desktop: contenedor crece 767→1220 y el título escala en sincro; luego HOLD.
      mm.add('(min-width: 768px)', () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: section, start: 'top top', end: '+=200%', pin: true, scrub: 0.4, anticipatePin: 1 },
        });
        tl.fromTo(card, { maxWidth: 767 }, { maxWidth: 1220, ease: 'none', duration: 1 }, 0);
        tl.fromTo(title, { scale: 1 }, { scale: 1.5, transformOrigin: 'left top', ease: 'none', duration: 1 }, 0);
        tl.to({}, { duration: 1 });
      });

      // Mobile: contenedor inset → full-bleed, título escala en sincro; HOLD.
      mm.add('(max-width: 767px)', () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: section, start: 'top top', end: '+=160%', pin: true, scrub: 0.4, anticipatePin: 1 },
        });
        tl.fromTo(card, { width: '88vw', borderRadius: 24 }, { width: '100vw', borderRadius: 0, ease: 'none', duration: 1 }, 0);
        tl.fromTo(title, { scale: 1 }, { scale: 1.28, transformOrigin: 'left top', ease: 'none', duration: 1 }, 0);
        tl.to({}, { duration: 0.8 });
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
    <section ref={sectionRef} className="relative w-full h-[100svh] -mt-[var(--offset)] overflow-hidden bg-bg-dark">
      <video className="absolute inset-0 w-full h-full object-cover" autoPlay loop muted playsInline aria-hidden>
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>

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

          {/* Mobile: widget en la esquina inferior izquierda del contenedor */}
          <div className="md:hidden absolute left-4 bottom-4 z-20">
            <MatchWidget compact />
          </div>
        </div>
      </div>

      {/* Título top-left (escala con el scroll) + botón mobile debajo */}
      <div className="absolute top-[calc(var(--offset)+0.75rem)] left-6 md:left-12 z-20 max-w-[88vw] md:max-w-[440px]">
        <div ref={titleRef} className="origin-top-left">
          <p className="text-white/75 text-[10px] md:text-[12px] uppercase tracking-[0.32em] [text-shadow:0_2px_16px_rgba(0,0,0,0.6)]">
            Mundial 26&apos;
          </p>
          <h1 className="text-white font-bold uppercase leading-[0.92] tracking-tight
                         text-[40px] sm:text-[52px] md:text-[64px] [text-shadow:0_2px_24px_rgba(0,0,0,0.55)]">
            LA NUESTRA
          </h1>
        </div>
      </div>

      {/* Desktop: widget del countdown — izquierda, alineado vertical al medio */}
      <div className="hidden md:flex absolute left-6 lg:left-12 top-1/2 -translate-y-1/2 z-20 flex-col items-start gap-2.5 max-w-[320px]">
        <MatchWidget />
        <p className="text-white/85 text-[12px] font-medium tracking-[0.02em] max-w-[300px] [text-shadow:0_2px_12px_rgba(0,0,0,0.7)]">
          Por cada gol que meta Argentina tenés un <span className="font-bold">7% extra</span>
        </p>
      </div>

      {/* Desktop: botón Ver producto — centrado, debajo del contenedor */}
      <div className="hidden md:flex absolute bottom-12 left-1/2 -translate-x-1/2 z-20">
        <Link href={PRODUCT_URL} className={BTN_CLASS}>
          <span className="relative z-10">Ver producto</span>
        </Link>
      </div>

      {/* Mobile: promo (queda donde estaba) + botón centrado al pie */}
      <div className="md:hidden absolute inset-x-4 bottom-5 z-30 flex flex-col items-center gap-3">
        <p className="text-center text-[10px] text-white/85 font-medium [text-shadow:0_2px_10px_rgba(0,0,0,0.7)]">
          Por cada gol de Argentina, <span className="font-bold">7% extra</span>
        </p>
        <Link href={PRODUCT_URL} className={`inline-flex ${BTN_CLASS}`}>
          <span className="relative z-10">Ver producto</span>
        </Link>
      </div>
    </section>
  );
}
