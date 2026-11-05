// Plazo de pago de una campaña mayorista (Flash Cyber, 05/11/2026).
//
// Algunas campañas valen solo si el mayorista transfiere dentro de X horas de
// confirmar el pedido; si no, el pedido se cobra a precio mayorista normal.
// El repricing NO es automático: esto deja el plazo a la vista (portal,
// carrito, mails, orden y admin) y lo guarda en la orden como meta
// `_wholesale_pago_vence` (ISO UTC).
//
// Vive acá, por id de campaña, y no como campo de la campaña porque el PHP
// (hype_wc_campaign_shape) guarda solo los campos que conoce: un campo nuevo
// se perdería sin subir el PHP. Si esto se vuelve recurrente, pasarlo a la
// campaña (PHP + lib/wholesale-campaigns.ts) y borrar este mapa.

export const FLASH_CYBER_CAMPAIGN_ID = 'flash-cyber-mayorista-nov26';

export const PAYMENT_WINDOW_HOURS: Readonly<Record<string, number>> = {
  [FLASH_CYBER_CAMPAIGN_ID]: 24,
};

// Foto del hero por campaña (mismo motivo que el plazo: el PHP no guarda
// campos nuevos). Zip Hoodie Camo Olive, foto real de producto en Woo.
export const CAMPAIGN_HERO_IMAGE: Readonly<Record<string, string>> = {
  [FLASH_CYBER_CAMPAIGN_ID]: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/11/zip-hoodie-camo-olive-foto-1-scaled.jpg',
};

export function heroImageFor(campaignId?: string | null): string | null {
  return (campaignId && CAMPAIGN_HERO_IMAGE[campaignId]) || null;
}

/** % off sobre precio de lista de un precio de campaña (ej. 45.000 sobre 100.000 → 55). */
export function listOffPct(price: number, regularPrice: number): number {
  if (!(regularPrice > 0) || !(price >= 0)) return 0;
  return Math.round((1 - price / regularPrice) * 100);
}

export const PAGO_VENCE_META = '_wholesale_pago_vence';

export function paymentWindowFor(campaignId?: string | null): number | null {
  if (!campaignId) return null;
  const h = PAYMENT_WINDOW_HOURS[campaignId];
  return typeof h === 'number' && h > 0 ? h : null;
}

/** Vencimiento del pago (ISO UTC) para un pedido confirmado en `from`, o null si la campaña no tiene plazo. */
export function paymentDeadline(campaignId: string | null | undefined, from: Date | number = Date.now()): string | null {
  const h = paymentWindowFor(campaignId);
  if (!h) return null;
  const t = typeof from === 'number' ? from : from.getTime();
  return new Date(t + h * 3600_000).toISOString();
}

/** "vie 6/11 18:32" en hora de Buenos Aires. */
export function fmtDeadlineAR(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  return `${get('weekday').replace('.', '')} ${get('day')}/${get('month')} ${get('hour')}:${get('minute')}`;
}

/** Texto corto de la condición, para el carrito y el banner. */
export function paymentWindowCopy(hours: number): string {
  return `El precio de esta campaña vale si transferís dentro de las ${hours} h de confirmar el pedido. Pasado ese plazo, el pedido se cobra a precio mayorista normal.`;
}
