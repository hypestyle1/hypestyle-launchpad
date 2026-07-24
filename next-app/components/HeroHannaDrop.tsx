'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const VIDEO_SRC = '/hero/hanna-drop-bg.mp4';
const SLIDE_MS = 4500;

const SLIDES = [
  { img: '/hero/hanna-drop-1.jpg', name1: 'Stars For Venezuela', name2: 'Hoodie', slug: 'stars-for-venezuela-hoodie' },
  { img: '/hero/hanna-drop-2.jpg', name1: 'Half-Zip Polo', name2: 'Melange', slug: 'half-zip-polo-melange' },
  { img: '/hero/hanna-drop-3.jpg', name1: 'Lion Of Judah', name2: 'Stone Wash', slug: 'lion-of-judah-stone-wash-hoodie' },
  { img: '/hero/hanna-drop-4.jpg', name1: 'Hoodie', name2: 'Pink', slug: 'hoodie-pink' },
  { img: '/hero/hanna-drop-5.jpg', name1: 'God Gave Me Style', name2: 'Waffle', slug: 'longsleeve-waffle-god-gave-me-style' },
];

const ARROW_BTN_CLASS =
  'absolute top-1/2 -translate-y-1/2 z-20 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/25 backdrop-blur-md ' +
  'border border-white/40 flex items-center justify-center text-white hover:bg-white/35 transition-colors';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function HeroHannaDrop() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const [slides, setSlides] = useState(SLIDES);
  const [slide, setSlide] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Orden aleatorio por visita: se sortea recién en el cliente para no romper la hidratación SSR.
  useEffect(() => { setSlides(shuffle(SLIDES)); }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSlide(s => (s + 1) % slides.length), SLIDE_MS);
  }, [slides.length]);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  const goTo = (i: number) => {
    setSlide(((i % slides.length) + slides.length) % slides.length);
    resetTimer();
  };

  useEffect(() => {
    const section = sectionRef.current;
    const card = cardRef.current;
    const title = titleRef.current;
    if (!section || !card || !title) return;

    gsap.registerPlugin(ScrollTrigger);
    // En mobile, el address bar de Safari se esconde/muestra al scrollear y dispara un
    // "resize" que ScrollTrigger toma como real, dejando un hueco blanco al despinear.
    ScrollTrigger.config({ ignoreMobileResize: true });

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Desktop: contenedor crece 767→1220 y el título escala en sincro; luego HOLD.
      mm.add('(min-width: 768px)', () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: section, start: 'top top', end: '+=200%', pin: true, scrub: 0.4, anticipatePin: 1 },
        });
        tl.fromTo(card, { maxWidth: 767 }, { maxWidth: 1220, ease: 'none', duration: 1 }, 0);
        tl.fromTo(title, { scale: 1 }, { scale: 2.1, transformOrigin: 'left top', ease: 'none', duration: 1 }, 0);
        tl.to({}, { duration: 1 });
      });

      // Mobile: contenedor inset → full-bleed, título escala en sincro; HOLD.
      mm.add('(max-width: 767px)', () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: section, start: 'top top', end: '+=160%', pin: true, scrub: 0.4, anticipatePin: 1 },
        });
        tl.fromTo(card, { width: '88vw', borderRadius: 24 }, { width: '100vw', borderRadius: 0, ease: 'none', duration: 1 }, 0);
        tl.fromTo(title, { scale: 1 }, { scale: 1.7, transformOrigin: 'left top', ease: 'none', duration: 1 }, 0);
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

  const current = slides[slide];

  return (
    <section ref={sectionRef} className="relative w-full h-[100svh] -mt-[var(--offset)] overflow-hidden bg-bg-dark">
      <video className="absolute inset-0 w-full h-full object-cover" autoPlay loop muted playsInline aria-hidden>
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/15 to-black/55 pointer-events-none" />

      {/* Contenedor (carrusel) centrado — crece con el scroll */}
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div
          ref={cardRef}
          className="relative w-full max-w-[767px] aspect-[4/5] md:aspect-[990/503] overflow-hidden rounded-[24px] bg-bg-dark"
        >
          {slides.map((s, i) => (
            <div
              key={s.img}
              className="absolute inset-0 bg-cover bg-[center_18%] transition-opacity duration-[1200ms] ease-in-out"
              style={{ backgroundImage: `url('${s.img}')`, opacity: i === slide ? 1 : 0 }}
            />
          ))}

          {/* Scrim: oscurece la base para que la card glass se lea neutra sobre cualquier foto */}
          <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black/50 via-black/15 to-transparent pointer-events-none z-[15]" />

          <button onClick={() => goTo(slide - 1)} aria-label="Anterior" className={`${ARROW_BTN_CLASS} left-3 md:left-4`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 3L5 8l5 5" /></svg>
          </button>
          <button onClick={() => goTo(slide + 1)} aria-label="Siguiente" className={`${ARROW_BTN_CLASS} right-3 md:right-4`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3l5 5-5 5" /></svg>
          </button>

          {/* Card glass superpuesta — CTA al producto del slide actual */}
          <Link
            href={`/producto/${current.slug}`}
            className="absolute left-4 bottom-4 md:left-8 md:bottom-8 z-20 inline-flex flex-col items-start
                       bg-white/[0.32] border-[1.5px] border-white/55 rounded-[16px] md:rounded-[18px]
                       px-4 py-3 md:px-7 md:py-5 backdrop-blur-[40px] backdrop-saturate-[1.4]
                       shadow-[0_8px_32px_rgba(0,0,0,0.22),inset_0_1.5px_0_rgba(255,255,255,0.45)]
                       transition-transform duration-300 hover:scale-[1.03]"
          >
            <Image src="/hero/hype-white.png" alt="Hype." width={200} height={88} className="w-14 md:w-20 h-auto mb-2 md:mb-3" />
            <span className="block text-white/90 text-[12px] md:text-[15px] font-bold uppercase tracking-[0.06em] leading-[1.4]">
              {current.name1}
            </span>
            <span className="block text-white/90 text-[12px] md:text-[15px] font-bold uppercase tracking-[0.06em] leading-[1.4]">
              {current.name2}
            </span>
          </Link>
        </div>
      </div>

      {/* Logo STYLE&CULTURE top-left (escala con el scroll) */}
      <div className="absolute top-[calc(var(--offset)+0.75rem)] md:top-[calc(var(--offset)+5rem)] left-6 md:left-12 z-20 max-w-[52vw] md:max-w-[300px]">
        <div ref={titleRef} className="origin-top-left">
          <Image
            src="/STYLE&CULTURE WHITE.png"
            alt="Style & Culture"
            width={1778}
            height={113}
            className="w-full h-auto [filter:drop-shadow(0_2px_16px_rgba(0,0,0,0.6))]"
            priority
          />
        </div>
      </div>
    </section>
  );
}
