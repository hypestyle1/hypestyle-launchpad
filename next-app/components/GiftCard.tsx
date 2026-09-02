'use client';

import { type PointerEvent, useRef, useState } from 'react';
import { IridescentFoil } from '@/components/ui/iridescent-foil';
import { ScrambleText } from '@/components/ui/scramble-text';
import { cn } from '@/lib/utils';
import { formatGiftAmount, giftCardTone } from '@/lib/gift-card';

type GiftCardProps = {
  monto: number;
  /** Código en el dorso. Si viene, la tarjeta puede darse vuelta. */
  codigo?: string;
  /** Muestra el dorso (con el código) en vez del frente. */
  dorso?: boolean;
  onClick?: () => void;
  className?: string;
};

const TILT_MEDIA = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';
const TILT_MAX = 7; // grados

/** Numeración del frente: como una tarjeta física, oculta salvo el último bloque. */
function numeracion(codigo?: string) {
  const m = codigo?.match(/^HYPE-([A-Z0-9]{4})-([A-Z0-9]{4})$/i);
  return m ? `HYPE-••••-${m[2].toUpperCase()}` : 'HYPE-••••-••••';
}

/**
 * La gift card. Negra, como una tarjeta bancaria: el logo oficial en relieve
 * satinado al centro, STYLE&CULTURE arriba a la derecha, la numeración abajo
 * a la izquierda y el monto abajo a la derecha. Detrás, el foil holográfico
 * negro y un patrón de líneas finas.
 *
 * Dos capas de transformación anidadas: la externa inclina hasta 7° con el
 * puntero (80 ms, sin flotar) y vuelve suave al soltar; la interna gira 180°
 * para el dorso con 700 ms. Sólo hay inclinación con puntero fino y sin
 * reduced-motion; en touch queda el foil con el scroll.
 *
 * Proporción 1.586 = la de una tarjeta física (85,6 x 53,98 mm).
 */
export function GiftCard({ monto, codigo, dorso = false, onClick, className }: GiftCardProps) {
  const tone = giftCardTone(monto);
  const tiltRef = useRef<HTMLDivElement>(null);
  const [inclina] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(TILT_MEDIA).matches,
  );

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = tiltRef.current;
    if (!el || !inclina) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transition = 'transform 80ms ease-out';
    el.style.transform = `rotateX(${(-y * TILT_MAX * 2).toFixed(2)}deg) rotateY(${(x * TILT_MAX * 2).toFixed(2)}deg) scale(1.015)`;
  };
  const onLeave = () => {
    const el = tiltRef.current;
    if (!el) return;
    el.style.transition = 'transform 500ms cubic-bezier(0.23, 1, 0.32, 1)';
    el.style.transform = '';
  };

  return (
    <div
      className={cn('relative aspect-[1.586] w-full [perspective:1200px]', className)}
      onClick={onClick}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? (dorso ? 'Ver frente de la tarjeta' : 'Ver dorso de la tarjeta') : undefined}
    >
      <div ref={tiltRef} className="h-full w-full [transform-style:preserve-3d]">
        <div
          className={cn(
            'relative h-full w-full transition-transform duration-700 [transform-style:preserve-3d] motion-reduce:transition-none',
            dorso && '[transform:rotateY(180deg)]',
          )}
        >
          {/* Frente. El foil va dentro de un wrapper absoluto: `.hs-foil` fija
              `position: relative` fuera de las capas de Tailwind y le ganaría a
              un `absolute` puesto por utility, dejándolo sin alto. */}
          <div className="absolute inset-0 [backface-visibility:hidden]">
            <IridescentFoil tone={tone} className="hs-foil-intenso h-full w-full rounded-[10px]">
              <span aria-hidden className="hs-gift-pattern" />
              <div className="relative flex h-full flex-col justify-between p-5 text-white sm:p-6">
                {/* Arriba: STYLE&CULTURE a la derecha, como el "Global" de una
                    tarjeta bancaria. */}
                <div className="flex items-start justify-end">
                  <img
                    src="/STYLE&CULTURE WHITE.png"
                    alt="Style & Culture"
                    className="h-[9px] w-auto object-contain opacity-80 sm:h-[10px]"
                  />
                </div>

                {/* Centro: el logo oficial en relieve. */}
                <div className="flex flex-1 items-center justify-center">
                  <div className="hs-emboss w-[44%] max-w-[220px]" aria-label="Hypestyle" role="img">
                    <span className="hs-emboss-shadow" />
                    <span className="hs-emboss-light" />
                    <span className="hs-emboss-face" />
                  </div>
                </div>

                {/* Abajo: numeración a la izquierda, monto a la derecha. */}
                <div className="flex items-end justify-between gap-4">
                  <span className="font-mono text-[11px] tracking-[0.22em] text-white/75 sm:text-[12px]">
                    {numeracion(codigo)}
                  </span>
                  <ScrambleText
                    animateOnMount={false}
                    intervalMs={14}
                    className="text-[15px] font-semibold tabular-nums tracking-tight sm:text-[17px]"
                  >
                    {formatGiftAmount(monto)}
                  </ScrambleText>
                </div>
              </div>
            </IridescentFoil>
          </div>

          {/* Dorso: negro mate, el código entre las esquinas. */}
          <div
            aria-hidden={!dorso}
            className="absolute inset-0 flex flex-col justify-between rounded-[10px] bg-[#0e0e0e] p-5 text-white [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-6"
          >
            <p className="text-center text-[10px] uppercase tracking-[0.2em] text-white/60">
              Código válido en hypestyle.com.ar
            </p>
            <div className="relative mx-auto w-full max-w-[280px] py-5">
              <span aria-hidden className="absolute left-0 top-0 h-3 w-3 border-l border-t border-white/60" />
              <span aria-hidden className="absolute right-0 top-0 h-3 w-3 border-r border-t border-white/60" />
              <span aria-hidden className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-white/60" />
              <span aria-hidden className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-white/60" />
              <p className="text-center font-mono text-[18px] font-bold tracking-[0.18em] sm:text-[22px]">
                {codigo ?? 'HYPE-••••-••••'}
              </p>
            </div>
            <div className="flex items-end justify-between text-[10px] uppercase tracking-[0.15em] text-white/60">
              <span>{formatGiftAmount(monto)}</span>
              <span>Se carga en el checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
