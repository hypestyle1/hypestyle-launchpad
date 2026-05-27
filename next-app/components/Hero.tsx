'use client';

import { useState, useEffect } from "react";
import Image from "next/image";

type Slide = {
  imageDesktop: string;
  imageMobile: string;
  href: string;
  overlayRight?: {
    sublabel: string;
    label: string;
    cta: string;
  };
};

const slides: Slide[] = [
  {
    imageDesktop: "banner desktop/DSCF6201.jpg",
    imageMobile: "banner desktop/DSCF6203.jpg",
    href: "/colecciones/camo-set-drop/",
    overlayRight: {
      sublabel: "FW26",
      label: "Camo Drop",
      cta: "Ver colección",
    },
  },
  {
    imageDesktop: "banner desktop/DSCF6201.jpg",
    imageMobile: "banner desktop/IMG_0229.jpg",
    href: "/productos/",
  },
  {
    imageDesktop: "banner desktop/DSCF6201.jpg",
    imageMobile: "banner desktop/IMG_5593.jpg",
    href: "/productos/",
  },
  {
    imageDesktop: "banner desktop/DSCF6201.jpg",
    imageMobile: "banner desktop/IMG_0043.jpg",
    href: "/productos/",
  },
];

export default function Hero() {
  const [slide, setSlide] = useState<Slide | null>(null);

  useEffect(() => {
    setSlide(slides[Math.floor(Math.random() * slides.length)]);
  }, []);

  if (!slide) return (
    <div className="w-full bg-bg-dark aspect-[4/5] md:aspect-[1580/810]" />
  );

  return (
    <section className="relative w-full overflow-hidden bg-bg-dark aspect-[4/5] md:aspect-[1580/810]">
      <a href={slide.href} className="block w-full h-full">
        <div className="relative w-full h-full">
          {/* Mobile */}
          <Image
            src={`/${slide.imageMobile}`}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover md:hidden"
            style={{ objectPosition: '50% 80%' }}
          />
          {/* Desktop */}
          <Image
            src={`/${slide.imageDesktop}`}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center hidden md:block"
          />
        </div>
      </a>

      {/* Desktop: gradiente + overlay siempre visible */}
      <div
        className="absolute inset-0 hidden md:block pointer-events-none"
        style={{ background: "linear-gradient(to left, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.25) 42%, transparent 62%)" }}
      />
      <div className="absolute inset-0 hidden md:flex flex-col items-end justify-center pr-14 pointer-events-none">
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/60 mb-3">FW26</p>
        <h2 className="text-[52px] font-bold uppercase text-white leading-none mb-7">Camo Drop</h2>
        <a
          href="/colecciones/camo-set-drop/"
          className="pointer-events-auto px-7 py-3 bg-white text-black text-[11px] uppercase tracking-[0.18em] font-medium hover:bg-white/85 transition-colors duration-300"
        >
          Ver colección
        </a>
      </div>
    </section>
  );
}
