import { describe, it, expect } from 'vitest';
import { campaignResults, type ResultOrder } from '@/lib/wholesale-campaign-results';

// Resultados de campaña desde órdenes de Woo con las metas que escribe C2.
const PSS = 'wc_2026-09_private-stock-sale';
const m = (o: Record<string, unknown>) => Object.entries(o).map(([key, value]) => ({ key, value }));
const line = (product_id: number, name: string, quantity: number, wsRegular: number, wsFinal: number, group?: string, discount?: number): any =>
  ({ product_id, name, quantity, total: String(wsFinal * quantity), meta_data: m({ _ws_regular: String(wsRegular), _ws_final: String(wsFinal), ...(group ? { _ws_campaign_group: group, _ws_campaign_discount: String(discount), _ws_campaign_id: PSS } : {}) }) });
const order = (id: number, customer_id: number, status: string, date: string, lines: any[], campaign = true): ResultOrder => {
  const total = lines.reduce((s, l) => s + Number(l.total), 0);
  const discount = lines.reduce((s, l) => { const r = Number(l.meta_data.find((x: any) => x.key === '_ws_regular').value), f = Number(l.meta_data.find((x: any) => x.key === '_ws_final').value); return s + (r - f) * l.quantity; }, 0);
  return { id, number: String(id), status, date_created: date, date_paid: status === 'on-hold' ? null : date, customer_id, total: String(total), line_items: lines,
    meta_data: m({ _es_mayorista: 'true', ...(campaign ? { _wholesale_campaign_id: PSS, _wholesale_campaign_name: 'Private Stock Sale', _wholesale_campaign_discount_total: String(discount) } : {}) }) };
};

const orders: ResultOrder[] = [
  // AKASHA (13): ya compró el 06/08 y el 31/08 → NO reactivada (25 días antes de la campaña).
  order(2486, 13, 'completed', '2026-08-06T12:00:00', [line(2107, 'LAMB OF GOD PINK TEE - M', 5, 19500, 19500)], false),
  order(2897, 13, 'completed', '2026-08-31T12:00:00', [line(2107, 'LAMB OF GOD PINK TEE - L', 3, 22500, 22500)], false),
  // VENEZIA (31): última compra 27/07 → 63 días antes → reactivada.
  order(2245, 31, 'completed', '2026-07-27T12:00:00', [line(1044, 'ONLY GOD - M', 4, 29000, 29000)], false),
  // Campaña — pagadas
  order(6001, 13, 'processing', '2026-09-25T15:00:00', [line(713, 'FIND JESUS - LONGSLEEVE BLACK - M', 3, 33500, 26800, '20', 0.2), line(2107, 'LAMB OF GOD PINK TEE - M', 2, 22500, 22500)]),
  order(6002, 31, 'completed', '2026-09-28T15:00:00', [line(726, 'AEROGREY - TEEs - M', 10, 22500, 20250, '10', 0.1), line(2460, 'NAPOLI TEE - AZURRO - M', 4, 19000, 16150, '15', 0.15)]),
  order(6003, 90, 'processing', '2026-09-29T15:00:00', [line(713, 'FIND JESUS - LONGSLEEVE BLACK - L', 2, 33500, 26800, '20', 0.2)]), // cuenta nueva → first-time
  // Campaña — pendiente de pago: no suma
  order(6004, 91, 'on-hold', '2026-09-30T15:00:00', [line(713, 'FIND JESUS - LONGSLEEVE BLACK - S', 10, 33500, 26800, '20', 0.2)]),
  // Fuera de campaña durante la ventana: no cuenta
  order(6005, 92, 'processing', '2026-09-30T16:00:00', [line(2107, 'LAMB OF GOD PINK TEE - M', 3, 22500, 22500)], false),
];
const costs = new Map<number, number | null>([[713, 13405], [2107, 10387.5], [2460, 10387.5], [726, null]]);

describe('campaignResults', () => {
  const r = campaignResults(PSS, orders, costs);

  it('revenue, pedidos, unidades y AOV solo de las órdenes pagadas de la campaña', () => {
    expect(r.orders).toBe(3);
    expect(r.paidOrderIds).toEqual([6001, 6002, 6003]);
    expect(r.revenue).toBe(80400 + 45000 + 202500 + 64600 + 53600);
    expect(r.units).toBe(3 + 2 + 10 + 4 + 2);
    expect(r.aov).toBeCloseTo(r.revenue / 3, 5);
    expect(r.discountTotal).toBe(6700 * 3 + 2250 * 10 + 2850 * 4 + 6700 * 2);
  });

  it('por grupo 20 / 15 / 10 y líneas sin promo aparte (pedido mixto)', () => {
    expect(r.byGroup['20']).toEqual({ orders: 2, units: 5, revenue: 26800 * 5, discount: 6700 * 5 });
    expect(r.byGroup['15']).toEqual({ orders: 1, units: 4, revenue: 64600, discount: 2850 * 4 });
    expect(r.byGroup['10']).toEqual({ orders: 1, units: 10, revenue: 202500, discount: 22500 });
    expect(r.noPromo).toEqual({ units: 2, revenue: 45000 });
  });

  it('stock liquidado por producto', () => {
    expect(r.products[0]).toMatchObject({ productId: 726, units: 10, group: '10' });
    expect(r.products.find(p => p.productId === 713)).toMatchObject({ units: 5, revenue: 134000, group: '20', name: 'FIND JESUS - LONGSLEEVE BLACK' });
    expect(r.products.find(p => p.productId === 2107)).toMatchObject({ units: 2, group: null });
  });

  it('margen conocido solo con costo; AEROGREY (COST_UNKNOWN) queda en unidades sin costo', () => {
    expect(r.unitsCostUnknown).toBe(10);
    expect(r.revenueWithCost).toBe(80400 + 45000 + 64600 + 53600);
    expect(r.marginKnown).toBeCloseTo((80400 - 13405 * 3) + (45000 - 10387.5 * 2) + (64600 - 10387.5 * 4) + (53600 - 13405 * 2), 2);
  });

  it('first-time buyers y reactivados (60 días) desde el historial completo', () => {
    expect(r.customers.sort()).toEqual([13, 31, 90]);
    expect(r.firstTimeBuyers).toEqual([90]);
    expect(r.reactivated).toEqual([31]);
  });

  it('pendientes de pago se informan aparte y no suman', () => {
    expect(r.pending).toEqual({ orders: 1, total: 268000, ids: [6004] });
  });

  it('sin órdenes: todo en cero y sin dividir por cero', () => {
    const e = campaignResults('otra', orders, costs);
    expect(e).toMatchObject({ orders: 0, revenue: 0, units: 0, aov: null, discountTotal: 0, products: [], firstTimeBuyers: [], reactivated: [] });
  });
});
