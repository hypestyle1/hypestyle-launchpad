'use client';

// Eventos de Private Access para GA4 y Meta (custom events). Solo ids
// anónimos: `pa_id` es un hash que arma el servidor al desbloquear; el usuario
// de Instagram nunca sale del servidor ni llega a GA4 o Meta. El vínculo
// persona ↔ pedido vive solo en WordPress (meta `_hs_private_access`).
//
// Si el visitante no aceptó cookies, gtag/fbq no existen y el evento se
// descarta, igual que en lib/ga.ts.

const PA_ID_KEY = 'hype_pa_id';
const PA_ITEMS_KEY = 'hype_pa_items';
const COLLECTION = 'ss27-part-01';

const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} },
};

export type PaEvent =
  | 'private_access_banner_view'
  | 'private_access_open'
  | 'private_access_attempt'
  | 'private_access_granted'
  | 'private_access_denied'
  | 'private_product_view'
  | 'private_add_to_cart'
  | 'private_purchase';

export function setPaId(id: string | null | undefined): void {
  if (id) ls.set(PA_ID_KEY, id);
}

export function paTrack(event: PaEvent, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  const payload = { collection: COLLECTION, pa_id: ls.get(PA_ID_KEY) || undefined, ...params };
  const w = window as any;
  try { if (typeof w.gtag === 'function') w.gtag('event', event, payload); } catch {}
  try { if (typeof w.fbq === 'function') w.fbq('trackCustom', event, payload); } catch {}
}

/** Recuerda qué productos del carrito vinieron de la preventa (para el purchase). */
export function rememberPrivateItem(slug: string): void {
  const set = new Set<string>(JSON.parse(ls.get(PA_ITEMS_KEY) || '[]'));
  set.add(slug);
  ls.set(PA_ITEMS_KEY, JSON.stringify([...set].slice(-50)));
}

/** Desde /confirmacion: si el pedido trae productos de la preventa, dispara private_purchase. */
export function paTrackPurchase(order: { wcOrderNumber?: string; orderNum: string | number; items: { id?: string; price: number; quantity: number }[] }): void {
  let slugs: Set<string>;
  try { slugs = new Set(JSON.parse(ls.get(PA_ITEMS_KEY) || '[]')); } catch { return; }
  const own = order.items.filter(i => i.id && slugs.has(i.id));
  if (!own.length) return;
  paTrack('private_purchase', {
    transaction_id: String(order.wcOrderNumber || order.orderNum),
    value: own.reduce((s, i) => s + i.price * i.quantity, 0),
    currency: 'ARS',
    items: own.length,
  });
}
