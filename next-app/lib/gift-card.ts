// Reglas de la gift card compartidas por la página, el carrito, el checkout y
// el mail. El backend (PHP/hypestyle-gift-cards.php) valida lo mismo: si se
// cambia acá hay que cambiarlo allá.

export const GIFT_CARD_SLUG = 'gift-card';
export const GIFT_CARD_MIN = 50000;
export const GIFT_CARD_MAX = 1000000;
export const GIFT_CARD_STEP = 50000;

/** Montos sugeridos como pills. El resto se elige a mano, de a $50.000. */
export const GIFT_CARD_PRESETS = [50000, 100000, 150000, 200000, 300000, 500000];

/** Vigencia desde la emisión, en meses. Mismo valor que HS_GIFT_VIGENCIA_MESES en el PHP. */
export const GIFT_CARD_VIGENCIA_MESES = 12;

export type GiftCardTone = 'plata' | 'oro' | 'esmeralda' | 'negro';

/** El color de la tarjeta lo decide el monto. */
export function giftCardTone(monto: number): GiftCardTone {
  if (monto >= 500000) return 'negro';
  if (monto >= 300000) return 'esmeralda';
  if (monto >= 150000) return 'oro';
  return 'plata';
}

export const GIFT_CARD_TONE_LABEL: Record<GiftCardTone, string> = {
  plata: 'Plata',
  oro: 'Oro',
  esmeralda: 'Esmeralda',
  negro: 'Black',
};

/** Redondea al paso y acota al rango. */
export function clampGiftAmount(n: number): number {
  const paso = Math.round(n / GIFT_CARD_STEP) * GIFT_CARD_STEP;
  return Math.min(GIFT_CARD_MAX, Math.max(GIFT_CARD_MIN, paso || GIFT_CARD_MIN));
}

export function isValidGiftAmount(n: number): boolean {
  return Number.isFinite(n) && n >= GIFT_CARD_MIN && n <= GIFT_CARD_MAX && n % GIFT_CARD_STEP === 0;
}

export const formatGiftAmount = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

/** Datos de regalo que viajan con la línea del carrito hasta el pedido. */
export type GiftData = {
  paraEmail?: string;
  paraNombre?: string;
  deNombre?: string;
  mensaje?: string;
  /** YYYY-MM-DD. Vacío = mandar apenas se acredite el pago. */
  enviarEl?: string;
};

export function isGiftCardItem(item: { id: string }): boolean {
  return item.id === GIFT_CARD_SLUG;
}
