'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MediaFill } from './MediaTile';
import { SS27_MEDIA, SS27_VIDEOS, type Ss27Media } from '@/lib/ss27-home';

const SHOP_HREF = '#ss27';

// Tríos de fotos verticales que se turnan adentro de la ventana de desktop.
const TRIOS: Ss27Media[][] = [
  [SS27_MEDIA.lsPink, SS27_MEDIA.duo, SS27_MEDIA.eagleElla],
  [SS27_MEDIA.cross, SS27_MEDIA.distressed, SS27_MEDIA.raglan],
  [SS27_MEDIA.waffleBlack, SS27_MEDIA.lsBlue, SS27_MEDIA.scWaffle],
];
const TRIO_MS = 4500;

/**
 * Hero del drop SS27.
 *
 * Mobile: el video vertical de estudio a pantalla completa, con el título abajo.
 *
 * Desktop: la misma lógica que la intro de FW26 (HeroLookbookFW26). Video de
 * fondo desenfocado, una ventana al centro que crece con el scroll (GSAP, pin
 * sin pinSpacing + spacer manual) y adentro tríos de fotos que se turnan.
 *
 * En los dos, el STYLE&CULTURE arriba a la izquierda lleva data-intro-target:
 * es donde aterriza el logo de la intro de marca (LoadingScreen). Sin él, la
 * intro no tiene a dónde viajar y solo se disuelve.
 */
export default function HeroSs27() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  // Se resuelve en el cliente: el SSR pinta mobile (80% de las visitas) y
  // desktop cambia apenas hidrata, igual que HeroLookbookFW26.
  const [desktop, setDesktop] = useState(false);
  const [trio, setTrio] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => setDesktop(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (!desktop || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setTrio((x) => (x + 1) % TRIOS.length), TRIO_MS);
    return () => clearInterval(t);
  }, [desktop]);

  // Crecimiento atado al scroll, solo desktop. Mismo timeline que FW26:
  // grow (ventana 767→1220 px y logo x2,1) + hold, sobre un pin de 200%.
  useEffect(() => {
    if (!desktop) return;
    const section = sectionRef.current;
    const card = cardRef.current;
    const title = titleRef.current;
    if (!section || !card || !title) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: section, start: 'top top', end: '+=200%', pin: true, pinSpacing: false, scrub: 0.4, anticipatePin: 1 },
      });
      tl.fromTo(card, { maxWidth: 767 }, { maxWidth: 1220, ease: 'none', duration: 1 }, 0);
      tl.fromTo(title, { scale: 1 }, { scale: 2.1, transformOrigin: 'left top', ease: 'none', duration: 1 }, 0);
      tl.to({}, { duration: 1 });
    }, section);
    let raf = 0;
    const refresh = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => ScrollTrigger.refresh()); };
    const ro = new ResizeObserver(refresh);
    ro.observe(document.body);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); ctx.revert(); };
  }, [desktop]);

  return (
    <>
      <section
        ref={sectionRef}
        className="relative w-full h-[calc(100svh-var(--offset))] min-h-[560px] max-h-[980px] md:max-h-none md:h-[100dvh] md:-mt-[var(--offset)] overflow-hidden bg-black text-white"
      >
        {!desktop ? (
          <>
            <MediaFill media={{ id: 'estudio', kind: 'video', ...SS27_VIDEOS.estudio, alt: 'Spring Summer 27 en estudio' }} sizes="100vw" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/25" />
            <div className="absolute inset-x-0 bottom-0 px-5 pb-8 flex flex-col items-center text-center">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/80">Part 01 · Ya disponible</p>
              <h2 className="mt-2 font-semibold uppercase leading-[0.85] tracking-[-0.03em] text-[12.5vw]">Spring Summer 27</h2>
              <a
                href={SHOP_HREF}
                className="mt-6 inline-flex items-center h-11 px-6 text-[12px] font-semibold uppercase tracking-[0.14em] rounded-full bg-white text-black hover:bg-white/85 transition-colors"
              >
                Comprar el drop
              </a>
            </div>
          </>
        ) : (
          <>
            {/* Fondo: el video vertical de estudio, desenfocado. Estirado a
                horizontal se vería pixelado; desenfocado queda como atmósfera. */}
            <video
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl"
              src={SS27_VIDEOS.duo.src}
              poster={SS27_VIDEOS.duo.poster}
              autoPlay
              loop
              muted
              playsInline
              aria-hidden
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/20 to-black/55 pointer-events-none" />

            <div className="absolute inset-0 flex items-center justify-center px-4">
              <div ref={cardRef} className="relative w-full max-w-[767px] aspect-[990/503] overflow-hidden rounded-[24px] bg-bg-dark">
                {TRIOS.map((set, k) => (
                  <div
                    key={k}
                    aria-hidden={k !== trio}
                    className="absolute inset-0 grid grid-cols-3 gap-[2px] transition-opacity duration-[1200ms] ease-in-out"
                    style={{ opacity: k === trio ? 1 : 0, pointerEvents: k === trio ? 'auto' : 'none' }}
                  >
                    {set.map((m) => (
                      <Link key={m.id} href={m.href ?? SHOP_HREF} tabIndex={k === trio ? undefined : -1} className="relative block">
                        <Image src={m.src} alt={m.alt} fill sizes="(min-width: 1280px) 410px, 33vw" priority={k === 0} className="object-cover" />
                      </Link>
                    ))}
                  </div>
                ))}
                <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black/50 via-black/15 to-transparent pointer-events-none z-[15]" />

                {/* Card glass, igual que en FW26 */}
                <a
                  href={SHOP_HREF}
                  className="absolute left-8 bottom-8 z-20 inline-flex flex-col items-start
                             bg-white/[0.32] border-[1.5px] border-white/55 rounded-[18px]
                             px-7 py-5 backdrop-blur-[40px] backdrop-saturate-[1.4]
                             shadow-[0_8px_32px_rgba(0,0,0,0.22),inset_0_1.5px_0_rgba(255,255,255,0.45)]
                             transition-transform duration-300 hover:scale-[1.03]"
                >
                  <Image src="/hero/hype-white.png" alt="Hype." width={200} height={88} className="w-20 h-auto mb-3" />
                  <span className="block text-white/90 text-[15px] font-bold uppercase tracking-[0.06em] leading-[1.4]">Spring Summer 27</span>
                  <span className="block text-white/90 text-[15px] font-bold uppercase tracking-[0.06em] leading-[1.4]">Part 01 · Ya disponible</span>
                </a>

                <a
                  href={SHOP_HREF}
                  className="absolute right-8 bottom-8 z-20 inline-flex items-center gap-2 text-white text-[12px] font-semibold uppercase tracking-[0.14em] [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] hover:opacity-80 transition-opacity"
                >
                  Comprar el drop
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3l5 5-5 5" /></svg>
                </a>

                <div className="absolute top-5 right-6 z-20 flex gap-1.5">
                  {TRIOS.map((_, k) => (
                    <button
                      key={k}
                      aria-label={`Fotos ${k + 1}`}
                      onClick={() => setTrio(k)}
                      className={`h-[3px] rounded-full transition-all ${k === trio ? 'w-6 bg-white' : 'w-3 bg-white/45'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* STYLE&CULTURE arriba a la izquierda: destino del logo de la intro. */}
        <div className="absolute top-4 md:top-[calc(var(--offset)+5rem)] left-5 md:left-12 z-20 max-w-[44vw] md:max-w-[300px] pointer-events-none">
          <div ref={titleRef} className="origin-top-left">
            <Image
              src="/STYLE&CULTURE WHITE.png"
              alt="Style & Culture"
              data-intro-target
              width={1778}
              height={113}
              priority
              className="w-full h-auto [filter:drop-shadow(0_2px_16px_rgba(0,0,0,0.6))]"
            />
          </div>
        </div>
      </section>
      {/* Spacer del pin (solo desktop), como en FW26: reserva el scroll que
          dura el crecimiento antes de que la sección siguiente tape el hero. */}
      <div className="h-0 md:h-[100svh]" aria-hidden />
    </>
  );
}
