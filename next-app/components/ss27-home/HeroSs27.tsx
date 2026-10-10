'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SS27_MEDIA, SS27_VIDEOS } from '@/lib/ss27-home';

const SLIDE_MS = 4500;
const B = '/ss27/banner/';
const P = '/ss27/preview/';

// Mismo hero que el de la tienda (HeroLookbookFW26), con el drop SS27.
// Diferencia: FW26 tenía fotos horizontales para el card de desktop (990/503);
// la sesión SS27 es toda vertical, así que en desktop cada slide es un trío de
// verticales de la misma línea. Mobile sigue con una sola foto por slide.
const SLIDES = [
  { trio: [B + '04-athletic-ls-pink.webp', B + '05-piso-athletic-ls.webp', B + '11-athletic-ls-blue.webp'], mobile: B + '04-athletic-ls-pink.webp', name1: 'Athletic Dept', name2: 'Longsleeves', href: SS27_MEDIA.lsPink.href },
  { trio: [B + '02-eagle-18-el.webp', P + '04-eagle-18-hoodie.webp', B + '03-eagle-18-ella.webp'], mobile: B + '02-eagle-18-el.webp', name1: 'Золотые купола', name2: 'Hoodie', href: SS27_MEDIA.eagleEl.href },
  { trio: [B + '01-duo.webp', B + '15-distressed.webp', B + '08-polo.webp'], mobile: B + '01-duo.webp', name1: 'Washed Grey', name2: 'Hoodie + Polo', href: SS27_MEDIA.duo.href },
  { trio: [B + '12-cross-waffle.webp', B + '14-waffle-black.webp', B + '07-sc-waffle.webp'], mobile: B + '12-cross-waffle.webp', name1: 'Waffle', name2: 'Longsleeves', href: SS27_MEDIA.cross.href },
  { trio: [B + '18-varsity-crest-grid.webp', P + '10-varsity-crest-white.webp', P + '23-varsity-crest-black.webp'], mobile: P + '20-varsity-crest-navy.webp', name1: 'Style & Culture', name2: 'University Tee', href: SS27_MEDIA.crestGrid.href },
  { trio: [B + '13-piso-018.webp', P + '03-018-varsity-navy.webp', P + '16-018-varsity-white.webp'], mobile: P + '16-018-varsity-white.webp', name1: 'Worn Varsity Club', name2: 'Boxy Tee', href: SS27_MEDIA.piso018.href },
];

const ARROW_BTN_CLASS =
  'absolute top-1/2 -translate-y-1/2 z-20 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/25 backdrop-blur-md ' +
  'border border-white/40 flex items-center justify-center text-white hover:bg-white/35 transition-colors';

/**
 * Hero del drop SS27. Misma lógica que HeroLookbookFW26 (ver los comentarios
 * de ese archivo para el porqué de cada decisión):
 * - Desktop: video de fondo, card al centro que crece 767→1220 con el scroll
 *   (pin sin pinSpacing + spacer manual) y el STYLE&CULTURE escala x2,1.
 * - Mobile: el card ocupa los 80dvh y "aparece" al cargar (scale 0,88→1 y
 *   esquinas 24→0), con el STYLE&CULTURE creciendo x1,7.
 * - En los dos, el STYLE&CULTURE lleva data-intro-target: ahí aterriza el logo
 *   de la intro de marca (LoadingScreen).
 */
export default function HeroSs27() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  const [slide, setSlide] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => setDesktop(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Solo piden su foto el slide actual, el siguiente y los ya vistos.
  const [ready, setReady] = useState<Set<number>>(() => new Set([0]));
  useEffect(() => {
    setReady((prev) => {
      const next = (slide + 1) % SLIDES.length;
      if (prev.has(slide) && prev.has(next)) return prev;
      return new Set([...prev, slide, next]);
    });
  }, [slide]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), SLIDE_MS);
  }, []);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  const goTo = (i: number) => {
    setSlide(((i % SLIDES.length) + SLIDES.length) % SLIDES.length);
    resetTimer();
  };

  useEffect(() => {
    const section = sectionRef.current;
    const card = cardRef.current;
    const title = titleRef.current;
    if (!section || !card || !title) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add('(min-width: 768px)', () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: section, start: 'top top', end: '+=200%', pin: true, pinSpacing: false, scrub: 0.4, anticipatePin: 1 },
        });
        tl.fromTo(card, { maxWidth: 767 }, { maxWidth: 1220, ease: 'none', duration: 1 }, 0);
        tl.fromTo(title, { scale: 1 }, { scale: 2.1, transformOrigin: 'left top', ease: 'none', duration: 1 }, 0);
        tl.to({}, { duration: 1 });
      });
      mm.add('(max-width: 767px)', () => {
        gsap.fromTo(card, { scale: 0.88, borderRadius: 24 }, { scale: 1, borderRadius: 0, ease: 'power2.out', duration: 0.9, delay: 0.15 });
        gsap.fromTo(title, { scale: 1 }, { scale: 1.7, transformOrigin: 'left top', ease: 'power2.out', duration: 0.9, delay: 0.15 });
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

  const current = SLIDES[slide];

  return (
    <>
      <section ref={sectionRef} className="relative w-full h-[80dvh] md:h-[100dvh] -mt-[var(--offset)] overflow-hidden bg-bg-dark">
        {desktop && (
          <>
            {/* El film de estudio de fondo. Es vertical: estirado a horizontal
                se pixela, así que va desenfocado, como atmósfera. */}
            <video
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl"
              src={SS27_VIDEOS.estudio.src}
              poster={SS27_VIDEOS.estudio.poster}
              autoPlay
              loop
              muted
              playsInline
              aria-hidden
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/15 to-black/55 pointer-events-none" />
          </>
        )}

        <div className="absolute inset-0 flex items-center justify-center px-0 md:px-4">
          <div
            ref={cardRef}
            className="relative w-full h-full max-w-[767px] md:h-auto md:aspect-[990/503] overflow-hidden rounded-none md:rounded-[24px] bg-bg-dark"
          >
            {SLIDES.map((s, i) => (
              <div
                key={s.mobile}
                aria-hidden={i !== slide}
                className="absolute inset-0 transition-opacity duration-[1200ms] ease-in-out"
                style={{ opacity: i === slide ? 1 : 0 }}
              >
                {ready.has(i) &&
                  (desktop ? (
                    <div className="absolute inset-0 grid grid-cols-3 gap-[2px]">
                      {s.trio.map((src) => (
                        <div key={src} className="relative">
                          <Image src={src} alt="" fill sizes="(min-width: 1280px) 410px, 33vw" priority={i === 0} className="object-cover" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Image src={s.mobile} alt="" fill sizes="100vw" priority={i === 0} className="object-cover object-[center_30%]" />
                  ))}
              </div>
            ))}

            <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black/50 via-black/15 to-transparent pointer-events-none z-[15]" />

            <button onClick={() => goTo(slide - 1)} aria-label="Anterior" className={`${ARROW_BTN_CLASS} left-3 md:left-4`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 3L5 8l5 5" /></svg>
            </button>
            <button onClick={() => goTo(slide + 1)} aria-label="Siguiente" className={`${ARROW_BTN_CLASS} right-3 md:right-4`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3l5 5-5 5" /></svg>
            </button>

            {/* Card glass — CTA a la prenda del slide actual */}
            <Link
              href={current.href ?? '/colecciones/ss27/'}
              className="absolute left-4 bottom-4 md:left-8 md:bottom-8 z-20 inline-flex flex-col items-start
                         bg-white/[0.32] border-[1.5px] border-white/55 rounded-[16px] md:rounded-[18px]
                         px-4 py-3 md:px-7 md:py-5 backdrop-blur-[40px] backdrop-saturate-[1.4]
                         shadow-[0_8px_32px_rgba(0,0,0,0.22),inset_0_1.5px_0_rgba(255,255,255,0.45)]
                         transition-transform duration-300 hover:scale-[1.03]"
            >
              <Image src="/hero/hype-white.png" alt="Hype." width={200} height={88} priority className="w-14 md:w-20 h-auto mb-2 md:mb-3" />
              <span className="block text-white/90 text-[12px] md:text-[15px] font-bold uppercase tracking-[0.06em] leading-[1.4]">{current.name1}</span>
              <span className="block text-white/90 text-[12px] md:text-[15px] font-bold uppercase tracking-[0.06em] leading-[1.4]">{current.name2}</span>
            </Link>

            <a
              href="#ss27"
              className="absolute right-4 bottom-4 md:right-8 md:bottom-8 z-20 hidden md:inline-flex items-center gap-2
                         text-white text-[12px] font-semibold uppercase tracking-[0.14em]
                         [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] hover:opacity-80 transition-opacity"
            >
              Comprar SS27
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3l5 5-5 5" /></svg>
            </a>
          </div>
        </div>

        <button
          onClick={() => window.scrollBy({ top: window.innerHeight * 0.9, behavior: 'smooth' })}
          aria-label="Scroll hacia abajo"
          className={`absolute bottom-5 right-6 md:bottom-8 md:left-1/2 md:right-auto md:-translate-x-1/2
                      z-20 flex flex-col items-center gap-1.5
                      text-white/80 transition-opacity duration-500 ${scrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <span className="text-[9px] uppercase tracking-[0.22em] font-medium [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]">Scroll</span>
          <svg className="animate-bounce" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.5))' }}>
            <path d="M3 6l5 5 5-5" />
          </svg>
        </button>

        {/* STYLE&CULTURE top-left: destino del logo de la intro, escala con el scroll */}
        <div className="absolute top-[calc(var(--offset)+0.75rem)] md:top-[calc(var(--offset)+5rem)] left-6 md:left-12 z-20 max-w-[52vw] md:max-w-[300px]">
          <div ref={titleRef} className="origin-top-left scale-[1.7] md:scale-100">
            <Image
              src="/STYLE&CULTURE WHITE.png"
              alt="Style & Culture"
              data-intro-target
              width={1778}
              height={113}
              className="w-full h-auto [filter:drop-shadow(0_2px_16px_rgba(0,0,0,0.6))]"
              priority
            />
          </div>
        </div>
      </section>
      {/* Spacer del pin (solo desktop), igual que FW26. */}
      <div className="h-0 md:h-[100svh]" aria-hidden />
    </>
  );
}
