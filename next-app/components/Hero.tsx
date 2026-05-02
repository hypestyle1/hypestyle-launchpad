'use client';

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";

type BannerSlide = {
  type: "banner";
  imageDesktop: string;
  imageMobile: string;
  href: string;
};

type OverlaySlide = {
  type: "overlay";
  imageDesktop: string;
  imageMobile: string;
  label: string;
  sublabel: string;
  cta: string;
  href: string;
};

type Slide = BannerSlide | OverlaySlide;

const slides: Slide[] = [
  {
    type: "banner",
    imageDesktop: "banner desktop/2-slide-1774199985083-578615582-b6c9592f4752284284165dfb7d5633d01774199986-1920-1920.webp",
    imageMobile: "Banner Movile/2-slide-1774199985089-7163840392-14dbaf7acdc4aaa8e83700e9e1d4f6b51774199990-1920-1920.webp",
    href: "/sets/",
  },
  {
    type: "banner",
    imageDesktop: "banner desktop/banner web 1.webp",
    imageMobile: "Banner Movile/2-slide-1775426199856-2293205106-6ebf06ac84175b43435d613cd6e659cc1775426225-1920-1920.webp",
    href: "/productos/",
  },
  {
    type: "banner",
    imageDesktop: "banner desktop/banner web 2.webp",
    imageMobile: "Banner Movile/2-slide-1770743028998-1812841277-d6e90ca1a8aa16296d47ce6e591779b61770743049-1920-1920.webp",
    href: "/productos/",
  },
  {
    type: "overlay",
    imageDesktop: "stl-look-camo-outdoor.png",
    imageMobile: "Banner Movile/zipup2-pink.webp",
    label: "Camo Set Drop",
    sublabel: "La colección",
    cta: "Shop Now",
    href: "/sets/",
  },
];

export default function Hero() {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), []);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + slides.length) % slides.length), []);

  useEffect(() => {
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next]);

  return (
    <section
      className="relative w-full overflow-hidden bg-bg-dark aspect-[4/5] md:aspect-[1580/700]"
    >
      {slides.map((s, i) => (
        <div
          key={s.imageDesktop}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === current ? 1 : 0, pointerEvents: i === current ? "auto" : "none" }}
        >
          <a href={s.href} className="block w-full h-full">
            <div className="relative w-full h-full">
              {/* Mobile */}
              <Image
                src={`/${s.imageMobile}`}
                alt=""
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-cover object-center md:hidden"
              />
              {/* Desktop */}
              <Image
                src={`/${s.imageDesktop}`}
                alt=""
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-cover object-center hidden md:block"
              />
            </div>
          </a>

          {s.type === "overlay" && (
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-20 pointer-events-none">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/60 mb-2">{s.sublabel}</p>
              <h2 className="text-[40px] md:text-[64px] font-bold uppercase text-white leading-none mb-6">
                {s.label}
              </h2>
              <a
                href={s.href}
                className="pointer-events-auto px-8 py-3 border border-white text-white text-[12px] uppercase tracking-[0.18em] hover:bg-white hover:text-black transition-colors duration-300"
              >
                {s.cta}
              </a>
            </div>
          )}
        </div>
      ))}

      {/* Flechas */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-white/60 hover:text-white transition-colors z-10"
        aria-label="Anterior"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M13 4L7 10L13 16" />
        </svg>
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-white/60 hover:text-white transition-colors z-10"
        aria-label="Siguiente"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M7 4L13 10L7 16" />
        </svg>
      </button>

      {/* Dots */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="transition-all duration-300"
            aria-label={`Slide ${i + 1}`}
          >
            <span
              className="block rounded-full bg-white transition-all duration-300"
              style={{
                width: i === current ? "20px" : "6px",
                height: "6px",
                opacity: i === current ? 1 : 0.4,
              }}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
