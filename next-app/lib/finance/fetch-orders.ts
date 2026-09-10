// Fetch de pedidos para el Profitability Engine. Trae lo que el engine necesita
// (total, refunds, shipping cobrado, payment_method, line items) y el snapshot de
// fee exacto si ya fue sincronizado (meta _hs_gateway_fee). Server-side; el
// browser sólo ve agregados.

import type { OrderInput } from './calculations';
import { parseGatewaySnapshot } from './gateway-snapshot';
import { fetchOrderPages, rangeParams } from '@/lib/dashboard/wc-paginate';

export const PAID_STATUSES = new Set(['processing', 'completed', 'enviado']);
// El parser y la constante viven en gateway-snapshot.ts (acepta v1 y v2).
export { GATEWAY_FEE_META } from './gateway-snapshot';

// El engine sí necesita line_items (COGS por producto) y meta_data (el snapshot
// de fee exacto), así que acá no hay proyección liviana que valga: lo que se
// gana es el paralelismo del recorrido.
const FIELDS = 'id,number,status,date_created_gmt,total,refunds,shipping_total,payment_method,payment_method_title,line_items,billing,meta_data';

export interface FinanceOrderRaw extends OrderInput {
  status: string;
  paymentTitle: string;
}

export async function fetchFinanceOrders(
  startUTC: string, endUTC: string
): Promise<{ orders: FinanceOrderRaw[]; truncated: boolean }> {
  const { startMs, endMs, after, before } = rangeParams(startUTC, endUTC);
  const { raw, truncated } = await fetchOrderPages({ fields: FIELDS, after, before });

  const orders: FinanceOrderRaw[] = [];
  for (const o of raw) {
    const gmt = o.date_created_gmt ? Date.parse(`${o.date_created_gmt}Z`) : NaN;
    if (!Number.isFinite(gmt) || gmt < startMs || gmt >= endMs) continue;
    if (!PAID_STATUSES.has(o.status)) continue;
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
      snapshot: parseGatewaySnapshot(o.meta_data),
    });
  }
  return { orders, truncated };
}
