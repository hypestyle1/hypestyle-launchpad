// Más vendidos para ordenar el catálogo mayorista (05/11/2026, pedido de Valentín).
//
// Unidades pagadas por producto en los últimos BEST_SELLER_DAYS días, sumando
// tienda y mayoristas (WC REST, server only). No usa `total_sales` de Woo
// porque es histórico y cuenta los regalos por compra (Chain, medias, ZIPPO
// salen a $0): por eso acá solo suman líneas con total > 0.
//
// Si WC no responde, devuelve un mapa vacío y el catálogo queda en el orden de
// disponibilidad de siempre: nunca rompe /mayoristas.

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const KEY = (process.env.WC_CONSUMER_KEY || '').trim();
const SECRET = (process.env.WC_CONSUMER_SECRET || '').trim();

export const BEST_SELLER_DAYS = 60;
const MAX_PAGES = 10;

interface OrderLines { line_items?: { product_id?: number; quantity?: number; total?: string }[] }

/** Suma unidades pagadas por producto (puro, testeable). */
export function unitsByProduct(orders: OrderLines[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const o of orders) {
    for (const l of o.line_items ?? []) {
      const id = Number(l.product_id);
      if (!id || !(Number(l.total) > 0)) continue;
      out.set(id, (out.get(id) ?? 0) + (Number(l.quantity) || 0));
    }
  }
  return out;
}

export async function fetchBestSellerUnits(now = Date.now()): Promise<Map<number, number>> {
  if (!KEY || !SECRET) return new Map();
  const after = new Date(now - BEST_SELLER_DAYS * 86_400_000).toISOString().slice(0, 19);
  const auth = 'Basic ' + Buffer.from(`${KEY}:${SECRET}`).toString('base64');
  const orders: OrderLines[] = [];
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = `${WP_URL}/wp-json/wc/v3/orders?status=processing,completed&after=${after}&per_page=100&page=${page}&_fields=line_items`;
      const res = await fetch(url, { headers: { Authorization: auth }, next: { revalidate: 3600 } });
      if (!res.ok) break;
      const batch = await res.json();
      if (!Array.isArray(batch)) break;
      orders.push(...batch);
      if (batch.length < 100) break;
    }
  } catch (e) {
    console.error('[mayoristas] más vendidos:', e);
  }
  return unitsByProduct(orders);
}
