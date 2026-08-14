/**
 * Acceso admin a la WC REST API desde el servidor (nunca desde el browser: las
 * claves son de lectura/escritura sobre todos los pedidos).
 *
 * Existe para las rutas que necesitan leer o anotar pedidos y no sólo marcarlos
 * como pagados — de eso último ya se ocupa lib/order-fulfill.ts, que mantiene su
 * propia copia del auth para no arrastrar dependencias en el camino crítico del
 * pago.
 */

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = (process.env.WC_CONSUMER_KEY || '').trim();
const WC_SEC = (process.env.WC_CONSUMER_SECRET || '').trim();

export function wcConfigured(): boolean {
  return !!WC_KEY && !!WC_SEC;
}

function auth(): string {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
}

export async function wcGet<T = any>(path: string): Promise<T | null> {
  if (!wcConfigured()) return null;
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/${path}`, {
    headers: { Authorization: auth() },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

export async function wcPost(path: string, body: unknown): Promise<boolean> {
  if (!wcConfigured()) return false;
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/${path}`, {
    method: 'POST',
    headers: { Authorization: auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.ok;
}

export async function wcPut(path: string, body: unknown): Promise<boolean> {
  if (!wcConfigured()) return false;
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/${path}`, {
    method: 'PUT',
    headers: { Authorization: auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.ok;
}

/** Meta donde queda el id de la orden de PayPal apenas se crea. Sin esto no hay
 *  forma de saber, ni después, si el cliente llegó a aprobar el pago. */
export const PAYPAL_ORDER_META = '_paypal_order_id';

export function metaValue(order: { meta_data?: { key: string; value: unknown }[] }, key: string): string | null {
  const m = (order.meta_data || []).find(x => x.key === key);
  const v = m?.value;
  return v === undefined || v === null || v === '' ? null : String(v);
}

/** Nota interna en el pedido. Es lo único que deja rastro visible en wp-admin. */
export async function wcNote(orderId: number, note: string): Promise<void> {
  await wcPost(`orders/${orderId}/notes`, { note, customer_note: false }).catch(() => false);
}
