import { describe, it, expect } from 'vitest';
import { pedidoViewFrom, pedidoLinesFrom, trackingUrlFor, reorderPlan } from '@/lib/mayorista-pedidos-view';
import type { MayoristaProduct } from '@/lib/mayorista-products';

// "Mis pedidos": detalle de la orden de Woo, seguimiento y volver a pedir.

const wcOrder = {
  id: 3324, number: '3324', status: 'on-hold', total: '80000.00', date_created: '2026-09-28T19:31:30',
  line_items: [
    { product_id: 2033, variation_id: 2059, name: 'FAITH HOODIE', quantity: 2, total: '96000', meta_data: [{ key: 'pa_talle', value: 'l', display_key: 'Talle', display_value: 'L' }] },
    { product_id: 924, variation_id: 0, name: 'Camo Cap', quantity: 1, total: '21500', meta_data: [] },
    { product_id: 1044, variation_id: 1097, name: 'ONLY GOD — Negra', quantity: 3, total: '87000', meta_data: [{ key: 'talle', value: 'M' }, { key: 'Color', value: 'Negra' }] },
  ],
  meta_data: [
    { key: '_es_mayorista', value: 'true' },
    { key: '_mayorista_credito_aplicado', value: '20000' },
    { key: '_wholesale_campaign_name', value: 'Private Stock Sale' },
    { key: '_envio_metodo', value: 'andreani_sucursal' }, { key: '_envio_destino', value: 'Olavarría centro' },
    { key: '_tracking_number', value: '360001234567890' },
  ],
};

describe('pedidoLinesFrom / pedidoViewFrom', () => {
  it('lee talle y color de la meta de la línea (pa_talle, talle, Color) y el precio unitario', () => {
    const lines = pedidoLinesFrom(wcOrder);
    expect(lines.map(l => [l.name, l.size, l.color, l.quantity, l.unitPrice])).toEqual([
      ['FAITH HOODIE', 'L', '', 2, 48000],
      ['Camo Cap', '', '', 1, 21500],
      ['ONLY GOD — Negra', 'M', 'Negra', 3, 29000],
    ]);
  });

  it('arma la vista: totales, crédito, campaña, envío, seguimiento con link de Andreani', () => {
    const v = pedidoViewFrom(wcOrder);
    expect(v).toMatchObject({ number: '3324', status: 'on-hold', total: 80000, subtotal: 204500, creditUsed: 20000, campaignName: 'Private Stock Sale', itemCount: 6, mayorista: true });
    expect(v.envio.resumen).toBe('Andreani — a sucursal · Olavarría centro');
    expect(v.trackingUrl).toBe('https://www.andreani.com/envio/360001234567890');
  });

  it('orden minorista o sin datos: sin crédito, sin campaña, no es mayorista', () => {
    const v = pedidoViewFrom({ id: 1, number: '1', status: 'completed', total: '10', line_items: [], meta_data: [] });
    expect(v).toMatchObject({ creditUsed: 0, campaignName: '', mayorista: false, trackingUrl: null, lines: [] });
  });
});

describe('trackingUrlFor', () => {
  it('Andreani tiene link; Via Cargo y expreso, solo el número', () => {
    expect(trackingUrlFor('andreani_domicilio', ' 123 ')).toBe('https://www.andreani.com/envio/123');
    expect(trackingUrlFor('via_cargo', '123')).toBeNull();
    expect(trackingUrlFor('expreso', '123')).toBeNull();
    expect(trackingUrlFor('andreani_sucursal', '')).toBeNull();
  });
});

describe('reorderPlan — volver a pedir con el catálogo de hoy', () => {
  const prod = (productId: number, slug: string, over: Partial<MayoristaProduct> = {}): MayoristaProduct => ({
    id: slug, productId, name: slug.toUpperCase(), slug, category: 'Remera', shortDescription: '', wholesalePrice: 30000, regularPrice: 60000,
    image: '/x.jpg', images: [], sizes: ['M', 'L'], colors: [], colorAxis: false, stock: { M: 'ok', L: 'low' }, stockQty: { M: 10, L: 2 }, comingSoon: false, ...over,
  });
  const catalog = [
    prod(2033, 'faith-hoodie', { wholesalePrice: 50000, promo: { campaignId: 'c', group: '10', label: '10%', discount: 0.1, price: 45000, saving: 5000, badge: 'LIQ', tag: 'unidades-limitadas' } as any }),
    prod(924, 'camo-cap', { sizes: ['Única'], stock: { 'Única': 'ok' }, stockQty: { 'Única': 28 } }),
    prod(1044, 'only-god-negra', { colors: ['Negra'], stock: { M: 'out', L: 'ok' }, stockQty: { M: 0, L: 5 } }),
  ];

  it('usa el precio de hoy (promo incluida), recorta a lo que hay y toma el talle único', () => {
    const plan = reorderPlan(pedidoLinesFrom(wcOrder), catalog);
    expect(plan.items).toEqual([
      expect.objectContaining({ slug: 'faith-hoodie', size: 'L', quantity: 2, price: 45000 }),
      expect.objectContaining({ slug: 'camo-cap', size: 'Única', quantity: 1, price: 30000 }),
    ]);
    // ONLY GOD M está agotada hoy.
    expect(plan.skipped).toEqual([{ name: 'ONLY GOD — Negra', size: 'M', reason: 'out' }]);
  });

  it('recorta la cantidad al stock del talle', () => {
    const plan = reorderPlan([{ productId: 2033, variationId: 0, name: 'FAITH', size: 'L', color: '', quantity: 9, unitPrice: 1, lineTotal: 9 }], catalog);
    expect(plan.items[0].quantity).toBe(2);
  });

  it('producto que ya no está en el catálogo o talle que ya no existe', () => {
    const plan = reorderPlan([
      { productId: 999, variationId: 0, name: 'VIEJO', size: 'M', color: '', quantity: 1, unitPrice: 1, lineTotal: 1 },
      { productId: 2033, variationId: 0, name: 'FAITH', size: 'XXL', color: '', quantity: 1, unitPrice: 1, lineTotal: 1 },
    ], catalog);
    expect(plan.items).toEqual([]);
    expect(plan.skipped.map(s => s.reason)).toEqual(['no-catalog', 'no-size']);
  });
});
