'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { preload } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const VIDEO_SRC = '/hero/hanna-drop-bg-2-hoodie.mp4';
const SLIDE_MS = 4500;

// pos = background-position vertical (foco del recorte en bg-cover). Las fotos
// del shoot de agosto vienen sin recortar y cada una tiene al modelo/prenda en
// una altura distinta del encuadre, por eso no comparten el mismo foco que las
// demás — default 18% si no se especifica.
const SLIDES = [
  { img: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/08/hero-stars-venezuela-DSC03294-scaled.jpg', name1: 'Stars For Venezuela', name2: 'Hoodie', slug: 'stars-for-venezuela-hoodie', pos: '58%' },
  { img: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/08/hero-hoodie-black-hstars-DSC03195-scaled.jpg', name1: 'Hoodie', name2: 'Black HStars', slug: 'hoodie-black-hstars', pos: '28%' },
  { img: '/hero/hanna-drop-3.jpg', name1: 'Lion Of Judah', name2: 'Stone Wash', slug: 'lion-of-judah-stone-wash-hoodie' },
  { img: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/08/hero-hoodie-pink-juani-scaled.jpg', name1: 'Hoodie', name2: 'Pink', slug: 'hoodie-pink' },
  { img: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/08/hero-god-gave-me-style-espaldas-scaled.jpg', name1: 'God Gave Me Style', name2: 'Waffle', slug: 'longsleeve-waffle-god-gave-me-style' },
  // Único slide en video (el resto son fotos) — mismo mural que el editorial de
  // Napoli en New In, recortado de "maradona color hype04002372.mov" (mudo).
  { video: '/hero/napoli-mural.mp4', img: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/08/hero-napoli-DSC03106-scaled.jpg', name1: 'Napoli', name2: 'Tee', slug: 'napoli-tee-azul' },
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

  // La foto del primer slide es un background-image en CSS, así que el navegador
  // recién la descubre después de parsear el stylesheet. Precargarla la pone en
  // cola desde el <head>. Va siempre SLIDES[0]: el shuffle corre en un effect,
  // después del primer pintado, así que la primera foto que se ve es esa.
  preload(SLIDES[0].img, { as: 'image', fetchPriority: 'high' });

  const [slides, setSlides] = useState(SLIDES);
  const [slide, setSlide] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Heatmap (Clarity) mostraba muy poca gente llegando más allá del hero —
  // este cue invita a scrollear y se apaga apenas el usuario ya arrancó.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Cortina: pin sin pinSpacing (evita el spacer de GSAP, que es lo que se
      // desincroniza con el resize del address bar en mobile). El "hueco" que
      // reservaba ese spacer ahora es un <div> fijo (SPACER_VH) después de la
      // sección: mientras se scrollea esa franja, el hero queda fijo en pantalla
      // (nada lo tapa todavía) y el título/card terminan de crecer. Recién
      // después, la sección siguiente (con fondo opaco, ver page.tsx) sube y
      // tapa el hero — por eso el timeline es grow(duration:1) + hold(duration:1)
      // sobre el mismo rango total (spacer + 1 alto de sección = el "end").

      // Desktop: contenedor crece 767→1220 y el título escala en sincro; luego HOLD.
      mm.add('(min-width: 768px)', () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: section, start: 'top top', end: '+=200%', pin: true, pinSpacing: false, scrub: 0.4, anticipatePin: 1 },
        });
        tl.fromTo(card, { maxWidth: 767 }, { maxWidth: 1220, ease: 'none', duration: 1 }, 0);
        tl.fromTo(title, { scale: 1 }, { scale: 2.1, transformOrigin: 'left top', ease: 'none', duration: 1 }, 0);
        tl.to({}, { duration: 1 });
      });

      // Mobile: el crecimiento se mantiene, pero ya NO atado al scroll (sin pin,
      // sin ScrollTrigger) — se dispara solo, apenas se monta. Antes el "end" del
      // scroll-jacking tenía que coincidir con el alto del spacer, y como el hero
      // ahora es de 80dvh (para que se vea contenido real sin scrollear) esa
      // sincro se rompía: el card quedaba chico/redondeado mientras la sección de
      // abajo ya asomaba, dejando una franja blanca. Al sacar el ScrollTrigger, el
      // alto de la sección (fijo, 80dvh) queda totalmente desacoplado del progreso
      // de la animación — el contenido de abajo se ve de una siempre, sin importar
      // en qué punto esté el crecimiento del card.
      mm.add('(max-width: 767px)', () => {
        gsap.fromTo(card,
          { width: '88vw', borderRadius: 24 },
          { width: '100vw', borderRadius: 0, ease: 'power2.out', duration: 0.9, delay: 0.15 },
        );
        gsap.fromTo(title,
          { scale: 1 },
          { scale: 1.7, transformOrigin: 'left top', ease: 'power2.out', duration: 0.9, delay: 0.15 },
        );
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
    <>
    {/* 100dvh (no svh): la sección queda "position:fixed" mientras está pineada, y con
        svh (altura fija, la mínima) no crece cuando el navegador esconde la barra de
        direcciones al scrollear en mobile — deja un hueco blanco abajo. dvh se
        actualiza en vivo con el alto real de la ventana. El spacer manual (más abajo)
        se deja en svh a propósito: solo necesita ser estable para el cálculo de
        scroll, no visible.
        En mobile el hero va a 80dvh (no 100): con el heatmap de Clarity se vio que
        casi nadie scrolleaba — el hero tapaba toda la pantalla y no daba ningún
        indicio de que había más contenido abajo. Con 80dvh + spacer chico (ver
        más abajo) ya se ve contenido real (Envío Internacional, Reseñas) sin
        scrollear nada, no solo un borde en blanco. Desktop queda en 100dvh. */}
    <section ref={sectionRef} className="relative w-full h-[80dvh] md:h-[100dvh] -mt-[var(--offset)] overflow-hidden bg-bg-dark">
      <video className="absolute inset-0 w-full h-full object-cover" autoPlay loop muted playsInline aria-hidden>
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/15 to-black/55 pointer-events-none" />

      {/* Contenedor (carrusel) centrado — full-bleed fijo en mobile, crece con el scroll en desktop */}
      <div className="absolute inset-0 flex items-center justify-center px-0 md:px-4">
        <div
          ref={cardRef}
          className="relative w-full max-w-[767px] aspect-[4/5] md:aspect-[990/503] overflow-hidden rounded-none md:rounded-[24px] bg-bg-dark"
        >
          {slides.map((s, i) => (
            <div
              key={s.video ?? s.img}
              className="absolute inset-0 transition-opacity duration-[1200ms] ease-in-out"
              style={{ opacity: i === slide ? 1 : 0 }}
            >
              {s.video ? (
                <video
                  className="absolute inset-0 w-full h-full object-cover"
                  src={s.video} poster={s.img} autoPlay loop muted playsInline preload="auto"
                />
              ) : (
                <div
                  className="absolute inset-0 bg-cover"
                  style={{ backgroundImage: `url('${s.img}')`, backgroundPosition: `center ${s.pos ?? '18%'}` }}
                />
              )}
            </div>
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
            {/* priority: está sobre el pliegue y es el candidato a LCP del home.
                Sin esto salía con loading="lazy" y el navegador lo pedía tarde. */}
            <Image src="/hero/hype-white.png" alt="Hype." width={200} height={88} priority className="w-14 md:w-20 h-auto mb-2 md:mb-3" />
            <span className="block text-white/90 text-[12px] md:text-[15px] font-bold uppercase tracking-[0.06em] leading-[1.4]">
              {current.name1}
            </span>
            <span className="block text-white/90 text-[12px] md:text-[15px] font-bold uppercase tracking-[0.06em] leading-[1.4]">
              {current.name2}
            </span>
          </Link>
        </div>
      </div>

      {/* Cue de scroll — invita a bajar, se apaga apenas el usuario arranca a scrollear */}
      <button
        onClick={() => window.scrollBy({ top: window.innerHeight * 0.9, behavior: 'smooth' })}
        aria-label="Scroll hacia abajo"
        className={`absolute bottom-5 md:bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5
                    text-white/80 transition-opacity duration-500 ${scrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <span className="text-[9px] uppercase tracking-[0.22em] font-medium [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]">Scroll</span>
        <svg className="animate-bounce" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.5))' }}>
          <path d="M3 6l5 5 5-5" />
        </svg>
      </button>

      {/* Logo STYLE&CULTURE top-left (escala con el scroll) */}
      <div className="absolute top-[calc(var(--offset)+0.75rem)] md:top-[calc(var(--offset)+5rem)] left-6 md:left-12 z-20 max-w-[52vw] md:max-w-[300px]">
        <div ref={titleRef} className="origin-top-left scale-[1.7] md:scale-100">
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
    {/* Spacer manual (reemplaza el pinSpacing automático de GSAP): reserva el
        scroll que dura el pin (grow + hold) antes de que la sección siguiente
        empiece a entrar y tape el hero. Solo hace falta en desktop (mobile ya
        no tiene pin, ver arriba) — ahí vale 0 y la sección siguiente sigue el
        flujo normal del documento, apareciendo de una en los 20dvh que le
        quedan libres a la sección de 80dvh. */}
    <div className="h-0 md:h-[100svh]" aria-hidden />
    </>
  );
}
