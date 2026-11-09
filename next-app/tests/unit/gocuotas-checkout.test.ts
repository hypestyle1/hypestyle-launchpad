import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { telefonoGocuotas } from '@/lib/gocuotas-telefono';
import { urlVueltaGocuotas, vueltaPagar } from '@/lib/repago-link';
import { gocuotasWebhookToken } from '@/lib/gocuotas-webhook-token';

/**
 * fix/gocuotas-checkout — auditoría 9/11/2026 (_claude/auditorias/gocuotas-fallas-2026-11.md).
 *
 * 1. GOcuotas valida con un SMS al teléfono que le mandamos y no deja
 *    corregirlo: el celular se valida antes de crear el pedido.
 * 2. La vuelta sin pagar lleva a /pagar con el mismo pedido, no al checkout.
 * 3. (abandoned-sweep, en abandoned-ya-pago.test.ts)
 */

describe('telefonoGocuotas', () => {
  const validos: [string, string][] = [
    ['1145678900', '5491145678900'],
    ['11 4567-8900', '5491145678900'],
    ['+54 9 11 4567-8900', '5491145678900'],
    ['011 15 4567 8900', '5491145678900'],
    ['02235997413', '5492235997413'],
    ['0351 15 4567890', '5493514567890'],
    // El 54 sin el 9: antes viajaba tal cual (#4321, #4327).
    ['541131060104', '5491131060104'],
    ['542995782713', '5492995782713'],
  ];
  for (const [entrada, esperado] of validos) {
    it(`${entrada} → ${esperado}`, () => {
      const r = telefonoGocuotas(entrada);
      expect(r).toEqual({ ok: true, phone: esperado, nacional: esperado.slice(3) });
    });
  }

  // Los tres largos inválidos que fallaron en producción (#4369, #2610, #4242).
  const invalidos = ['11419037', '112512833', '23145757473', '', '   ', '12345', null, undefined, {}];
  for (const entrada of invalidos) {
    it(`${JSON.stringify(entrada)} → error con mensaje`, () => {
      const r = telefonoGocuotas(entrada);
      expect(r.ok).toBe(false);
      if (r.ok === false) expect(r.error).toMatch(/10 números/);
    });
  }
});

describe('vuelta de GOcuotas a /pagar', () => {
  it('lleva el pedido y la clave', () => {
    expect(urlVueltaGocuotas('https://hypestyle.com.ar', 4494, 'wc_order_AbC123xyz'))
      .toBe('https://hypestyle.com.ar/pagar/4494?key=wc_order_AbC123xyz&gocuotas=volvio');
  });
  it('sin una clave válida mantiene la vuelta vieja al checkout', () => {
    expect(urlVueltaGocuotas('https://hypestyle.com.ar', 4494, '')).toBe('https://hypestyle.com.ar/checkout/?gocuotas=failed');
    expect(urlVueltaGocuotas('https://hypestyle.com.ar', 4494, 'x&key=otra')).toBe('https://hypestyle.com.ar/checkout/?gocuotas=failed');
  });
  it('/pagar reconoce la vuelta', () => {
    expect(vueltaPagar({ gocuotas: 'volvio' })).toBe('gocuotas');
    expect(vueltaPagar({ mp: 'rechazado' })).toBe('rechazado');
    expect(vueltaPagar({ mp: 'pendiente', gocuotas: 'volvio' })).toBe('pendiente');
    expect(vueltaPagar({ gocuotas: 'otra' })).toBeNull();
    expect(vueltaPagar({})).toBeNull();
  });
});

// ─── Rutas ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/products-server', () => ({
  fetchAllProducts: async () => [{ slug: 'remera-test', price: 40000, originalPrice: undefined, category: 'remeras', weight: 0.3 }],
}));
vi.mock('@/lib/promo-3x2-status', () => ({ getPromo3x2Status: async () => ({ promoActive: false }) }));
vi.mock('@/lib/promo-champion-status', () => ({ getPromoChampionStatus: async () => ({ promoActive: false }) }));
vi.mock('@/lib/goal-discount', () => ({ getActiveDiscountStatus: async () => ({ active: false }) }));

let llamadas: { method: string; url: string; body: any }[] = [];
let pedidoWoo: any = null;

beforeEach(() => {
  llamadas = [];
  pedidoWoo = { id: 4494, status: 'pending', total: '33165.00', order_key: 'wc_order_AbC123xyz', payment_method: 'gocuotas',
    billing: { email: 'a@b.com', phone: '1145678900' }, date_created_gmt: '2026-11-09T22:15:39' };
  vi.resetModules();
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('CHECKOUT_VALIDACION', 'observar');
  vi.stubEnv('GOCUOTAS_API_KEY', 'clave-de-test');
  vi.stubEnv('GOCUOTAS_WEBHOOK_SECRET', '');
  vi.stubEnv('WC_CONSUMER_KEY', 'ck_test');
  vi.stubEnv('WC_CONSUMER_SECRET', 'cs_test');
  vi.stubGlobal('fetch', vi.fn(async (url: any, init?: any) => {
    const u = String(url);
    const method = init?.method || 'GET';
    llamadas.push({ method, url: u, body: init?.body ? JSON.parse(init.body) : null });
    if (u.includes('admin-ajax.php')) return { ok: true, json: async () => ({ rates: [{ id: 'andreani_estandar', label: 'Andreani (estándar)', cost: 8331 }] }) };
    if (u.includes('/wc/v3/coupons')) return { ok: true, json: async () => [] };
    if (u.includes('/wc/v3/products?slug=')) return { ok: true, json: async () => [{ id: 10, type: 'simple', stock_status: 'instock', tags: [] }] };
    if (u.endsWith('/wc/v3/orders') && method === 'POST') {
      return { ok: true, json: async () => ({ id: 999, number: '999', order_key: 'wc_order_x', total: '48331' }), text: async () => '' };
    }
    if (u.includes('gocuotas.com/api_redirect/v1/checkouts')) {
      return { ok: true, status: 200, text: async () => JSON.stringify({ url_init: 'https://www.gocuotas.com/checkouts/1' }) };
    }
    if (/\/wc\/v3\/orders\/\d+(\?|$)/.test(u) && method === 'GET') return { ok: true, status: 200, json: async () => pedidoWoo };
    return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
  }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const CUSTOMER = { email: 'a@b.com', nombre: 'Ana', apellido: 'Pérez', dni: '30111222', direccion: 'Calle 1', cp: '1425', ciudad: 'CABA', provincia: 'CABA', telefono: '1145678900' };
const cuerpo = (extra: Record<string, unknown> = {}) => ({
  items: [{ id: 'remera-test', slug: 'remera-test', name: 'Remera', price: 40000, quantity: 1, size: 'M', image: '' }],
  customer: CUSTOMER, shipping: 8331, paymentMethod: 'gocuotas', shippingMethodId: 'andreani_estandar', ...extra,
});
const reqCreate = (body: unknown) => new NextRequest('http://localhost/api/create-order-gocuotas', { method: 'POST', body: JSON.stringify(body) });

describe('POST /api/create-order-gocuotas — celular para GOcuotas', () => {
  it('GOcuotas con un celular incompleto → 422 en el campo teléfono, sin crear el pedido (aun en modo observar)', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const res = await POST(reqCreate(cuerpo({ customer: { ...CUSTOMER, telefono: '11419037' } })));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.codigo).toBe('datos_invalidos');
    expect(Object.keys(body.errores)).toEqual(['telefono']);
    expect(JSON.stringify(body)).not.toContain('11419037');
    expect(llamadas).toEqual([]);
  });

  it('el mismo teléfono con tarjeta no se frena por esta regla', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const res = await POST(reqCreate(cuerpo({ paymentMethod: 'tarjeta', customer: { ...CUSTOMER, telefono: '11419037' } })));
    expect(res.status).not.toBe(422);
    expect(llamadas.some(l => l.method === 'POST' && l.url.endsWith('/wc/v3/orders'))).toBe(true);
  });

  it('GOcuotas con un celular válido crea el pedido', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const res = await POST(reqCreate(cuerpo({ customer: { ...CUSTOMER, telefono: '+54 9 11 4567-8900' } })));
    expect(res.status).toBe(200);
  });
});

const reqOrder = () => new NextRequest('http://localhost/api/gocuotas-order', {
  method: 'POST', body: JSON.stringify({ wcOrderId: 4494, email: 'x', phone: 'x', orderKey: 'x' }),
});

describe('POST /api/gocuotas-order', () => {
  it('manda 549 + 10 dígitos y vuelve a /pagar con el pedido', async () => {
    pedidoWoo.billing.phone = '541131060104'; // el 54 sin 9
    const { POST } = await import('@/app/api/gocuotas-order/route');
    const res = await POST(reqOrder());
    expect(res.status).toBe(200);
    const checkout = llamadas.find(l => l.url.includes('/api_redirect/v1/checkouts'));
    expect(checkout?.body.phone_number).toBe('5491131060104');
    expect(checkout?.body.url_failure).toBe('https://hypestyle.com.ar/pagar/4494?key=wc_order_AbC123xyz&gocuotas=volvio');
    expect(checkout?.body.amount_in_cents).toBe(3316500);
  });

  it('con un teléfono que no sirve no crea el checkout en GOcuotas', async () => {
    pedidoWoo.billing.phone = '11419037';
    const { POST } = await import('@/app/api/gocuotas-order/route');
    const res = await POST(reqOrder());
    expect(res.status).toBe(422);
    expect((await res.json()).campo).toBe('telefono');
    expect(llamadas.some(l => l.url.includes('gocuotas.com'))).toBe(false);
  });
});

describe('POST /api/gocuotas-webhook — aprobado sobre un pedido que ya se pasó a otro medio', () => {
  const reqHook = (body: unknown) => new NextRequest(
    `http://localhost/api/gocuotas-webhook?token=${gocuotasWebhookToken(4494)}`,
    { method: 'POST', body: JSON.stringify(body) },
  );

  it('approved → 409, alerta en el pedido, el pedido no se toca', async () => {
    vi.stubEnv('GOCUOTAS_API_KEY', 'clave-de-test');
    pedidoWoo.payment_method = 'tarjeta';
    const { POST } = await import('@/app/api/gocuotas-webhook/route');
    const res = await POST(reqHook({ order_reference_id: '4494', status: 'approved', order_id: 123, amount_in_cents: 3316500 }));
    expect(res.status).toBe(409);
    const nota = llamadas.find(l => l.method === 'POST' && l.url.includes('/orders/4494/notes'));
    expect(nota?.body.note).toMatch(/^ALERTA/);
    expect(nota?.body.note).toContain('tarjeta');
    expect(llamadas.some(l => l.method === 'PUT')).toBe(false);
  });

  it('denied → 409 sin nota (el vencimiento de siempre, nada que revisar)', async () => {
    pedidoWoo.payment_method = 'tarjeta';
    const { POST } = await import('@/app/api/gocuotas-webhook/route');
    const res = await POST(reqHook({ order_reference_id: '4494', status: 'denied' }));
    expect(res.status).toBe(409);
    expect(llamadas.some(l => l.url.includes('/notes'))).toBe(false);
  });
});
