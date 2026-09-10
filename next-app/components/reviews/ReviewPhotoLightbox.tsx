'use client';

import { useEffect, useRef, useState } from 'react';
import type { PublicReviewPhoto } from '@/lib/reviews/types';

/**
 * Visor mínimo para las fotos de una reseña: fondo oscuro, la foto grande,
 * flechas si hay más de una, Escape/click afuera para cerrar. Sin librería —
 * es una sola imagen por vez y no vale la pena cargar nada más.
 */
export default function ReviewPhotoLightbox({
  photos,
  index,
  onClose,
}: {
  photos: PublicReviewPhoto[];
  index: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(index);
  const closeRef = useRef<HTMLButtonElement>(null);
  const total = photos.length;

  useEffect(() => { setCurrent(index); }, [index]);

  useEffect(() => {
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'ArrowRight' && total > 1) setCurrent((c) => (c + 1) % total);
      if (e.key === 'ArrowLeft' && total > 1) setCurrent((c) => (c - 1 + total) % total);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose, total]);

  const photo = photos[current];
  if (!photo) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${current + 1} de ${total}`}
      className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M1 1l12 12M13 1L1 13" />
        </svg>
      </button>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c - 1 + total) % total); }}
            aria-label="Foto anterior"
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c + 1) % total); }}
            aria-label="Foto siguiente"
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.full}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[85vh] object-contain rounded-[6px] select-none"
        draggable={false}
      />

      {total > 1 && (
        <p className="absolute bottom-4 left-0 right-0 text-center text-[12px] text-white/60 tabular-nums">
          {current + 1} / {total}
        </p>
      )}
    </div>
  );
}
