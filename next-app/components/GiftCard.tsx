'use client';

import { IridescentFoil, type FoilTone } from '@/components/ui/iridescent-foil';
import { cn } from '@/lib/utils';

export type GiftCardTier = {
  /** Slug del producto en Woo. */
  slug: string;
  nombre: string;
  /** Monto fijo. La tarjeta a medida no lo tiene: lo elige quien compra. */
  monto?: number;
  tone: FoilTone;
  /** Color del texto y del logo sobre el metal. */
  ink: 'oscuro' | 'claro';
};

/** Los tres niveles fijos, en el orden en que se muestran. Slugs y montos se
 *  cierran contra Woo. */
export const GIFT_CARD_TIERS: GiftCardTier[] = [
  { slug: 'gift-card-plata', nombre: 'Plata', monto: 120000, tone: 'plata', ink: 'oscuro' },
  { slug: 'gift-card-oro', nombre: 'Oro', monto: 250000, tone: 'oro', ink: 'oscuro' },
  { slug: 'gift-card-esmeralda', nombre: 'Esmeralda', monto: 400000, tone: 'esmeralda', ink: 'oscuro' },
];

/** La tarjeta a medida: monto libre dentro de un rango, en pasos de $5.000. El
 *  rango se valida también del lado del servidor cuando se cree el pedido; acá
 *  sólo acota el input. */
export const GIFT_CARD_CUSTOM: GiftCardTier = {
  slug: 'gift-card-personalizada',
  nombre: 'A medida',
  tone: 'negro',
  ink: 'claro',
};
export const GIFT_CARD_CUSTOM_MIN = 50000;
export const GIFT_CARD_CUSTOM_MAX = 1000000;
export const GIFT_CARD_CUSTOM_STEP = 5000;

export const formatGiftAmount = (n: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);

type GiftCardProps = {
  tier: GiftCardTier;
  /** Pisa el monto del nivel. Lo usa la tarjeta a medida mientras se elige. */
  monto?: number;
  className?: string;
};

/**
 * La tarjeta de regalo. Es la lámina iridiscente con el logo oficial, el nivel y
 * el monto encima, más una trama fina de líneas para que lea como objeto impreso.
 *
 * Proporción 1.586 = la de una tarjeta física (85,6 x 53,98 mm). Se respeta para
 * que la pieza siga leyéndose como tarjeta cuando alguien la captura y la manda
 * por WhatsApp, que es la mitad del punto de una gift card.
 */
export function GiftCard({ tier, monto, className }: GiftCardProps) {
  const valor = monto ?? tier.monto;
  const claro = tier.ink === 'claro';

  return (
    <IridescentFoil
      tone={tier.tone}
      className={cn('hs-foil-intenso aspect-[1.586] w-full rounded-[8px]', className)}
    >
      {/* Trama de líneas finas (globals.css). Va dentro del contenido para
          quedar por encima del metal y por debajo del texto. */}
      <span aria-hidden className="hs-foil-trama" />
      <div
        className={cn(
          'relative flex h-full flex-col justify-between p-5 sm:p-6',
          claro ? 'text-white' : 'text-black',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Logo oficial, sin re-tipografiar. El PNG es negro: sobre el metal
              oscuro se invierte a blanco, que es la versión válida para fondos
              oscuros. */}
          <img
            src="/logo-hypestyle-2026.png"
            alt="Hypestyle"
            className={cn('h-4 w-auto object-contain sm:h-5', claro && 'invert')}
          />
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">
            {tier.nombre}
          </span>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60">
            Gift card
          </p>
          <p className="mt-1 text-[26px] font-bold leading-none sm:text-[32px]">
            {valor !== undefined ? formatGiftAmount(valor) : 'Vos elegís'}
          </p>
        </div>
      </div>
    </IridescentFoil>
  );
}
