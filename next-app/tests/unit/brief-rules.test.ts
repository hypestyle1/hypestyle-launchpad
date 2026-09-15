import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '@/lib/brief/config';
import { paidWithoutLabel } from '@/lib/brief/rules/ops/paid-without-label';
import { pendingHighValue, pendingWhatsAppText } from '@/lib/brief/rules/ops/pending-high-value';
import { topProductSizeOut } from '@/lib/brief/rules/stock/top-product-size-out';
import { adsetBelowBreakeven } from '@/lib/brief/rules/ads/adset-below-breakeven';
import type { BriefContext, BriefInputs, PendingOrder, SalesWindow, StockReport, AdsetWindow } from '@/lib/brief/types';
import type { ProcessingOrder } from '@/lib/orders-fulfillment';

// Lunes 15/09/2026 12:00 AR (15:00 UTC).
const NOW = new Date('2026-09-15T15:00:00.000Z');
const H = 3_600_000;
const iso = (hoursAgo: number) => new Date(NOW.getTime() - hoursAgo * H).toISOString();

// Intl es-AR separa "$" del número con un espacio duro (U+00A0); los tests comparan con espacio común.
const plain = (t: string) => t.replace(/ /g, ' ');

const ctx: BriefContext = { now: NOW, floorARS: 100_000, revenue30d: 12_000_000, config: { ...DEFAULT_CONFIG, wpUrl: 'https://wp.test' } };

const proc = (id: number, hoursAgo: number, total: number, stage: ProcessingOrder['stage'] = 'sin_rotulo', shippingMethod = 'Andreani (estándar)'): ProcessingOrder =>
  ({ id, number: String(id), total, dateGmt: iso(hoursAgo), stage, shippingMethod });

describe('ops.paid-without-label', () => {
  it('suma los pagados sin rótulo de más de 48 h y arma evidencia con el más viejo', () => {
    const inputs: BriefInputs = { 'orders.processing': [
      proc(3170, 100, 120_000),           // jueves 11/09 08:00 AR
      proc(3171, 60, 80_000),
      proc(3172, 10, 90_000),             // muy nuevo: no cuenta
      proc(3173, 90, 50_000, 'con_rotulo'), // ya tiene rótulo: no cuenta
      proc(3183, 90, 0, 'sin_rotulo', ''),   // canje a $0 sin envío: nunca va a tener rótulo
      proc(3174, 90, 40_000, 'sin_rotulo', ''), // retiro/carga manual sin envío: tampoco
    ] };
    const [s] = paidWithoutLabel.evaluate(inputs, ctx);
    expect(s.id).toBe('ops:paid-without-label:all');
    expect(s.impact).toEqual({ amount: 200_000, currency: 'ARS', kind: 'retained' });
    expect(plain(s.situation)).toBe('$ 200.000 pagados llevan más de 48 h sin rótulo');
    expect(plain(s.evidence)).toBe('2 pedidos, el más viejo del vie 11/09 (#3170, hace 4 días).');
    expect(s.href).toBe('/admin/pedidos?filter=por-empaquetar');
    expect(s.confidence).toBe('exact');
    expect(s.tone).toBe('warning');
    expect(s.sourceRefs).toEqual([{ type: 'order', id: 3170, label: '#3170' }, { type: 'order', id: 3171, label: '#3171' }]);
    // (100 − 48) / 96 ≈ 0,54 → urgencia 1,54
    expect(s.urgency).toBeCloseTo(1.54, 2);
  });

  it('crítico cuando el más viejo pasa las 120 h; urgencia tope 2', () => {
    const [s] = paidWithoutLabel.evaluate({ 'orders.processing': [proc(1, 200, 10_000)] }, ctx);
    expect(s.tone).toBe('critical');
    expect(s.urgency).toBe(2);
    expect(s.evidence).toContain('1 pedido,');
  });

  it('los de más de 30 días no suman plata: se mencionan como sin cerrar', () => {
    const [s] = paidWithoutLabel.evaluate({ 'orders.processing': [proc(1579, 107 * 24, 9_334), proc(1715, 93 * 24, 280_000), proc(3127, 8 * 24, 290_000)] }, ctx);
    expect(s.impact.amount).toBe(290_000);
    expect(plain(s.evidence)).toBe('1 pedido, el más viejo del lun 07/09 (#3127, hace 8 días). Además 2 pedidos de más de 30 días sin cerrar (#1579, #1715).');
    expect(s.sourceRefs.map((r) => r.label)).toEqual(['#3127', '#1579 (sin cerrar)', '#1715 (sin cerrar)']);
  });

  it('solo pedidos viejos sin cerrar → sin señal de hoy', () => {
    expect(paidWithoutLabel.evaluate({ 'orders.processing': [proc(1579, 107 * 24, 9_334)] }, ctx)).toEqual([]);
  });

  it('sin pedidos trabados no emite nada', () => {
    expect(paidWithoutLabel.evaluate({ 'orders.processing': [proc(1, 10, 10_000)] }, ctx)).toEqual([]);
    expect(paidWithoutLabel.evaluate({ 'orders.processing': [] }, ctx)).toEqual([]);
  });

  it('el id no cambia con importe, urgencia ni fecha', () => {
    const a = paidWithoutLabel.evaluate({ 'orders.processing': [proc(1, 60, 10_000)] }, ctx)[0];
    const b = paidWithoutLabel.evaluate({ 'orders.processing': [proc(2, 300, 900_000)] }, { ...ctx, now: new Date(NOW.getTime() + 86_400_000) })[0];
    expect(a.id).toBe(b.id);
  });
});

const pend = (id: number, hoursAgo: number, total: number, over: Partial<PendingOrder> = {}): PendingOrder => ({
  id, number: String(id), total, dateGmt: iso(hoursAgo), status: 'pending',
  customerName: 'Fernando Luna', phone: '11 5555 1234', paymentTitle: 'Transferencia', ...over,
});

describe('ops.pending-high-value', () => {
  it('toma pendientes de valor alto entre 1 h y 120 h, con WhatsApp al mayor', () => {
    const inputs: BriefInputs = { 'orders.pending': [
      pend(3180, 6, 146_000),
      pend(3181, 30, 60_000, { customerName: 'Ana Paz', status: 'failed' }),
      pend(3182, 0.5, 200_000),   // recién creado: puede estar pagando
      pend(3183, 130, 300_000),   // abandonado
      pend(3184, 5, 20_000),      // chico
    ] };
    const [s] = pendingHighValue.evaluate(inputs, ctx);
    expect(s.id).toBe('ops:pending-high-value:all');
    expect(s.impact).toEqual({ amount: 206_000, currency: 'ARS', kind: 'recoverable' });
    expect(plain(s.situation)).toBe('$ 206.000 en 2 pedidos sin pagar de las últimas 120 h');
    expect(plain(s.evidence)).toBe('El mayor $ 146.000 (#3180, hace 6 h, Transferencia).');
    expect(s.action).toBe('Escribirle a Fernando por WhatsApp y confirmar si necesita ayuda para pagar.');
    expect(s.links?.[0].label).toBe('WhatsApp a Fernando');
    expect(s.links?.[0].href).toMatch(/^https:\/\/wa\.me\/5491155551234\?text=/);
    expect(s.confidence).toBe('rule');
    expect(s.tone).toBe('opportunity');
    expect(s.urgency).toBe(1.5); // 1 de 2 con menos de 24 h
    expect(s.sourceRefs.map((r) => r.id)).toEqual([3180, 3181]);
  });

  it('sin teléfono no arma link de WhatsApp', () => {
    const [s] = pendingHighValue.evaluate({ 'orders.pending': [pend(1, 6, 100_000, { phone: '' })] }, ctx);
    expect(s.links).toEqual([]);
  });

  it('texto de WhatsApp', () => {
    expect(pendingWhatsAppText('Ana', '3181')).toBe('Hola Ana, te escribimos de Hype por tu pedido #3181. ¿Necesitás una mano para completar el pago?');
    expect(pendingWhatsAppText('', '1')).toMatch(/^Hola, te escribimos/);
  });

  it('nada que perseguir → sin señal', () => {
    expect(pendingHighValue.evaluate({ 'orders.pending': [pend(1, 6, 10_000)] }, ctx)).toEqual([]);
  });
});

const sales: SalesWindow = {
  startUTC: iso(30 * 24), endUTC: NOW.toISOString(), days: 30,
  revenue: 12_000_000, netRevenue: 11_000_000, contributionProfit: 5_500_000, orders: 150, aov: 80_000, truncated: false,
  topProducts: [
    { productId: 2258, name: 'CHAIN HYPE - M', units: 26, revenue: 1_040_000, cogs: null, contribution: null },
    { productId: 2261, name: 'PACK X3 MEDIAS', units: 16, revenue: 400_000, cogs: null, contribution: null },
    { productId: 999, name: 'SIN PROBLEMAS', units: 10, revenue: 300_000, cogs: null, contribution: null },
  ],
};

const stock: StockReport = {
  totals: { lowstock: 86, outofstock: 159, instock: 422 },
  out: [
    { id: 22581, productId: 2258, name: 'CHAIN HYPE - M', size: 'M', qty: 0, status: 'outofstock', isParent: false, lowStockAmount: 2 },
    { id: 22582, productId: 2258, name: 'CHAIN HYPE - XL', size: 'XL', qty: 0, status: 'outofstock', isParent: false, lowStockAmount: 2 },
    { id: 55555, productId: 5555, name: 'OTRO - S', size: 'S', qty: 0, status: 'outofstock', isParent: false, lowStockAmount: 2 }, // no es top
  ],
  low: [
    { id: 22583, productId: 2258, name: 'CHAIN HYPE - L', size: 'L', qty: 1, status: 'lowstock', isParent: false, lowStockAmount: 2 },
    { id: 22611, productId: 2261, name: 'PACK X3 MEDIAS - U', size: 'U', qty: 2, status: 'lowstock', isParent: false, lowStockAmount: 2 }, // bajo pero no agotado: no dispara
  ],
};

describe('stock.top-product-size-out', () => {
  it('solo productos del top con algún talle agotado; estima la venta perdida a 7 días', () => {
    const out = topProductSizeOut.evaluate({ 'sales.30d': sales, 'stock.report': stock }, ctx);
    expect(out).toHaveLength(1);
    const [s] = out;
    expect(s.id).toBe('stock:top-product-size-out:2258');
    // 26/30 u/día × (2/4) × 7 días × $40.000 = 121.333
    expect(s.impact).toEqual({ amount: 121_333, currency: 'ARS', kind: 'lost' });
    expect(plain(s.situation)).toBe('CHAIN HYPE sin talles M y XL, es el top 1 del mes');
    expect(plain(s.evidence)).toBe('26 vendidos en 30 días ($ 1.040.000). Venta perdida estimada $ 121.333 en 7 días. Bajo: L (1).');
    expect(s.href).toBe('https://wp.test/wp-admin/post.php?post=2258&action=edit');
    expect(s.hrefLabel).toBe('Editar en Woo');
    expect(s.confidence).toBe('estimated');
    expect(s.urgency).toBe(2); // top 1
    expect(s.sourceRefs).toEqual([
      { type: 'product', id: 2258, label: 'CHAIN HYPE' },
      { type: 'variation', id: 22581, label: 'CHAIN HYPE - M' },
      { type: 'variation', id: 22582, label: 'CHAIN HYPE - XL' },
      { type: 'variation', id: 22583, label: 'CHAIN HYPE - L' },
    ]);
  });

  it('la participación de talles agotados se acota a 1', () => {
    const many: StockReport = { totals: null, low: [], out: [1, 2, 3, 4, 5, 6].map((i) => ({ id: i, productId: 999, name: `SIN PROBLEMAS - T${i}`, size: `T${i}`, qty: 0, isParent: false, status: 'outofstock' as const, lowStockAmount: 2 })) };
    const [s] = topProductSizeOut.evaluate({ 'sales.30d': sales, 'stock.report': many }, ctx);
    // 10/30 × 1 × 7 × 30.000 = 70.000
    expect(s.impact.amount).toBe(70_000);
    expect(s.meta?.rank).toBe(3);
  });

  it('el padre agotado no cuenta como talle; con las 4 variaciones agotadas dice "todos los talles"', () => {
    const camo: StockReport = { totals: null, low: [], out: [
      { id: 916, productId: 916, name: 'Zip Hoodie Camo', size: '', qty: 0, isParent: true, status: 'outofstock', lowStockAmount: 2 },
      ...[[919, 'L'], [918, 'M'], [920, 'XL'], [917, 'S']].map(([id, sz]) => ({ id: Number(id), productId: 916, name: `Zip Hoodie Camo - ${sz}`, size: String(sz), qty: 0, isParent: false, status: 'outofstock' as const, lowStockAmount: 2 })),
    ] };
    const salesCamo = { ...sales, topProducts: [{ productId: 916, name: 'Zip Hoodie Camo - XL', units: 9, revenue: 835_200, cogs: null, contribution: null }] };
    const [s] = topProductSizeOut.evaluate({ 'sales.30d': salesCamo, 'stock.report': camo }, ctx);
    expect(plain(s.situation)).toBe('Zip Hoodie Camo agotado en todos los talles (S, M, L, XL), es el top 1 del mes');
    // 9/30 × 1 × 7 × 92.800 = 194.880
    expect(s.impact.amount).toBe(194_880);
    expect(s.sourceRefs[0]).toEqual({ type: 'product', id: 916, label: 'Zip Hoodie Camo' });
    expect(s.sourceRefs).toHaveLength(5);
  });
});

const adsets: AdsetWindow = {
  since: '2026-09-12', until: '2026-09-14', days: 3,
  rows: [
    { id: 'a1', adsetId: 'a1', adsetName: 'COLD ARCHIVE broad', campaignId: 'c1', campaignName: 'COLD ARCHIVE', effectiveStatus: 'ACTIVE', optimizationGoal: 'OFFSITE_CONVERSIONS',
      spend: 72_000, impressions: 0, reach: 0, clicks: 0, cpm: 0, ctr: 0, cpc: 0, frequency: 0, purchases: 3, purchaseValue: 100_800, roas: 1.4 },
    { id: 'a2', adsetId: 'a2', adsetName: 'ORGÁNICO stories', campaignId: 'c2', campaignName: 'ORGÁNICO', effectiveStatus: 'ACTIVE', optimizationGoal: 'OFFSITE_CONVERSIONS',
      spend: 50_000, impressions: 0, reach: 0, clicks: 0, cpm: 0, ctr: 0, cpc: 0, frequency: 0, purchases: 6, purchaseValue: 250_000, roas: 5 },
    { id: 'a3', adsetId: 'a3', adsetName: 'PAUSADO', campaignId: 'c1', campaignName: 'COLD ARCHIVE', effectiveStatus: 'PAUSED', optimizationGoal: 'OFFSITE_CONVERSIONS',
      spend: 90_000, impressions: 0, reach: 0, clicks: 0, cpm: 0, ctr: 0, cpc: 0, frequency: 0, purchases: 0, purchaseValue: 0, roas: null },
    { id: 'a4', adsetId: 'a4', adsetName: 'CHICO', campaignId: 'c1', campaignName: 'COLD ARCHIVE', effectiveStatus: 'ACTIVE', optimizationGoal: 'OFFSITE_CONVERSIONS',
      spend: 10_000, impressions: 0, reach: 0, clicks: 0, cpm: 0, ctr: 0, cpc: 0, frequency: 0, purchases: 0, purchaseValue: 0, roas: null },
    { id: 'a6', adsetId: 'a6', adsetName: 'ALCANCE', campaignId: 'c3', campaignName: 'MARCA', effectiveStatus: 'ACTIVE', optimizationGoal: 'REACH',
      spend: 80_000, impressions: 0, reach: 0, clicks: 0, cpm: 0, ctr: 0, cpc: 0, frequency: 0, purchases: 0, purchaseValue: 0, roas: null },
    { id: 'a5', adsetId: 'a5', adsetName: 'SIN COMPRAS', campaignId: 'c1', campaignName: 'COLD ARCHIVE', effectiveStatus: 'ACTIVE', optimizationGoal: 'OFFSITE_CONVERSIONS',
      spend: 95_000, impressions: 0, reach: 0, clicks: 0, cpm: 0, ctr: 0, cpc: 0, frequency: 0, purchases: 0, purchaseValue: 0, roas: null },
  ],
};

describe('ads.adset-below-breakeven', () => {
  it('conjuntos activos con gasto sobre el piso y ROAS bajo el breakeven derivado de Woo', () => {
    const out = adsetBelowBreakeven.evaluate({ 'meta.adsets': adsets, 'sales.30d': sales }, ctx);
    expect(out.map((s) => s.id)).toEqual(['ads:adset-below-breakeven:a1', 'ads:adset-below-breakeven:a5']);
    const [a1, a5] = out;
    // breakeven = netRevenue / contribution = 2,0
    expect(plain(a1.situation)).toBe('COLD ARCHIVE broad gastó $ 72.000 en 3 días bajo el breakeven');
    expect(plain(a1.evidence)).toBe('ROAS 1,40× contra breakeven 2,00× · 3 compras atribuidas · $ 24.000/día, $ 720.000 en 30 días si sigue así · COLD ARCHIVE.');
    // impacto = gasto proyectado a 30 días: 72.000 / 3 × 30
    expect(a1.impact).toEqual({ amount: 720_000, currency: 'ARS', kind: 'at_risk' });
    expect(a1.urgency).toBeCloseTo(1.3, 5);
    expect(a1.tone).toBe('warning');
    expect(a1.confidence).toBe('rule');
    expect(a1.sourceRefs).toEqual([{ type: 'adset', id: 'a1', label: 'COLD ARCHIVE broad' }, { type: 'campaign', id: 'c1', label: 'COLD ARCHIVE' }]);
    // Sin compras y gasto ≥ 3× el mínimo → crítico, urgencia 2.
    expect(a5.tone).toBe('critical');
    expect(a5.urgency).toBe(2);
    expect(a5.action).toMatch(/^Pausar/);
    expect(plain(a5.situation)).toBe('SIN COMPRAS gastó $ 95.000 en 3 días sin una compra');
  });

  it('sin margen de contribución no opina', () => {
    const flat = { ...sales, contributionProfit: 0 };
    expect(adsetBelowBreakeven.evaluate({ 'meta.adsets': adsets, 'sales.30d': flat }, ctx)).toEqual([]);
  });
});
