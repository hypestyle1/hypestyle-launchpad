'use client';

import { IridescentFoil, type FoilTone } from '@/components/ui/iridescent-foil';
import { cn } from '@/lib/utils';

export type GiftCardTier = {
  /** Slug del producto en Woo. */
  slug: string;
  nombre: string;
  monto: number;
  tone: FoilTone;
};

/** Los tres niveles de la gift card. El monto y el slug se cierran contra Woo;
 *  el orden acá es el orden en que se muestran. */
export const GIFT_CARD_TIERS: GiftCardTier[] = [
  { slug: 'gift-card-plata', nombre: 'Plata', monto: 120000, tone: 'plata' },
  { slug: 'gift-card-oro', nombre: 'Oro', monto: 250000, tone: 'oro' },
  { slug: 'gift-card-esmeralda', nombre: 'Esmeralda', monto: 400000, tone: 'esmeralda' },
];

const money = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

type GiftCardProps = {
  tier: GiftCardTier;
  className?: string;
};

/**
 * La tarjeta de regalo. Es la lámina iridiscente con el logo oficial, el nivel y
 * el monto encima.
 *
 * Proporción 1.586 = la de una tarjeta física (85,6 x 53,98 mm). Se respeta para
 * que la pieza siga leyéndose como tarjeta cuando alguien la captura y la manda
 * por WhatsApp, que es la mitad del punto de una gift card.
 */
export function GiftCard({ tier, className }: GiftCardProps) {
  return (
    <IridescentFoil
      tone={tier.tone}
      className={cn('hs-foil-intenso aspect-[1.586] w-full rounded-[8px]', className)}
    >
      {/* Trama de líneas finas (globals.css). Va dentro del contenido para
          quedar por encima del metal y por debajo del texto. */}
      <span aria-hidden className="hs-foil-trama" />
      <div className="relative flex h-full flex-col justify-between p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          {/* Logo oficial, sin re-tipografiar y sin filtros: sobre los tres
              metales el negro tiene contraste de sobra. */}
          <img
            src="/logo-hypestyle-2026.png"
            alt="Hypestyle"
            className="h-4 w-auto object-contain sm:h-5"
          />
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/70">
            {tier.nombre}
          </span>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/60">
            Gift card
          </p>
          <p className="mt-1 text-[26px] font-bold leading-none text-black sm:text-[32px]">
            {money.format(tier.monto)}
          </p>
        </div>
      </div>
    </IridescentFoil>
  );
}
