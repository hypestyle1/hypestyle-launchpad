// Avisos de stock ("Avisame cuando vuelva"): el cliente deja su mail para un
// talle agotado. Se guardan en WordPress (mu-plugin hypestyle-stock-alerts.php)
// y se leen desde el panel. Acá vive la validación, que es pura y tiene tests,
// y las llamadas al mu-plugin, que sólo corren en el servidor.

import type { NormalizedProduct } from './products-normalize';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = (process.env.WP_SECRET || '').trim();

export interface StockAlertInput {
  email: string;
  phone: string;
  slug: string;
  size: string;
  lang: string;
}

export interface StockAlertRow {
  id: number;
  email: string;
  phone: string;
  slug: string;
  name: string;
  size: string;
  lang: string;
  status: 'pending' | 'notified';
  createdAt: string;
  notifiedAt: string | null;
}

export interface StockAlertGroup {
  slug: string;
  name: string;
  size: string;
  count: number;
  lastAt: string;
}

export interface StockAlertsSnapshot {
  rows: StockAlertRow[];
  groups: StockAlertGroup[];
}

export type StockAlertError = 'email' | 'producto' | 'talle';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Lo que llega del formulario, recortado y en el formato que se guarda. */
export function cleanStockAlertInput(body: unknown): StockAlertInput {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  return {
    email: str(b.email).toLowerCase(),
    phone: str(b.phone).slice(0, 40),
    slug: str(b.slug).toLowerCase(),
    size: str(b.size),
    lang: str(b.lang).toUpperCase() || 'ES',
  };
}

/**
 * Valida un pedido de aviso contra el catálogo. Devuelve el producto si está
 * todo bien, o el motivo del rechazo.
 *
 * Sólo se acepta un talle que existe en ese producto, así la lista no se llena
 * de productos o talles inventados. No se exige que el catálogo lo dé por
 * agotado: la página de producto consulta el stock en vivo al agregar al
 * carrito y puede saber que un talle se agotó antes que el catálogo cacheado.
 */
export function validateStockAlert(
  input: StockAlertInput,
  products: NormalizedProduct[],
): { ok: true; product: NormalizedProduct } | { ok: false; error: StockAlertError } {
  if (input.email.length > 190 || !EMAIL_RE.test(input.email)) return { ok: false, error: 'email' };
  const product = products.find(p => p.slug === input.slug);
  if (!product) return { ok: false, error: 'producto' };
  if (!product.sizes.includes(input.size)) return { ok: false, error: 'talle' };
  return { ok: true, product };
}

export const STOCK_ALERT_ERROR_TEXT: Record<StockAlertError, string> = {
  email: 'Revisá el mail',
  producto: 'No encontramos ese producto',
  talle: 'Ese talle no existe en este producto',
};

/** Mails únicos de un grupo de filas, para copiar y pegar en un envío. */
export function uniqueEmails(rows: Pick<StockAlertRow, 'email'>[]): string[] {
  return [...new Set(rows.map(r => r.email))];
}

// ── Llamadas al mu-plugin (server-side) ─────────────────────────────────────

function wpHeaders(extra?: Record<string, string>): Record<string, string> {
  return { 'X-Hypestyle-Secret': WP_SECRET, ...(extra || {}) };
}

async function post(path: string, body: unknown): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/${path}`, {
      method: 'POST',
      headers: wpHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export async function saveStockAlert(input: StockAlertInput, productName: string) {
  return post('stock-alerts', { ...input, name: productName });
}

export async function loadStockAlerts(status: 'pending' | 'notified' | 'all' = 'pending'): Promise<StockAlertsSnapshot | null> {
  try {
    // _cb saltea el caché de LiteSpeed del server de WP.
    const res = await fetch(
      `${WP_URL}/wp-json/hypestyle/v1/stock-alerts?status=${status}&_cb=${Date.now()}`,
      { headers: wpHeaders(), cache: 'no-store' },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !Array.isArray(data.rows) || !Array.isArray(data.groups)) return null;
    return { rows: data.rows, groups: data.groups };
  } catch {
    return null;
  }
}

export async function markStockAlerts(
  target: { ids: number[] } | { slug: string; size: string },
  status: 'pending' | 'notified',
) {
  return post('stock-alerts-mark', { ...target, status });
}

export async function deleteStockAlert(id: number) {
  return post('stock-alerts-delete', { id });
}
