// Fetch de pedidos para el Profitability Engine. Trae lo que el engine necesita
// (total, refunds, shipping cobrado, payment_method, line items) y el snapshot de
// fee exacto si ya fue sincronizado (meta _hs_gateway_fee). Server-side; el
// browser sólo ve agregados.

import type { OrderInput } from './calculations';
import { parseGatewaySnapshot, isSnapshotV2 } from './gateway-snapshot';
import type { GatewayFeeSnapshot } from './types';
import { fetchOrderPages, rangeParams } from '@/lib/dashboard/wc-paginate';

export const PAID_STATUSES = new Set(['processing', 'completed', 'enviado']);
// El parser y la constante viven en gateway-snapshot.ts (acepta v1 y v2).
export { GATEWAY_FEE_META } from './gateway-snapshot';

// El engine sí necesita line_items (COGS por producto) y meta_data (el snapshot
// de fee exacto), así que acá no hay proyección liviana que valga: lo que se
// gana es el paralelismo del recorrido.
const FIELDS = 'id,number,status,date_created_gmt,date_paid_gmt,total,refunds,shipping_total,payment_method,payment_method_title,line_items,billing,meta_data';

/** Base de fecha del período: por fecha de venta (creación del pedido, como
 *  siempre) o por fecha de acreditación (cuándo quedó disponible la plata). */
export type DateBase = 'sale' | 'release';

/** Instante de acreditación de un pedido: la fecha de liberación que informó
 *  la pasarela (snapshot v2); si no hay, el pago; si tampoco, la creación.
 *  Devuelve ms epoch o NaN si nada parsea. */
export function accreditationMs(o: { date_paid_gmt?: string | null; date_created_gmt?: string | null }, snapshot: GatewayFeeSnapshot | null): number {
  if (isSnapshotV2(snapshot) && snapshot.moneyReleaseDate) {
    const ms = Date.parse(snapshot.moneyReleaseDate);
    if (Number.isFinite(ms)) return ms;
  }
  for (const gmt of [o.date_paid_gmt, o.date_created_gmt]) {
    if (!gmt) continue;
    const ms = Date.parse(`${gmt}Z`);
    if (Number.isFinite(ms)) return ms;
  }
  return NaN;
}

// MP hoy libera el mismo día de la aprobación, pero históricamente pudo
// demorar hasta ~3 semanas: para la base por acreditación se leen pedidos
// creados hasta 35 días antes del rango y se filtran por su fecha real.
const RELEASE_LOOKBACK_MS = 35 * 24 * 3600_000;

export interface FinanceOrderRaw extends OrderInput {
  status: string;
  paymentTitle: string;
}

export async function fetchFinanceOrders(
  startUTC: string, endUTC: string, base: DateBase = 'sale'
): Promise<{ orders: FinanceOrderRaw[]; truncated: boolean }> {
  const { startMs, endMs, after, before } = rangeParams(startUTC, endUTC);
  const fetchAfter = base === 'release' ? new Date(Date.parse(after) - RELEASE_LOOKBACK_MS).toISOString() : after;
  const { raw, truncated } = await fetchOrderPages({ fields: FIELDS, after: fetchAfter, before });

  const orders: FinanceOrderRaw[] = [];
  for (const o of raw) {
    const gmt = o.date_created_gmt ? Date.parse(`${o.date_created_gmt}Z`) : NaN;
    if (!Number.isFinite(gmt)) continue;
    if (!PAID_STATUSES.has(o.status)) continue;
    const snapshot = parseGatewaySnapshot(o.meta_data);
    const accMs = accreditationMs(o, snapshot);
    const keyMs = base === 'release' ? accMs : gmt;
    if (!Number.isFinite(keyMs) || keyMs < startMs || keyMs >= endMs) continue;
    const refunded = Array.isArray(o.refunds) ? o.refunds.reduce((s: number, r: any) => s + Math.abs(Number(r.total) || 0), 0) : 0;
    orders.push({
      id: o.id,
      number: String(o.number ?? o.id),
      dateISO: new Date(gmt).toISOString(),
      customerName: `${o.billing?.first_name || ''} ${o.billing?.last_name || ''}`.trim(),
      paymentMethod: o.payment_method || '',
      paymentTitle: o.payment_method_title || '',
      status: o.status,
      total: parseFloat(o.total) || 0,
      refunded,
      shippingCharged: parseFloat(o.shipping_total) || 0,
      lineItems: (o.line_items as any[] || []).map((li) => ({
        productId: Number(li.product_id), quantity: Number(li.quantity) || 0,
        lineTotal: parseFloat(li.total) || 0, name: li.name || '',
      })),
      snapshot,
      accreditedISO: Number.isFinite(accMs) ? new Date(accMs).toISOString() : undefined,
    });
  }
  return { orders, truncated };
}
