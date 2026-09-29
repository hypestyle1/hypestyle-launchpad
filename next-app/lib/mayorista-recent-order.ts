// Freno al pedido mayorista duplicado.
//
// 28/09/2026: Woo tardó ~57 s en crear una orden de 42 líneas (descuenta stock
// y manda un mail por cada variación que queda baja o en cero). La función se
// cortó antes de recibir la respuesta, pero la orden se creó igual: el cliente
// vio un error, recargó y confirmó de nuevo → dos órdenes y el stock
// descontado dos veces. Antes de crear una orden se mira si el mismo cliente
// ya tiene una de hace minutos.

export const RECENT_ORDER_WINDOW_MS = 10 * 60 * 1000;

// Estados de una orden viva. `pending` entra: Woo crea la orden en ese estado
// y recién al final la pasa a on-hold, así que una orden a medio crear ya
// cuenta.
const LIVE_STATUSES = new Set(['pending', 'on-hold', 'processing', 'completed']);

export interface RecentOrder {
  id: number;
  number: string;
  status: string;
  total: number;
  units: number;
  ageSeconds: number;
}

function isMayorista(order: any): boolean {
  return (order?.meta_data as any[] | undefined)?.some(m => m?.key === '_es_mayorista') ?? false;
}

/** La orden mayorista viva más nueva dentro de la ventana, si hay. */
export function pickRecentOrder(orders: any[], now: number, windowMs = RECENT_ORDER_WINDOW_MS): RecentOrder | null {
  let best: { order: any; created: number } | null = null;
  for (const order of orders ?? []) {
    if (!LIVE_STATUSES.has(order?.status) || !isMayorista(order)) continue;
    // date_created_gmt viene sin zona ("2026-09-28T22:31:30").
    const created = Date.parse(`${order.date_created_gmt}Z`);
    if (!Number.isFinite(created)) continue;
    const age = now - created;
    // Tolerancia por reloj desfasado entre Vercel y el hosting de WP.
    if (age > windowMs || age < -60_000) continue;
    if (!best || created > best.created) best = { order, created };
  }
  if (!best) return null;
  const { order, created } = best;
  return {
    id: order.id,
    number: String(order.number ?? order.id),
    status: order.status,
    total: Number(order.total) || 0,
    units: ((order.line_items as any[]) ?? []).reduce((sum, li) => sum + (Number(li?.quantity) || 0), 0),
    ageSeconds: Math.max(0, Math.round((now - created) / 1000)),
  };
}

/** Path de WC REST con los últimos pedidos del cliente (sin caché de LiteSpeed). */
export function recentOrdersPath(customerId: number): string {
  return `orders?customer=${customerId}&status=any&per_page=5&orderby=date&order=desc&_fields=id,number,status,total,date_created_gmt,line_items,meta_data&_cb=${Date.now()}`;
}

export function agoLabel(ageSeconds: number): string {
  if (ageSeconds < 90) return 'hace un momento';
  return `hace ${Math.round(ageSeconds / 60)} minutos`;
}
