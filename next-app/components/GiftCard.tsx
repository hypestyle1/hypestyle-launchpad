'use client';

import { type PointerEvent, type ReactNode, useRef, useState } from 'react';
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

/** Una cara de la tarjeta: la misma lámina negra satinada y el mismo patrón
 *  para el frente y el dorso; cambia sólo lo que va al centro y abajo. */
function Cara({ tone, centro, abajoIzq, abajoDer }: {
  tone: ReturnType<typeof giftCardTone>;
  centro: ReactNode;
  abajoIzq: ReactNode;
  abajoDer: ReactNode;
}) {
  return (
    <IridescentFoil tone={tone} className="hs-foil-intenso h-full w-full rounded-[10px]">
      <span aria-hidden className="hs-gift-pattern" />
      <div className="relative flex h-full flex-col justify-between p-5 text-white sm:p-6">
        <div className="flex items-start justify-end">
          <img
            src="/STYLE&CULTURE WHITE.png"
            alt="Style & Culture"
            className="h-[9px] w-auto object-contain opacity-80 sm:h-[10px]"
          />
        </div>
        <div className="flex flex-1 items-center justify-center">{centro}</div>
        <div className="flex items-end justify-between gap-4">
          {abajoIzq}
          {abajoDer}
        </div>
      </div>
    </IridescentFoil>
  );
}

/**
 * La gift card. Negra satinada, como una tarjeta bancaria. Frente: el logo
 * oficial en relieve al centro, STYLE&CULTURE arriba a la derecha, la
 * numeración abajo a la izquierda y el monto a la derecha. Dorso: la misma
 * base, con el código entre cuatro esquinas donde iba el logo.
 *
 * Dos capas de transformación anidadas: la externa inclina hasta 7° con el
 * puntero (80 ms, sin flotar) y vuelve suave al soltar; la interna gira 180°
 * para el dorso con 700 ms. Sólo hay inclinación con puntero fino y sin
 * reduced-motion; en touch queda la lámina con el scroll.
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

  const montoEl = (
    <ScrambleText
      animateOnMount={false}
      intervalMs={14}
      numeric
      className="text-[15px] font-semibold tabular-nums tracking-tight sm:text-[17px]"
    >
      {formatGiftAmount(monto)}
    </ScrambleText>
  );

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
            <Cara
              tone={tone}
              centro={
                <div className="hs-emboss w-[44%] max-w-[220px]" aria-label="Hypestyle" role="img">
                  <span className="hs-emboss-shadow" />
                  <span className="hs-emboss-light" />
                  <span className="hs-emboss-face" />
                </div>
              }
              abajoIzq={
                <span className="font-mono text-[11px] tracking-[0.22em] text-white/75 sm:text-[12px]">
                  {numeracion(codigo)}
                </span>
              }
              abajoDer={montoEl}
            />
          </div>

          {/* Dorso: misma base; el código entre cuatro esquinas donde iba el logo. */}
          <div
            aria-hidden={!dorso}
            className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]"
          >
            <Cara
              tone={tone}
              centro={
                <div className="relative w-[72%] max-w-[300px] py-5">
                  <span aria-hidden className="absolute left-0 top-0 h-3 w-3 border-l border-t border-white/70" />
                  <span aria-hidden className="absolute right-0 top-0 h-3 w-3 border-r border-t border-white/70" />
                  <span aria-hidden className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-white/70" />
                  <span aria-hidden className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-white/70" />
                  <p className="text-center font-mono text-[18px] font-bold tracking-[0.2em] sm:text-[22px]">
                    {codigo ?? 'HYPE-••••-••••'}
                  </p>
                </div>
              }
              abajoIzq={
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/70">
                  Se carga en el checkout
                </span>
              }
              abajoDer={montoEl}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
