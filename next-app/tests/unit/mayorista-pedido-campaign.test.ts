import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import fixture from '../fixtures/private-stock-sale.json';
import type { ResolvedProduct } from '@/lib/mayorista-stock';

// C2: /api/mayorista/pedido bajo una campaña mayorista. La ruta real con Woo,
// campañas y mails simulados; se mira la orden que crea y las metas.
//
// Campaña: Private Stock Sale (fixture), 24/09 18:00 → 02/10 23:59:59 AR.
// Find Jesus 20% · Napoli Azurro 15% · AEROGREY 10% · Lamb of God fuera.

const ok = { status: 'publish', stockStatus: 'instock', manageStock: true, stockQuantity: 20 };
const out = { status: 'publish', stockStatus: 'outofstock', manageStock: true, stockQuantity: 0 };
const catalog = new Map<string, ResolvedProduct | null>([
  ['find-jesus', { product_id: 713, stock: { ...ok, manageStock: false, stockQuantity: null }, regularPrice: null, variations: [{ id: 714, options: ['m'], stock: ok, regularPrice: 67000 }] }],
  ['napoli-azurro', { product_id: 2460, stock: { ...ok, manageStock: false, stockQuantity: null }, regularPrice: null, variations: [{ id: 2461, options: ['m'], stock: ok, regularPrice: 38000 }] }],
  // ONLY GOD: Color informativo, XL agotada. Regular $58.000 → WS $29.000, sin campaña.
  ['only-god', { product_id: 1044, stock: { ...ok, manageStock: false, stockQuantity: null }, regularPrice: null, variations: [{ id: 1097, options: ['m'], stock: ok, regularPrice: 58000 }, { id: 1099, options: ['xl'], stock: out, regularPrice: 58000 }] }],
  ['lamb-of-god', { product_id: 2107, stock: { ...ok, manageStock: false, stockQuantity: null }, regularPrice: null, variations: [{ id: 2108, options: ['m'], stock: ok, regularPrice: 45000 }] }],
]);

let campaignsResponse: () => Promise<any[]> = async () => [fixture.campaign];
vi.mock('@/lib/wholesale-campaigns-store', () => ({ readCampaigns: vi.fn(() => campaignsResponse()) }));
vi.mock('@/lib/mayorista-auth', () => ({ MAYORISTA_COOKIE: 'hype_mayorista_session', verifySessionToken: vi.fn(async (t?: string) => (t === 'ok' ? 19 : null)) }));
vi.mock('@/lib/mayorista-settings', () => ({ getGlobalMinOrder: vi.fn(async () => 0), customerMinOrderOverride: vi.fn(() => null) }));
vi.mock('@/lib/mayorista-stock', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/mayorista-stock')>();
  return {
    ...real,
    wcAuth: () => 'Basic test',
    wcGet: vi.fn(async (path: string) => { if (path.startsWith('customers/19')) return { email: 'mask@test.com', meta_data: [] }; throw new Error('wcGet inesperado: ' + path); }),
    resolveProducts: vi.fn(async (slugs: string[]) => new Map(slugs.map(s => [s, catalog.get(s) ?? null]))),
  };
});

// La ruta real importa medio lib/: con la suite entera corriendo en paralelo
// el primer import puede pasar los 5 s por defecto.
vi.setConfig({ testTimeout: 20000 });

const wcOrderPosts: any[] = [];
const brevoPosts: any[] = [];
beforeEach(() => {
  wcOrderPosts.length = 0; brevoPosts.length = 0;
  campaignsResponse = async () => [fixture.campaign];
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-28T15:00:00-03:00')); // en plena campaña
  vi.stubEnv('BREVO_API_KEY', 'test-key');
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (String(url).includes('/wc/v3/orders')) { wcOrderPosts.push(JSON.parse(String(init?.body))); return new Response(JSON.stringify({ id: 6001, number: '6001' }), { status: 201 }); }
    if (String(url).includes('api.brevo.com')) { brevoPosts.push(JSON.parse(String(init?.body))); return new Response('{}', { status: 201 }); }
    return new Response('{}', { status: 200 });
  }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

const shipping = { first_name: 'Tomás', last_name: 'Carrera', company: 'MASK', address_1: 'Calle 1', city: 'General La Madrid', phone: '2286401316', dni: '40000000', envio_metodo: 'via_cargo', envio_destino: 'Sucursal Olavarría' };
async function post(body: unknown) {
  const { POST } = await import('@/app/api/mayorista/pedido/route');
  const req = new NextRequest('http://localhost/api/mayorista/pedido', { method: 'POST', headers: { 'content-type': 'application/json', cookie: 'hype_mayorista_session=ok' }, body: JSON.stringify(body) });
  const res = await POST(req);
  return { status: res.status, data: await res.json() };
}
const metaOf = (line: any, key: string) => line.meta_data?.find((m: any) => m.key === key)?.value;
const orderMeta = (o: any, key: string) => o.meta_data?.find((m: any) => m.key === key)?.value;

describe('pedido bajo campaña activa', () => {
  it('orden de prueba: Find Jesus ×3 al 20% EXTRA — metas de orden y de línea', async () => {
    const r = await post({ items: [{ slug: 'find-jesus', name: 'FIND JESUS', size: 'M', quantity: 3, price: 26800 }], shipping });
    expect(r.status).toBe(200);
    expect(r.data).toMatchObject({ wcOrderNumber: '6001', total: 80400, campaign: { id: 'wc_2026-09_private-stock-sale', name: fixture.campaign.name, discountTotal: 20100 } });
    const o = wcOrderPosts[0];
    expect(o.line_items[0]).toMatchObject({ product_id: 713, variation_id: 714, quantity: 3, subtotal: '80400', total: '80400' });
    expect(metaOf(o.line_items[0], '_ws_regular')).toBe('33500');
    expect(metaOf(o.line_items[0], '_ws_final')).toBe('26800');
    expect(metaOf(o.line_items[0], '_ws_campaign_id')).toBe('wc_2026-09_private-stock-sale');
    expect(metaOf(o.line_items[0], '_ws_campaign_group')).toBe('20');
    expect(metaOf(o.line_items[0], '_ws_campaign_discount')).toBe('0.2');
    expect(orderMeta(o, '_wholesale_campaign_id')).toBe('wc_2026-09_private-stock-sale');
    expect(orderMeta(o, '_wholesale_campaign_name')).toBe(fixture.campaign.name);
    expect(orderMeta(o, '_wholesale_campaign_discount_total')).toBe('20100');
    expect(orderMeta(o, '_es_mayorista')).toBe('true');
    // Mails: precio normal tachado, descuento y total.
    expect(brevoPosts).toHaveLength(2);
    for (const m of brevoPosts) {
      expect(m.htmlContent).toContain('<s style="color:#888">$33.500</s> <b>$26.800</b>');
      expect(m.htmlContent).toContain(`${fixture.campaign.name}: −$20.100`);
      expect(m.htmlContent).toContain('Subtotal a precio mayorista: $100.500');
      expect(m.htmlContent).toContain('Total: <b>$80.400</b>');
    }
  });

  it('pedido mixto: promo (Find Jesus 20%, Napoli 15%) + no promo (Lamb of God, ONLY GOD): metas solo en las líneas promo', async () => {
    const r = await post({ items: [
      { slug: 'find-jesus', name: 'FIND JESUS', size: 'M', quantity: 2, price: 26800 },
      { slug: 'napoli-azurro', name: 'NAPOLI AZURRO', size: 'M', quantity: 4, price: 16150 },
      { slug: 'lamb-of-god', name: 'LAMB OF GOD', size: 'M', quantity: 2, price: 22500 },
      { slug: 'only-god', name: 'ONLY GOD', size: 'M', color: 'Blanca', quantity: 1, price: 29000 },
    ], shipping });
    expect(r.status).toBe(200);
    expect(r.data.total).toBe(26800 * 2 + 16150 * 4 + 22500 * 2 + 29000);
    expect(r.data.campaign.discountTotal).toBe((33500 - 26800) * 2 + (19000 - 16150) * 4);
    const [fj, np, lg, og] = wcOrderPosts[0].line_items;
    expect(metaOf(fj, '_ws_campaign_group')).toBe('20');
    expect(metaOf(np, '_ws_campaign_group')).toBe('15');
    expect(metaOf(np, '_ws_final')).toBe('16150');
    expect(metaOf(lg, '_ws_campaign_id')).toBeUndefined();
    expect(metaOf(lg, '_ws_regular')).toBe('22500');
    expect(metaOf(lg, '_ws_final')).toBe('22500');
    expect(og).toMatchObject({ product_id: 1044, variation_id: 1097, total: '29000' });
    expect(metaOf(og, '_ws_campaign_id')).toBeUndefined();
    expect(orderMeta(wcOrderPosts[0], '_wholesale_campaign_id')).toBe('wc_2026-09_private-stock-sale');
  });

  it('carrito con el precio normal viejo ($33.500) durante la campaña: 409 PRICE_CHANGED hacia abajo, y con confirmPrices cobra $26.800', async () => {
    const r1 = await post({ items: [{ slug: 'find-jesus', name: 'FIND JESUS', size: 'M', quantity: 1, price: 33500 }], shipping });
    expect(r1.status).toBe(409);
    expect(r1.data).toMatchObject({ code: 'PRICE_CHANGED', total: 26800, discountTotal: 6700, campaignIds: ['wc_2026-09_private-stock-sale'] });
    expect(r1.data.changes[0]).toMatchObject({ before: 33500, after: 26800 });
    expect(wcOrderPosts).toHaveLength(0);
    const r2 = await post({ items: [{ slug: 'find-jesus', name: 'FIND JESUS', size: 'M', quantity: 1, price: 33500 }], shipping, confirmPrices: true });
    expect(r2.status).toBe(200);
    expect(wcOrderPosts[0].line_items[0].total).toBe('26800');
  });

  it('el precio del request nunca decide, tampoco bajo campaña ($1 → $26.800)', async () => {
    const r = await post({ items: [{ slug: 'find-jesus', name: 'FIND JESUS', size: 'M', quantity: 1, price: 1 }], shipping, confirmPrices: true });
    expect(r.status).toBe(200);
    expect(wcOrderPosts[0].line_items[0]).toMatchObject({ subtotal: '26800', total: '26800' });
  });

  it('stock sobre la variación correcta bajo campaña: ONLY GOD XL agotada → 409 sin orden', async () => {
    const r = await post({ items: [{ slug: 'find-jesus', name: 'FIND JESUS', size: 'M', quantity: 1, price: 26800 }, { slug: 'only-god', name: 'ONLY GOD', size: 'XL', color: 'Blanca', quantity: 1, price: 29000 }], shipping, confirmPrices: true });
    expect(r.status).toBe(409);
    expect(r.data.unavailable).toEqual([expect.objectContaining({ slug: 'only-god', size: 'XL', reason: 'out-of-stock' })]);
    expect(wcOrderPosts).toHaveLength(0);
  });

  it('mínimo propio de la campaña: pisa al general, no al override del cliente', async () => {
    campaignsResponse = async () => [{ ...fixture.campaign, minOrder: 100000 }];
    const r = await post({ items: [{ slug: 'find-jesus', name: 'FIND JESUS', size: 'M', quantity: 1, price: 26800 }], shipping });
    expect(r.status).toBe(400);
    expect(r.data.message).toContain('100.000');
  });
});

describe('campaña vencida / futura / WP caído', () => {
  it('vencida (03/10 00:00:01 AR) con el carrito a precio promo: 409 PRICE_CHANGED al precio normal, sin metas de campaña al confirmar', async () => {
    vi.setSystemTime(new Date('2026-10-03T00:00:01-03:00'));
    const r1 = await post({ items: [{ slug: 'find-jesus', name: 'FIND JESUS', size: 'M', quantity: 2, price: 26800 }], shipping });
    expect(r1.status).toBe(409);
    expect(r1.data).toMatchObject({ code: 'PRICE_CHANGED', total: 67000, discountTotal: 0, campaignIds: [] });
    expect(r1.data.changes[0]).toMatchObject({ before: 26800, after: 33500 });
    const r2 = await post({ items: [{ slug: 'find-jesus', name: 'FIND JESUS', size: 'M', quantity: 2, price: 26800 }], shipping, confirmPrices: true });
    expect(r2.status).toBe(200);
    expect(r2.data.campaign).toBeNull();
    const line = wcOrderPosts[0].line_items[0];
    expect(line.total).toBe('67000');
    expect(metaOf(line, '_ws_regular')).toBe('33500');
    expect(metaOf(line, '_ws_final')).toBe('33500');
    expect(metaOf(line, '_ws_campaign_id')).toBeUndefined();
    expect(orderMeta(wcOrderPosts[0], '_wholesale_campaign_id')).toBeUndefined();
    expect(brevoPosts[0].htmlContent).not.toContain(fixture.campaign.name);
  });

  it('futura (24/09 17:59 AR): precio normal, sin campaña', async () => {
    vi.setSystemTime(new Date('2026-09-24T17:59:00-03:00'));
    const r = await post({ items: [{ slug: 'find-jesus', name: 'FIND JESUS', size: 'M', quantity: 1, price: 33500 }], shipping });
    expect(r.status).toBe(200);
    expect(r.data.campaign).toBeNull();
    expect(wcOrderPosts[0].line_items[0].total).toBe('33500');
  });

  it('status ended persistido aunque las fechas sigan vigentes: no aplica', async () => {
    campaignsResponse = async () => [{ ...fixture.campaign, status: 'ended' }];
    const r = await post({ items: [{ slug: 'find-jesus', name: 'FIND JESUS', size: 'M', quantity: 1, price: 33500 }], shipping });
    expect(r.status).toBe(200);
    expect(r.data.campaign).toBeNull();
  });

  it('WP no responde las campañas: 502 y no se crea la orden a precio normal', async () => {
    campaignsResponse = async () => { throw new Error('WP 500'); };
    const r = await post({ items: [{ slug: 'find-jesus', name: 'FIND JESUS', size: 'M', quantity: 1, price: 26800 }], shipping, confirmPrices: true });
    expect(r.status).toBe(502);
    expect(wcOrderPosts).toHaveLength(0);
  });
});
