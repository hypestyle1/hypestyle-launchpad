'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { preload } from 'react-dom';

/**
 * Hero "limpio": foto a sangre completa con el wordmark centrado y el nombre de
 * la colección abajo. Nada más — sin card flotante, sin flechas, sin cue de
 * scroll, sin logo secundario. La sección entera es un link a la colección.
 *
 * Reemplaza a HeroHannaDrop (que queda en el repo). Las fotos se van rotando
 * solas con un crossfade lento; cada visita arranca por la misma para que la
 * primera imagen (el LCP del home) se pueda precargar desde el <head>.
 */
const SLIDE_MS = 5500;

const SLIDES = [
  { img: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/08/hero-stars-venezuela-DSC03294-scaled.jpg', pos: '58%' },
  { img: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/08/hero-hoodie-black-hstars-DSC03195-scaled.jpg', pos: '28%' },
  { img: '/hero/nicki-mesh.webp', pos: '34%' },
  { img: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/08/hero-hoodie-pink-juani-scaled.jpg', pos: '18%' },
  { img: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/08/hero-god-gave-me-style-espaldas-scaled.jpg', pos: '18%' },
];

export default function HeroEme() {
  preload(SLIDES[0].img, { as: 'image', fetchPriority: 'high' });

  const [slide, setSlide] = useState(0);
  // Igual que antes: cada foto se pide recién cuando le toca (o cuando es la
  // siguiente), así las que nadie mira no compiten con la primera.
  const [ready, setReady] = useState<Set<number>>(() => new Set([0]));

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), SLIDE_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setReady((prev) => {
      const next = (slide + 1) % SLIDES.length;
      if (prev.has(slide) && prev.has(next)) return prev;
      const s = new Set(prev);
      s.add(slide);
      s.add(next);
      return s;
    });
  }, [slide]);

  return (
    <section className="relative w-full h-[92svh] md:h-[100dvh] -mt-[var(--offset)] overflow-hidden bg-bg-dark">
      {SLIDES.map((s, i) => (
        <div
          key={s.img}
          className="absolute inset-0 bg-cover transition-opacity duration-[1600ms] ease-in-out"
          style={{
            opacity: i === slide ? 1 : 0,
            backgroundImage: ready.has(i) ? `url('${s.img}')` : undefined,
            backgroundPosition: `center ${s.pos}`,
          }}
        />
      ))}

      {/* Velo parejo para que el wordmark blanco se lea sobre cualquier foto */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      <Link
        href="/colecciones/fw26/"
        className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6 text-white"
        aria-label="Ver la colección FW26"
      >
        <Image
          src="/hero/hype-white.png"
          alt="Hype."
          width={200}
          height={88}
          priority
          className="w-[58vw] md:w-[30vw] h-auto [filter:drop-shadow(0_4px_28px_rgba(0,0,0,0.35))]"
        />
        <span className="mt-2 md:mt-3 text-[13px] md:text-[16px] tracking-[0.01em] text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.4)]">
          FW26 Collection · Fall Winter 2026
        </span>
      </Link>
    </section>
  );
}
