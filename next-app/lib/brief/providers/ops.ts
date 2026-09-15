// Providers de operaciones: pedidos pagados en curso y pedidos sin pagar.
// Solo I/O contra WC REST; la lógica vive en las reglas.

import { fetchProcessingOrders } from '@/lib/orders-fulfillment';
import { wcAuthHeader, WC_WP_URL } from '@/lib/wc-admin';
import { arLocalISO } from '../format';
import type { BriefProvider, PendingOrder } from '../types';

// Mismo piso histórico que /admin/pedidos: migración TN → Woo.
const ORDERS_FLOOR = '2026-05-10T00:00:00';

export const processingProvider: BriefProvider<'orders.processing'> = {
  key: 'orders.processing',
  domain: 'ops',
  load: () => fetchProcessingOrders(ORDERS_FLOOR),
};

function normalizePending(o: any): PendingOrder {
  const gmt = o.date_created_gmt ? `${o.date_created_gmt}Z`.replace(/Z+$/, 'Z') : null;
  const ms = gmt ? Date.parse(gmt) : NaN;
  return {
    id: Number(o.id),
    number: String(o.number ?? o.id),
    total: parseFloat(o.total) || 0,
    dateGmt: Number.isFinite(ms) ? new Date(ms).toISOString() : '',
    status: String(o.status || ''),
    customerName: `${o.billing?.first_name || ''} ${o.billing?.last_name || ''}`.trim(),
    phone: String(o.billing?.phone || '').trim(),
    paymentTitle: String(o.payment_method_title || ''),
  };
}

async function fetchByStatus(status: string, after: string): Promise<PendingOrder[]> {
  const out: PendingOrder[] = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(
      `${WC_WP_URL}/wp-json/wc/v3/orders?status=${status}&per_page=100&page=${page}&after=${after}`
      + `&_fields=id,number,total,date_created_gmt,status,billing,payment_method_title&_cb=${Date.now()}`,
      { headers: wcAuthHeader(), cache: 'no-store' },
    );
    if (!res.ok) throw new Error(`WC ${res.status} al leer pedidos ${status}`);
    const data = (await res.json()) as any[];
    if (!Array.isArray(data) || data.length === 0) break;
    for (const o of data) out.push(normalizePending(o));
    if (data.length < 100) break;
  }
  return out;
}

/** Pendientes y fallidos recientes. `after` va con un día de margen; la regla filtra por hora exacta. */
export const pendingProvider: BriefProvider<'orders.pending'> = {
  key: 'orders.pending',
  domain: 'ops',
  async load(ctx) {
    const after = arLocalISO(ctx.now.getTime() - (ctx.config.ops.pendingMaxHours + 24) * 3_600_000);
    const [pending, failed] = await Promise.all([fetchByStatus('pending', after), fetchByStatus('failed', after)]);
    return [...pending, ...failed];
  },
};
