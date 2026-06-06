'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

type Slide = { src: string; alt: string; title: string };

/**
 * Editorial de la columna izquierda que swappea imagen + título al llegar a la
 * mitad del scroll. Usa ScrollTrigger: cuando el centro de la imagen cruza el
 * centro del viewport pasa al segundo slide; al scrollear hacia arriba vuelve.
 * Imagen y título crossfadean juntos (cada slide es una capa que cambia opacidad).
 */
export default function NewInSwapEditorial({ slides }: { slides: Slide[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: 'center center', // centro de la imagen en el centro del viewport
        onEnter: () => setActive(1),
        onLeaveBack: () => setActive(0),
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-[8px] bg-bg-alt aspect-[3/4] lg:aspect-auto min-h-[320px] order-2 lg:order-1"
    >
      {slides.map((s, i) => (
        <div
          key={s.src}
          className={`absolute inset-0 transition-opacity duration-700 ${i === active ? 'opacity-100' : 'opacity-0'}`}
        >
          <Image
            src={s.src}
            alt={s.alt}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority={i === 0}
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
          <h3 className="absolute inset-x-5 bottom-5 text-white font-bold uppercase leading-none tracking-tight text-2xl md:text-3xl">
            {s.title}
          </h3>
        </div>
      ))}
    </div>
  );
}
