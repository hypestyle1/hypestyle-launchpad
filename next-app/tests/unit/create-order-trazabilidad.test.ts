import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Trazabilidad (auditoría 17/10): el pedido que llega a WooCommerce tiene que
 * llevar la IP y el user-agent del visitante (meta `_hs_client_ip` /
 * `_hs_client_ua`) y los IDs de sesión de Clarity que mandó el navegador.
 * Sin headers (local, tests, plataformas sin proxy) el pedido sale sin esos
 * meta, igual que siempre — nunca con valores basura.
 */
vi.mock('@/lib/products-server', () => ({
  fetchAllProducts: async () => [
    { slug: 'remera-test', price: 40000, originalPrice: undefined },
  ],
}));
vi.mock('@/lib/promo-3x2-status', () => ({ getPromo3x2Status: async () => ({ promoActive: false }) }));
vi.mock('@/lib/promo-champion-status', () => ({ getPromoChampionStatus: async () => ({ promoActive: false }) }));
vi.mock('@/lib/goal-discount', () => ({ getActiveDiscountStatus: async () => ({ active: false }) }));

let pedidoEnviado: any = null;

beforeEach(() => {
  pedidoEnviado = null;
  vi.stubGlobal('fetch', vi.fn(async (url: any, init?: any) => {
    const u = String(url);
    const method = init?.method || 'GET';
    if (u.includes('admin-ajax.php')) {
      return { ok: true, json: async () => ({ rates: [
        { id: 'andreani_estandar', label: 'Andreani (estándar)', cost: 8331 },
      ] }) };
    }
    if (u.includes('/wc/v3/coupons')) return { ok: true, json: async () => [] };
    if (u.includes('/wc/v3/products?slug=')) {
      return { ok: true, json: async () => [{ id: 10, type: 'simple', stock_status: 'instock' }] };
    }
    if (u.endsWith('/wc/v3/orders') && method === 'POST') {
      pedidoEnviado = JSON.parse(init.body);
      return { ok: true, json: async () => ({ id: 999, number: '999', order_key: 'wc_order_x', total: '88331' }) };
    }
    return { ok: true, json: async () => ({}), text: async () => '' };
  }));
});
afterEach(() => { vi.unstubAllGlobals(); });

const customer = { email: 'a@b.com', nombre: 'A', apellido: 'B', dni: '30111222', direccion: 'Calle 1', cp: '1425', ciudad: 'CABA', provincia: 'CABA', telefono: '1145678900' };

const body = {
  items: [{ id: 'remera-test', slug: 'remera-test', name: 'Remera', price: 40000, quantity: 1, size: 'M', image: '' }],
  customer, shipping: 8331, discountAmount: 0,
  paymentMethod: 'tarjeta', shippingMethodId: 'andreani_estandar',
};

function metaDe(pedido: any): Record<string, string> {
  return Object.fromEntries((pedido.meta_data ?? []).map((m: any) => [m.key, m.value]));
}

describe('POST /api/create-order-gocuotas — trazabilidad', () => {
  it('con headers de Vercel, el pedido lleva IP, user-agent y sesión de Clarity', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const res = await POST(new NextRequest('http://localhost/api/create-order-gocuotas', {
      method: 'POST',
      body: JSON.stringify({ ...body, clarityUser: 'abc123', claritySession: 's9d8f7' }),
      headers: {
        'x-real-ip': '181.45.33.9',
        'x-forwarded-for': '181.45.33.9',
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
      },
    }));
    expect(res.status).toBe(200);
    const meta = metaDe(pedidoEnviado);
    expect(meta._hs_client_ip).toBe('181.45.33.9');
    expect(meta._hs_client_ua).toContain('Mozilla/5.0');
    expect(meta._clarity_user).toBe('abc123');
    expect(meta._clarity_session).toBe('s9d8f7');
  });

  it('sin headers ni cookies, el pedido sale sin esos meta (nunca basura)', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const res = await POST(new NextRequest('http://localhost/api/create-order-gocuotas', {
      method: 'POST', body: JSON.stringify(body),
    }));
    expect(res.status).toBe(200);
    const meta = metaDe(pedidoEnviado);
    expect(meta._hs_client_ip).toBeUndefined();
    expect(meta._clarity_user).toBeUndefined();
  });

  it('una IP spoofeada sin forma de IP no se guarda', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    await POST(new NextRequest('http://localhost/api/create-order-gocuotas', {
      method: 'POST', body: JSON.stringify(body),
      headers: { 'x-forwarded-for': '<img src=x>, 1.2.3.4' },
    }));
    expect(metaDe(pedidoEnviado)._hs_client_ip).toBeUndefined();
  });
});
