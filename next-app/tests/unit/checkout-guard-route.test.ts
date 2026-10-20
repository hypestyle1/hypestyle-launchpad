import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { _resetGuard } from '@/lib/checkout-guard-server';

/**
 * El guard integrado en la ruta real de creación de pedidos:
 *  - datos basura → 400 sin crear nada en Woo;
 *  - creación masiva desde una misma IP/email → 429 genérico (sin revelar la regla);
 *  - si la consulta a Woo se cae, el checkout sigue vendiendo (fail-open);
 *  - un comprador normal pasa y su pedido queda sin marcas.
 */
vi.mock('@/lib/products-server', () => ({
  fetchAllProducts: async () => [
    { slug: 'remera-test', price: 40000, originalPrice: undefined },
  ],
}));
vi.mock('@/lib/promo-3x2-status', () => ({ getPromo3x2Status: async () => ({ promoActive: false }) }));
vi.mock('@/lib/promo-champion-status', () => ({ getPromoChampionStatus: async () => ({ promoActive: false }) }));
vi.mock('@/lib/goal-discount', () => ({ getActiveDiscountStatus: async () => ({ active: false }) }));

let pedidosCreados = 0;
let recientesDeWoo: any = [];
let wooWindowFalla = false;

beforeEach(() => {
  pedidosCreados = 0;
  recientesDeWoo = [];
  wooWindowFalla = false;
  _resetGuard();
  vi.stubEnv('CHECKOUT_GUARD_TEST', '1');
  vi.stubGlobal('fetch', vi.fn(async (url: any, init?: any) => {
    const u = String(url);
    const method = init?.method || 'GET';
    if (u.includes('admin-ajax.php')) {
      return { ok: true, json: async () => ({ rates: [{ id: 'andreani_estandar', label: 'Andreani (estándar)', cost: 8331 }] }) };
    }
    if (u.includes('/wc/v3/coupons')) return { ok: true, json: async () => [] };
    if (u.includes('/wc/v3/products?slug=')) {
      return { ok: true, json: async () => [{ id: 10, type: 'simple', stock_status: 'instock' }] };
    }
    if (u.includes('/wc/v3/orders?after=')) {
      if (wooWindowFalla) return { ok: false, status: 500, json: async () => ({}), text: async () => 'boom' };
      return { ok: true, json: async () => recientesDeWoo };
    }
    if (u.endsWith('/wc/v3/orders') && method === 'POST') {
      pedidosCreados++;
      return { ok: true, json: async () => ({ id: 1000 + pedidosCreados, number: String(1000 + pedidosCreados), order_key: 'wc_order_x', total: '88331' }) };
    }
    return { ok: true, json: async () => ({}), text: async () => '' };
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

const customer = { email: 'a@b.com', nombre: 'A', apellido: 'B', dni: '30111222', direccion: 'Calle 1', cp: '1425', ciudad: 'CABA', provincia: 'CABA', telefono: '1145678900' };

function req(body: unknown, ip = '181.45.33.9') {
  return new NextRequest('http://localhost/api/create-order-gocuotas', {
    method: 'POST', body: JSON.stringify(body),
    headers: { 'x-real-ip': ip, 'x-forwarded-for': ip, 'user-agent': 'vitest' },
  });
}

const body = {
  items: [{ id: 'remera-test', slug: 'remera-test', name: 'Remera', price: 40000, quantity: 1, size: 'M', image: '' }],
  customer, shipping: 8331, discountAmount: 0,
  paymentMethod: 'tarjeta', shippingMethodId: 'andreani_estandar',
};

describe('POST /api/create-order-gocuotas — protección', () => {
  it('datos basura → 400 y no se crea nada en Woo', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const res = await POST(req({ ...body, customer: { ...customer, email: 'noesunmail' } }));
    expect(res.status).toBe(400);
    expect(pedidosCreados).toBe(0);
  });

  it('creación masiva desde una IP: a partir del 5º pedido en ráfaga responde 429 genérico', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      // emails distintos: lo que se prueba es el límite por IP
      const res = await POST(req({ ...body, customer: { ...customer, email: `c${i}@x.com` } }));
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 4)).toEqual([200, 200, 200, 200]);
    expect(statuses[4]).toBe(429);
    expect(statuses[5]).toBe(429);
    expect(pedidosCreados).toBe(4);
    const json = await (await POST(req({ ...body, customer: { ...customer, email: 'c9@x.com' } }))).json();
    expect(JSON.stringify(json)).not.toMatch(/IP|ráfaga|límite|ventana/i);
  });

  it('mismo email en ráfaga también se corta, aunque cambie la IP', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      const res = await POST(req(body, `181.45.33.${10 + i}`));
      statuses.push(res.status);
    }
    expect(statuses).toEqual([200, 200, 200, 429]);
  });

  it('la ventana de 1h contra Woo bloquea aunque la instancia esté fría (memoria vacía)', async () => {
    recientesDeWoo = Array.from({ length: 5 }, () => ({ billing: { email: 'a@b.com' }, meta_data: [] }));
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const res = await POST(req(body));
    expect(res.status).toBe(429);
    expect(pedidosCreados).toBe(0);
  });

  it('si la consulta a Woo se cae, la venta sale igual (fail-open)', async () => {
    wooWindowFalla = true;
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const res = await POST(req(body));
    expect(res.status).toBe(200);
    expect(pedidosCreados).toBe(1);
  });

  it('datos con pinta de inventados: el pedido entra igual pero marcado _hs_riesgo', async () => {
    let pedidoEnviado: any = null;
    (global.fetch as any).mockImplementation(async (url: any, init?: any) => {
      const u = String(url);
      const method = init?.method || 'GET';
      if (u.includes('admin-ajax.php')) return { ok: true, json: async () => ({ rates: [{ id: 'andreani_estandar', label: 'Andreani (estándar)', cost: 8331 }] }) };
      if (u.includes('/wc/v3/coupons')) return { ok: true, json: async () => [] };
      if (u.includes('/wc/v3/products?slug=')) return { ok: true, json: async () => [{ id: 10, type: 'simple', stock_status: 'instock' }] };
      if (u.includes('/wc/v3/orders?after=')) return { ok: true, json: async () => [] };
      if (u.endsWith('/wc/v3/orders') && method === 'POST') {
        pedidoEnviado = JSON.parse(init.body);
        return { ok: true, json: async () => ({ id: 2000, number: '2000', order_key: 'k', total: '88331' }) };
      }
      return { ok: true, json: async () => ({}), text: async () => '' };
    });
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const res = await POST(req({ ...body, customer: { ...customer, nombre: 'Djskskkf', apellido: 'Shshsjsdu', email: 'sdkskskkdsk@gmail.com', telefono: '1133332222' } }));
    expect(res.status).toBe(200);
    const meta = Object.fromEntries((pedidoEnviado.meta_data ?? []).map((m: any) => [m.key, m.value]));
    expect(meta._hs_riesgo).toBe('alto');
  });

  it('un comprador normal pasa sin marcas de riesgo', async () => {
    let pedidoEnviado: any = null;
    (global.fetch as any).mockImplementation(async (url: any, init?: any) => {
      const u = String(url);
      const method = init?.method || 'GET';
      if (u.includes('admin-ajax.php')) return { ok: true, json: async () => ({ rates: [{ id: 'andreani_estandar', label: 'Andreani (estándar)', cost: 8331 }] }) };
      if (u.includes('/wc/v3/coupons')) return { ok: true, json: async () => [] };
      if (u.includes('/wc/v3/products?slug=')) return { ok: true, json: async () => [{ id: 10, type: 'simple', stock_status: 'instock' }] };
      if (u.includes('/wc/v3/orders?after=')) return { ok: true, json: async () => [] };
      if (u.endsWith('/wc/v3/orders') && method === 'POST') {
        pedidoEnviado = JSON.parse(init.body);
        return { ok: true, json: async () => ({ id: 2001, number: '2001', order_key: 'k', total: '88331' }) };
      }
      return { ok: true, json: async () => ({}), text: async () => '' };
    });
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const res = await POST(req(body));
    expect(res.status).toBe(200);
    const meta = Object.fromEntries((pedidoEnviado.meta_data ?? []).map((m: any) => [m.key, m.value]));
    expect(meta._hs_riesgo).toBeUndefined();
  });
});
