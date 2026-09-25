// Resultados de una campaña mayorista, calculados en vivo desde las órdenes
// de Woo (nada paralelo): toda orden creada bajo campaña lleva
// `_wholesale_campaign_id` y cada línea `_ws_regular`, `_ws_final` y, si fue
// promo, `_ws_campaign_group` / `_ws_campaign_discount` (ver /api/mayorista/pedido).
//
// Pagado = completed | processing (misma lista blanca que /admin/mayoristas).
// Lo pendiente (on-hold, pending) se informa aparte y nunca suma revenue.

export const PAID_STATUSES = new Set(['completed', 'processing']);
export const REACTIVATION_DAYS = 60;

export interface ResultLine {
  product_id: number;
  name?: string;
  quantity: number;
  total: string | number;
  meta_data?: { key: string; value: unknown }[];
}
export interface ResultOrder {
  id: number;
  number?: string;
  status: string;
  date_created: string;
  date_paid?: string | null;
  customer_id: number;
  total: string | number;
  meta_data?: { key: string; value: unknown }[];
  line_items: ResultLine[];
}

export interface GroupResult { orders: number; units: number; revenue: number; discount: number }
export interface ProductResult { productId: number; name: string; units: number; revenue: number; group: string | null }

export interface CampaignResults {
  campaignId: string;
  orders: number;
  units: number;
  revenue: number;
  aov: number | null;
  discountTotal: number;
  byGroup: Record<string, GroupResult>;
  /** Líneas de esas órdenes que NO tenían promo (pedidos mixtos). */
  noPromo: { units: number; revenue: number };
  products: ProductResult[];
  /** Margen bruto sobre líneas con costo conocido. */
  marginKnown: number;
  revenueWithCost: number;
  unitsCostUnknown: number;
  firstTimeBuyers: number[];
  reactivated: number[];
  customers: number[];
  pending: { orders: number; total: number; ids: number[] };
  paidOrderIds: number[];
}

const meta = (m: { key: string; value: unknown }[] | undefined, key: string): string | undefined => {
  const v = m?.find(x => x.key === key)?.value;
  return v == null ? undefined : String(v);
};
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const when = (o: ResultOrder) => new Date(o.date_paid || o.date_created).getTime();

/**
 * @param campaignId  id de la campaña
 * @param orders      TODAS las órdenes mayoristas que se tengan a mano (no solo
 *                    las de la campaña): hacen falta para first-time y reactivados.
 * @param costByProduct  costo unitario conocido por product_id (null = COST_UNKNOWN)
 */
export function campaignResults(
  campaignId: string,
  orders: ResultOrder[],
  costByProduct: Map<number, number | null> = new Map(),
  reactivationDays = REACTIVATION_DAYS,
): CampaignResults {
  const ofCampaign = orders.filter(o => meta(o.meta_data, '_wholesale_campaign_id') === campaignId);
  const paid = ofCampaign.filter(o => PAID_STATUSES.has(o.status));
  const pendingOrders = ofCampaign.filter(o => !PAID_STATUSES.has(o.status) && ['on-hold', 'pending'].includes(o.status));

  const r: CampaignResults = {
    campaignId, orders: paid.length, units: 0, revenue: 0, aov: null, discountTotal: 0,
    byGroup: {}, noPromo: { units: 0, revenue: 0 }, products: [],
    marginKnown: 0, revenueWithCost: 0, unitsCostUnknown: 0,
    firstTimeBuyers: [], reactivated: [], customers: [],
    pending: { orders: pendingOrders.length, total: pendingOrders.reduce((s, o) => s + num(o.total), 0), ids: pendingOrders.map(o => o.id) },
    paidOrderIds: paid.map(o => o.id),
  };
  const byProduct = new Map<number, ProductResult>();
  const customers = new Set<number>();

  for (const o of paid) {
    r.revenue += num(o.total);
    r.discountTotal += num(meta(o.meta_data, '_wholesale_campaign_discount_total'));
    customers.add(o.customer_id);
    const groupsInOrder = new Set<string>();
    for (const l of o.line_items) {
      const qty = num(l.quantity), lineTotal = num(l.total);
      const group = meta(l.meta_data, '_ws_campaign_group') ?? null;
      const wsRegular = num(meta(l.meta_data, '_ws_regular'));
      const wsFinal = num(meta(l.meta_data, '_ws_final')) || (qty ? lineTotal / qty : 0);
      r.units += qty;
      if (group) {
        const g = (r.byGroup[group] ??= { orders: 0, units: 0, revenue: 0, discount: 0 });
        g.units += qty; g.revenue += lineTotal; g.discount += Math.max(0, wsRegular - wsFinal) * qty;
        groupsInOrder.add(group);
      } else {
        r.noPromo.units += qty; r.noPromo.revenue += lineTotal;
      }
      const p = byProduct.get(l.product_id) ?? { productId: l.product_id, name: (l.name ?? '').replace(/\s+-\s+[A-Z0-9]+$/, ''), units: 0, revenue: 0, group };
      p.units += qty; p.revenue += lineTotal; if (group) p.group = group;
      byProduct.set(l.product_id, p);
      const cost = costByProduct.get(l.product_id);
      if (cost != null && cost > 0) { r.marginKnown += lineTotal - cost * qty; r.revenueWithCost += lineTotal; }
      else r.unitsCostUnknown += qty;
    }
    for (const g of groupsInOrder) r.byGroup[g].orders++;
  }
  r.aov = paid.length ? r.revenue / paid.length : null;
  r.products = [...byProduct.values()].sort((a, b) => b.units - a.units || b.revenue - a.revenue);
  r.customers = [...customers];

  // First-time: su primera orden mayorista pagada es una de la campaña.
  // Reactivado: tenía una orden pagada anterior, hace más de `reactivationDays`.
  const paidAll = orders.filter(o => PAID_STATUSES.has(o.status));
  for (const c of customers) {
    const mine = paidAll.filter(o => o.customer_id === c).sort((a, b) => when(a) - when(b));
    const firstInCampaign = mine.find(o => meta(o.meta_data, '_wholesale_campaign_id') === campaignId);
    if (!firstInCampaign) continue;
    const previous = mine.filter(o => when(o) < when(firstInCampaign) && meta(o.meta_data, '_wholesale_campaign_id') !== campaignId);
    if (!previous.length) { r.firstTimeBuyers.push(c); continue; }
    const last = previous[previous.length - 1];
    if ((when(firstInCampaign) - when(last)) / 86400000 > reactivationDays) r.reactivated.push(c);
  }
  return r;
}
