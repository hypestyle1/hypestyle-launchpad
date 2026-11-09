'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';

export type HomeSlide = { src: string; alt: string; posicion?: string };

/**
 * Foto editorial que pasa sola entre varias (crossfade lento), con esquinas
 * sutilmente redondeadas, un chip de vidrio con el nombre y los indicadores
 * como píldoras. Respeta prefers-reduced-motion (queda en la primera foto).
 * Toda la pieza es un link.
 */
export default function HomePhotoCarousel({
  slides,
  href,
  chip,
  className = '',
  intervalo = 3600,
}: {
  slides: HomeSlide[];
  href: string;
  chip?: string;
  className?: string;
  intervalo?: number;
}) {
  const [i, setI] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const enVista = useInView(ref, { margin: '200px 0px' });
  // Fotos ya pedidas: la actual y la siguiente. Una vez cargada, queda.
  const [cargadas, setCargadas] = useState<Set<number>>(() => new Set([0]));

  useEffect(() => {
    if (!enVista) return;
    setCargadas((prev) => {
      const sig = (i + 1) % slides.length;
      if (prev.has(i) && prev.has(sig)) return prev;
      return new Set([...prev, i, sig]);
    });
  }, [i, enVista, slides.length]);

  useEffect(() => {
    if (!enVista || slides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), intervalo);
    return () => clearInterval(t);
  }, [slides.length, intervalo, enVista]);

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden rounded-[10px] bg-bg-alt shadow-[0_18px_40px_-24px_rgba(10,10,10,0.35)] ${className}`}
    >
      {slides.map((s, k) =>
        cargadas.has(k) ? (
        <Image
          key={s.src}
          src={s.src}
          alt={s.alt}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          quality={80}
          priority={false}
          className="object-cover transition-opacity duration-[900ms] ease-out"
          style={{ opacity: k === i ? 1 : 0, objectPosition: s.posicion ?? '50% 40%' }}
        />
        ) : null,
      )}
      <Link href={href} aria-label={chip ?? slides[0]?.alt} className="absolute inset-0 z-[1]" />

      {chip && (
        <span className="pointer-events-none absolute left-3 top-3 z-[2] rounded-full bg-white/60 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-foreground shadow-[0_4px_14px_rgba(0,0,0,0.12)] ring-1 ring-white/50 backdrop-blur-md md:left-4 md:top-4 md:text-[11px]">
          {chip}
        </span>
      )}

      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-[2] flex -translate-x-1/2 gap-1.5 rounded-full bg-black/20 px-2.5 py-2 backdrop-blur-md md:bottom-4">
          {slides.map((s, k) => (
            <button
              key={s.src}
              type="button"
              aria-label={`Foto ${k + 1} de ${slides.length}`}
              onClick={() => { setCargadas((prev) => new Set([...prev, k])); setI(k); }}
              className={`h-[4px] rounded-full transition-all duration-300 ${k === i ? 'w-5 bg-white' : 'w-[6px] bg-white/55'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
