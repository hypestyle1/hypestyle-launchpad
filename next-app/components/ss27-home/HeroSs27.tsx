'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MediaFill } from './MediaTile';
import { MetallicButton } from '@/components/ui/metallic-button';
import { SS27_MEDIA, SS27_VIDEOS, type Ss27Media } from '@/lib/ss27-home';

const SLIDE_MS = 4500;
const B = '/ss27/banner/';
const P = '/ss27/preview/';
const H = '/ss27/home/';
const COLECCION = '/colecciones/ss27/';

const ESTUDIO: Ss27Media = { id: 'estudio', kind: 'video', ...SS27_VIDEOS.estudio, alt: 'Spring Summer 27 en estudio' };

// Desktop: FW26 tenía fotos horizontales para el card (990/503); la sesión SS27
// es toda vertical, así que cada slide es un trío de verticales de la misma
// línea. Las del piso (suelo-*) salen del FLATLAY de cada prenda.
const SLIDES = [
  { trio: [B + '04-athletic-ls-pink.webp', B + '05-piso-athletic-ls.webp', B + '11-athletic-ls-blue.webp'], name1: 'Athletic Dept', name2: 'Longsleeves', href: SS27_MEDIA.lsPink.href },
  { trio: [B + '02-eagle-18-el.webp', H + 'suelo-eagle-hoodie.webp', B + '03-eagle-18-ella.webp'], name1: 'Золотые купола', name2: 'Hoodie', href: SS27_MEDIA.eagleEl.href },
  { trio: [B + '01-duo.webp', H + 'suelo-distressed-hoodie.webp', B + '08-polo.webp'], name1: 'Washed Grey', name2: 'Hoodie + Polo', href: SS27_MEDIA.duo.href },
  { trio: [B + '12-cross-waffle.webp', B + '14-waffle-black.webp', H + 'suelo-sc-waffle.webp'], name1: 'Waffle', name2: 'Longsleeves', href: SS27_MEDIA.cross.href },
  { trio: [P + '10-varsity-crest-white.webp', B + '18-varsity-crest-grid.webp', H + 'hero-sc-university-black.webp'], name1: 'Style & Culture', name2: 'University Tee', href: SS27_MEDIA.crestGrid.href },
  { trio: [P + '03-018-varsity-navy.webp', B + '13-piso-018.webp', P + '16-018-varsity-white.webp'], name1: 'Worn Varsity Club', name2: 'Boxy Tee', href: SS27_MEDIA.piso018.href },
];

const ARROW_BTN_CLASS =
  'absolute top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/25 backdrop-blur-md ' +
  'border border-white/40 flex items-center justify-center text-white hover:bg-white/35 transition-colors';

/**
 * Hero del drop SS27: dos piezas distintas según el ancho.
 * - Mobile: el video de estudio a pantalla completa, con el STYLE&CULTURE
 *   grande al centro, y el bloque "aparece" al cargar (scale 0,88→1).
 * - Desktop: el hero de la tienda (HeroLookbookFW26) con tríos de fotos SS27.
 * Cada una tiene su STYLE&CULTURE con data-intro-target; LoadingScreen toma el
 * que está visible.
 */
export default function HeroSs27() {
  return (
    <>
      <HeroMobile />
      <HeroDesktop />
    </>
  );
}

function HeroMobile() {
  const boxRef = useRef<HTMLDivElement>(null);

  // Aparición al cargar, como el hero mobile de la tienda.
  useEffect(() => {
    const box = boxRef.current;
    if (!box || !window.matchMedia('(max-width: 767px)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const tw = gsap.fromTo(box, { scale: 0.88, borderRadius: 24 }, { scale: 1, borderRadius: 0, ease: 'power2.out', duration: 0.9, delay: 0.15 });
    return () => { tw.kill(); };
  }, []);

  return (
    <section className="md:hidden relative w-full h-[calc(100svh-var(--offset))] min-h-[560px] max-h-[980px] overflow-hidden bg-bg-dark text-white">
      <div ref={boxRef} className="absolute inset-0 overflow-hidden">
        <MediaFill media={ESTUDIO} sizes="100vw" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/45" />

        {/* Marca al centro + bajada en dos puntas. */}
        <div className="absolute inset-0 flex items-center justify-center px-5 pointer-events-none">
          <div className="w-full max-w-[88vw]">
            <Image
              src="/STYLE&CULTURE WHITE.png"
              alt="Style & Culture"
              data-intro-target
              width={1778}
              height={113}
              priority
              className="w-full h-auto [filter:drop-shadow(0_2px_24px_rgba(0,0,0,0.35))]"
            />
            <div className="mt-3 flex justify-between text-[13px] font-semibold tracking-[-0.01em] [text-shadow:0_1px_12px_rgba(0,0,0,0.35)]">
              <span>Part 01</span>
              <span>Spring Summer 27</span>
            </div>
          </div>
        </div>

        {/* Kicker + botón metálico. Bien arriba del borde: abajo flotan el badge de
            reseñas, el WhatsApp y el botón de accesibilidad. */}
        <div className="absolute inset-x-4 bottom-[168px] flex flex-col items-center text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.04em]">SS27-01 · Ya disponible</p>
          <MetallicButton href={COLECCION} label="Ver colección" className="mt-4" labelClassName="text-[14px] font-semibold tracking-[0.01em]" />
        </div>
      </div>
    </section>
  );
}

function HeroDesktop() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  const [slide, setSlide] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  // Fotos y video se montan solo en desktop: en mobile esta sección está
  // oculta y no tiene que bajar nada.
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
    if (!desktop) return;
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [desktop, resetTimer]);

  const goTo = (i: number) => {
    setSlide(((i % SLIDES.length) + SLIDES.length) % SLIDES.length);
    resetTimer();
  };

  // Mismo timeline que FW26: grow (card 767→1220 y logo x2,1) + hold, sobre un
  // pin de 200% sin pinSpacing y el spacer manual de abajo.
  useEffect(() => {
    const section = sectionRef.current;
    const card = cardRef.current;
    const title = titleRef.current;
    if (!section || !card || !title) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.matchMedia().add('(min-width: 768px)', () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: section, start: 'top top', end: '+=200%', pin: true, pinSpacing: false, scrub: 0.4, anticipatePin: 1 },
        });
        tl.fromTo(card, { maxWidth: 767 }, { maxWidth: 1220, ease: 'none', duration: 1 }, 0);
        tl.fromTo(title, { scale: 1 }, { scale: 2.1, transformOrigin: 'left top', ease: 'none', duration: 1 }, 0);
        tl.to({}, { duration: 1 });
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
      <section ref={sectionRef} className="hidden md:block relative w-full h-[100dvh] -mt-[var(--offset)] overflow-hidden bg-bg-dark">
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

        <div className="absolute inset-0 flex items-center justify-center px-4">
          <div ref={cardRef} className="relative w-full max-w-[767px] aspect-[990/503] overflow-hidden rounded-[24px] bg-bg-dark">
            {SLIDES.map((s, i) => (
              <div
                key={s.name1}
                aria-hidden={i !== slide}
                className="absolute inset-0 grid grid-cols-3 gap-[2px] transition-opacity duration-[1200ms] ease-in-out"
                style={{ opacity: i === slide ? 1 : 0 }}
              >
                {desktop &&
                  ready.has(i) &&
                  s.trio.map((src) => (
                    <div key={src} className="relative">
                      <Image src={src} alt="" fill loading="eager" sizes="(min-width: 1280px) 410px, 33vw" className="object-cover" />
                    </div>
                  ))}
              </div>
            ))}

            <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black/50 via-black/15 to-transparent pointer-events-none z-[15]" />

            <button onClick={() => goTo(slide - 1)} aria-label="Anterior" className={`${ARROW_BTN_CLASS} left-4`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 3L5 8l5 5" /></svg>
            </button>
            <button onClick={() => goTo(slide + 1)} aria-label="Siguiente" className={`${ARROW_BTN_CLASS} right-4`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3l5 5-5 5" /></svg>
            </button>

            {/* Card glass — CTA a la prenda del slide actual */}
            <Link
              href={current.href ?? COLECCION}
              className="absolute left-8 bottom-8 z-20 inline-flex flex-col items-start
                         bg-white/[0.32] border-[1.5px] border-white/55 rounded-[18px]
                         px-7 py-5 backdrop-blur-[40px] backdrop-saturate-[1.4]
                         shadow-[0_8px_32px_rgba(0,0,0,0.22),inset_0_1.5px_0_rgba(255,255,255,0.45)]
                         transition-transform duration-300 hover:scale-[1.03]"
            >
              <Image src="/hero/hype-white.png" alt="Hype." width={200} height={88} className="w-20 h-auto mb-3" />
              <span className="block text-white/90 text-[15px] font-bold uppercase tracking-[0.06em] leading-[1.4]">{current.name1}</span>
              <span className="block text-white/90 text-[15px] font-bold uppercase tracking-[0.06em] leading-[1.4]">{current.name2}</span>
            </Link>

            <a
              href="#ss27"
              className="absolute right-8 bottom-8 z-20 inline-flex items-center gap-2
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
          className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5
                      text-white/80 transition-opacity duration-500 ${scrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <span className="text-[9px] uppercase tracking-[0.22em] font-medium [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]">Scroll</span>
          <svg className="animate-bounce" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.5))' }}>
            <path d="M3 6l5 5 5-5" />
          </svg>
        </button>

        {/* STYLE&CULTURE top-left: destino del logo de la intro, escala con el scroll */}
        <div className="absolute top-[calc(var(--offset)+5rem)] left-12 z-20 max-w-[300px]">
          <div ref={titleRef} className="origin-top-left">
            <Image
              src="/STYLE&CULTURE WHITE.png"
              alt="Style & Culture"
              data-intro-target
              width={1778}
              height={113}
              className="w-full h-auto [filter:drop-shadow(0_2px_16px_rgba(0,0,0,0.6))]"
            />
          </div>
        </div>
      </section>
      {/* Spacer del pin, igual que FW26: reserva el scroll que dura el
          crecimiento antes de que la sección siguiente tape el hero. */}
      <div className="hidden md:block h-[100svh]" aria-hidden />
    </>
  );
}
