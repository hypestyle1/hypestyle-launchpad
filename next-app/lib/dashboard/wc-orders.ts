// Fetch server-side de pedidos de WooCommerce para un rango [startUTC, endUTC).
// Devuelve pedidos ya normalizados; el browser nunca ve la lista cruda ni la
// pagina — el Dashboard sólo recibe agregados.

import type { FinanceOrder, CustomerOrder } from './finance';
import { fetchOrderPages, rangeParams } from './wc-paginate';

// Campos que pide cada caso de uso. Van separados a propósito: `line_items` es
// el campo caro de la REST API de Woo (medido en producción: 254 KB y 2081 ms
// por página con él, 44 KB y 764 ms sin él) y el histórico de clientes no lo
// mira nunca.
const FIELDS_FULL = 'id,number,status,date_created_gmt,total,refunds,line_items,billing,customer_id,payment_method_title';
const FIELDS_CUSTOMERS = 'id,status,date_created_gmt,total,billing,customer_id';

// Estados que cuentan como venta real (cobrada). 'enviado' es el estado custom
// de despacho, que implica pago. Coincide con la lista blanca del resto del panel.
export const PAID_STATUSES = new Set(['processing', 'completed', 'enviado']);

export interface DashOrder extends FinanceOrder {
  number: string;
  status: string;
  /** Instante de creación en UTC (ISO), derivado de date_created_gmt. */
  dateGmt: string;
  customerName: string;
  /** Clave de cliente para nuevos-vs-recurrentes: email normalizado (o id). */
  customerKey: string;
  paymentTitle: string;
}

interface FetchResult {
  orders: DashOrder[];
  truncated: boolean;
}

/** Clave de cliente para nuevos-vs-recurrentes: email normalizado (o id). */
function customerKeyOf(o: any): string {
  return (o.billing?.email || '').trim().toLowerCase() || (o.customer_id ? `id:${o.customer_id}` : `order:${o.id}`);
}

/** Instante GMT del pedido en ms, o NaN si Woo no lo mandó. */
function orderMs(o: any): number {
  const gmt = o.date_created_gmt ? `${o.date_created_gmt}Z`.replace(/Z+$/, 'Z') : null;
  return gmt ? Date.parse(gmt) : NaN;
}

/**
 * Trae los pedidos cuyo date_created_gmt cae en [startUTC, endUTC). Filtra por
 * GMT en código (no confía en la interpretación de tz de WC) y por lista blanca
 * de estados pagados si `onlyPaid`.
 */
export async function fetchOrdersInRange(
  startUTC: string,
  endUTC: string,
  opts: { onlyPaid?: boolean } = {}
): Promise<FetchResult> {
  const { startMs, endMs, after, before } = rangeParams(startUTC, endUTC);
  const { raw, truncated } = await fetchOrderPages({ fields: FIELDS_FULL, after, before });

  const orders: DashOrder[] = [];
  for (const o of raw) {
    const ms = orderMs(o);
    if (!Number.isFinite(ms) || ms < startMs || ms >= endMs) continue;
    if (opts.onlyPaid && !PAID_STATUSES.has(o.status)) continue;

    const refunded = Array.isArray(o.refunds)
      ? o.refunds.reduce((s: number, r: any) => s + Math.abs(Number(r.total) || 0), 0)
      : 0;

    orders.push({
      id: o.id,
      number: String(o.number ?? o.id),
      status: o.status,
      dateGmt: new Date(ms).toISOString(),
      total: parseFloat(o.total) || 0,
      refunded,
      lineItems: (o.line_items as any[] || []).map((li) => ({
        productId: Number(li.product_id),
        quantity: Number(li.quantity) || 0,
        lineTotal: parseFloat(li.total) || 0,
        name: li.name || '',
      })),
      customerName: `${o.billing?.first_name || ''} ${o.billing?.last_name || ''}`.trim(),
      // Email como clave (la mayoría del checkout es guest); si falta, el id de cliente.
      customerKey: customerKeyOf(o),
      paymentTitle: o.payment_method_title || '',
    });
  }

  return { orders, truncated };
}

/**
 * Historial para clasificar cliente nuevo vs recurrente. Devuelve directamente
 * lo que consume `classifyCustomers` — clave, instante y total — y **no** pide
 * `line_items` ni `refunds`, que ese cálculo nunca mira.
 *
 * Es una función aparte y no una opción de `fetchOrdersInRange` a propósito: el
 * tipo que devuelve no tiene `lineItems`, así que no hay forma de pedir la
 * versión liviana y después leer un campo que no vino.
 */
export async function fetchCustomerHistory(
  startUTC: string,
  endUTC: string
): Promise<{ history: CustomerOrder[]; truncated: boolean }> {
  const { startMs, endMs, after, before } = rangeParams(startUTC, endUTC);
  const { raw, truncated } = await fetchOrderPages({ fields: FIELDS_CUSTOMERS, after, before });

  const history: CustomerOrder[] = [];
  for (const o of raw) {
    const ms = orderMs(o);
    if (!Number.isFinite(ms) || ms < startMs || ms >= endMs) continue;
    if (!PAID_STATUSES.has(o.status)) continue;
    history.push({ customerKey: customerKeyOf(o), ms, total: parseFloat(o.total) || 0 });
  }

  return { history, truncated };
}
