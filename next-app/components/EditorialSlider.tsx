'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';

type Slide = { src: string; type?: 'image' | 'video' };

const IMAGE_DURATION = 4000;

/**
 * Slider editorial con crossfade + dots. Soporta imágenes y videos.
 * - Imágenes: autoavance cada 4s.
 * - Videos: autoavance al terminar (onEnded), sin loop.
 * Pensado para ir dentro de un contenedor `relative overflow-hidden` (rellena con inset-0).
 */
export default function EditorialSlider({
  images,
  slides: slidesProp,
  alt,
}: {
  images?: string[];
  slides?: Slide[];
  alt: string;
}) {
  const slides: Slide[] = slidesProp ?? (images ?? []).map(src => ({ src, type: 'image' as const }));
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advance = useCallback(() => {
    setIdx(i => (i + 1) % slides.length);
  }, [slides.length]);

  // Al cambiar de slide: si es imagen arranca el timer; si es video no (usa onEnded).
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const current = slides[idx];
    if (!current) return;
    if ((current.type ?? 'image') === 'image') {
      if (!paused && slides.length > 1) {
        timerRef.current = setTimeout(advance, IMAGE_DURATION);
      }
    } else {
      // Video: reinicia el video del slide activo
      const vid = videoRefs.current[idx];
      if (vid) { vid.currentTime = 0; vid.play().catch(() => {}); }
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [idx, paused, slides.length]);

  // Pausa activa: detener video en curso y cancelar timer de imagen.
  useEffect(() => {
    if (paused) {
      if (timerRef.current) clearTimeout(timerRef.current);
      const vid = videoRefs.current[idx];
      if (vid && !vid.paused) vid.pause();
    } else {
      const current = slides[idx];
      if ((current?.type ?? 'image') === 'image') {
        timerRef.current = setTimeout(advance, IMAGE_DURATION);
      } else {
        const vid = videoRefs.current[idx];
        if (vid) vid.play().catch(() => {});
      }
    }
  }, [paused]);

  return (
    <div
      className="absolute inset-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((slide, i) => {
        const isVideo = slide.type === 'video';
        return (
          <div
            key={slide.src}
            className={`absolute inset-0 transition-opacity duration-700 ${i === idx ? 'opacity-100' : 'opacity-0'}`}
          >
            {isVideo ? (
              <video
                ref={el => { videoRefs.current[i] = el; }}
                src={slide.src}
                className="absolute inset-0 h-full w-full object-cover object-center"
                muted
                playsInline
                preload="metadata"
                onEnded={() => { if (!paused) advance(); }}
              />
            ) : (
              <Image
                src={slide.src}
                alt={alt}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority={i === 0}
                className="object-cover object-center"
              />
            )}
          </div>
        );
      })}

      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir a la imagen ${i + 1}`}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
