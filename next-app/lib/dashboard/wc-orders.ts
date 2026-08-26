// Fetch server-side de pedidos de WooCommerce para un rango [startUTC, endUTC).
// Devuelve pedidos ya normalizados; el browser nunca ve la lista cruda ni la
// pagina — el Dashboard sólo recibe agregados.

import type { FinanceOrder } from './finance';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = (process.env.WC_CONSUMER_KEY || '').trim();
const WC_SEC = (process.env.WC_CONSUMER_SECRET || '').trim();

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

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

const MAX_PAGES = 40; // backstop: ~4000 pedidos. Si se supera, se reporta (no se trunca en silencio).

interface FetchResult {
  orders: DashOrder[];
  truncated: boolean;
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
  const startMs = new Date(startUTC).getTime();
  const endMs = new Date(endUTC).getTime();
  // Margen de 6h a cada lado por si WC filtra por hora local; el filtro fino es en código.
  const afterParam = new Date(startMs - 6 * 3600_000).toISOString();
  const beforeParam = new Date(endMs + 6 * 3600_000).toISOString();

  const orders: DashOrder[] = [];
  let truncated = false;

  for (let page = 1; ; page++) {
    if (page > MAX_PAGES) { truncated = true; break; }
    const params = new URLSearchParams({
      per_page: '100',
      page: String(page),
      orderby: 'date',
      order: 'desc',
      after: afterParam,
      before: beforeParam,
      dates_are_gmt: 'true',
      _fields: 'id,number,status,date_created_gmt,total,refunds,line_items,billing,customer_id,payment_method_title',
      _cb: String(Date.now()),
    });
    const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders?${params}`, {
      headers: { Authorization: wcAuth() },
      cache: 'no-store',
    });
    if (!res.ok) break;
    const batch = (await res.json()) as any[];
    if (!Array.isArray(batch) || !batch.length) break;

    for (const o of batch) {
      const gmt = o.date_created_gmt ? `${o.date_created_gmt}Z`.replace(/Z+$/, 'Z') : null;
      const ms = gmt ? Date.parse(gmt) : NaN;
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
        customerKey: (o.billing?.email || '').trim().toLowerCase() || (o.customer_id ? `id:${o.customer_id}` : `order:${o.id}`),
        paymentTitle: o.payment_method_title || '',
      });
    }
    if (batch.length < 100) break;
  }

  return { orders, truncated };
}
