'use client';

import { type PointerEvent, useRef, useState } from 'react';
import { IridescentFoil } from '@/components/ui/iridescent-foil';
import { ScrambleText } from '@/components/ui/scramble-text';
import { cn } from '@/lib/utils';
import { formatGiftAmount, giftCardTone, GIFT_CARD_TONE_LABEL } from '@/lib/gift-card';

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

/**
 * La tarjeta de regalo. Una sola: el color lo decide el monto (plata, oro,
 * esmeralda, black). Frente: logo oficial, nivel y monto sobre la lámina
 * iridiscente con trama. Dorso: el código entre cuatro esquinas, como una
 * tarjeta física rascada.
 *
 * Dos capas de transformación, una adentro de la otra:
 *  - la externa inclina hasta 7° siguiendo al puntero (sin transición, para
 *    que responda al instante) y vuelve suave al soltar;
 *  - la interna gira 180° para mostrar el dorso, con transición de 700 ms.
 * Separadas porque una sola `transform` con transición haría que la
 * inclinación "flotara" detrás del mouse. La inclinación sólo existe donde hay
 * puntero fino y sin reduced-motion; en touch queda el foil con el scroll.
 *
 * Proporción 1.586 = la de una tarjeta física (85,6 x 53,98 mm), para que
 * siga leyéndose como tarjeta cuando alguien la captura y la reenvía.
 */
export function GiftCard({ monto, codigo, dorso = false, onClick, className }: GiftCardProps) {
  const tone = giftCardTone(monto);
  const claro = tone === 'negro';
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
      {/* Capa de inclinación */}
      <div ref={tiltRef} className="h-full w-full [transform-style:preserve-3d]">
        {/* Capa de giro */}
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
            <IridescentFoil tone={tone} className="hs-foil-intenso h-full w-full rounded-[8px]">
              <span aria-hidden className="hs-foil-trama" />
              <div className={cn('relative flex h-full flex-col justify-between p-5 sm:p-6', claro ? 'text-white' : 'text-black')}>
                <div className="flex items-start justify-between gap-3">
                  {/* Logo oficial, sin re-tipografiar. Sobre el metal oscuro va en
                      blanco, que es la versión válida para fondos oscuros. */}
                  <img
                    src="/logo-hypestyle-2026.png"
                    alt="Hypestyle"
                    className={cn('h-4 w-auto object-contain sm:h-5', claro && 'invert')}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">
                    {GIFT_CARD_TONE_LABEL[tone]}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60">Gift card</p>
                  {/* Al cambiar el monto, el número viejo se descifra en el nuevo
                      mientras el metal cambia de color. */}
                  <ScrambleText
                    animateOnMount={false}
                    intervalMs={14}
                    className="mt-1 text-[26px] font-bold leading-none tabular-nums sm:text-[32px]"
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
            className="absolute inset-0 flex flex-col justify-between rounded-[8px] bg-[#0e0e0e] p-5 text-white [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-6"
          >
            <p className="text-center text-[9px] uppercase tracking-[0.2em] text-white/50">
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
            <div className="flex items-end justify-between text-[9px] uppercase tracking-[0.15em] text-white/50">
              <span>{formatGiftAmount(monto)}</span>
              <span>Se carga en el checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
