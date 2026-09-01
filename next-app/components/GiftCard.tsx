'use client';

import { IridescentFoil } from '@/components/ui/iridescent-foil';
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

/**
 * La tarjeta de regalo. Una sola: el color lo decide el monto (plata, oro,
 * esmeralda, black). Frente: logo oficial, nivel y monto sobre la lámina
 * iridiscente con trama. Dorso: el código entre cuatro esquinas, como una
 * tarjeta física rascada.
 *
 * Proporción 1.586 = la de una tarjeta física (85,6 x 53,98 mm), para que
 * siga leyéndose como tarjeta cuando alguien la captura y la reenvía.
 */
export function GiftCard({ monto, codigo, dorso = false, onClick, className }: GiftCardProps) {
  const tone = giftCardTone(monto);
  const claro = tone === 'negro';

  return (
    <div
      className={cn('relative aspect-[1.586] w-full [perspective:1200px]', className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? (dorso ? 'Ver frente de la tarjeta' : 'Ver dorso de la tarjeta') : undefined}
    >
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
              <p className="mt-1 text-[26px] font-bold leading-none sm:text-[32px]">{formatGiftAmount(monto)}</p>
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
            {/* Las cuatro esquinas. */}
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
  );
}
