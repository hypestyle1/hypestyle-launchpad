import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Reintentos en la ruta real: apretar "Pagar" de nuevo después de que falló
 * la pasarela tiene que reusar el pedido pending, no crear otro — que es el
 * origen de los clusters de 5-20 pending del mismo cliente (auditoría 17/10).
 * Y nunca reusar uno ya pagado ni mandar dos veces el mail.
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
let mailsEnviados = 0;
let pedidoGuardado: any = null;

const customer = { email: 'a@b.com', nombre: 'A', apellido: 'B', dni: '30111222', direccion: 'Calle 1', cp: '1425', ciudad: 'CABA', provincia: 'CABA', telefono: '1145678900' };

const body = {
  items: [{ id: 'remera-test', slug: 'remera-test', name: 'Remera', price: 40000, quantity: 1, size: 'M', image: '' }],
  customer, shipping: 8331, discountAmount: 0,
  paymentMethod: 'tarjeta', shippingMethodId: 'andreani_estandar',
};

// Lo que Woo devolvería para el pedido del intento anterior.
function pedidoPendingGuardado() {
  return {
    id: 3992, number: '3992', status: 'pending', created_via: 'rest-api',
    order_key: 'wc_order_abc', date_created_gmt: new Date().toISOString().slice(0, 19),
    billing: { email: 'a@b.com' },
    line_items: [{ product_id: 10, variation_id: 0, quantity: 1, total: '40000.00' }],
    total: '48331.00',
  };
}

beforeEach(() => {
  pedidosCreados = 0;
  mailsEnviados = 0;
  pedidoGuardado = pedidoPendingGuardado();
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
    if (u.includes('/api/send-confirmation')) { mailsEnviados++; return { ok: true, json: async () => ({}) }; }
    if (/\/wc\/v3\/orders\/\d+/.test(u)) {
      return pedidoGuardado
        ? { ok: true, json: async () => pedidoGuardado }
        : { ok: false, status: 404, json: async () => ({}), text: async () => 'not found' };
    }
    if (u.endsWith('/wc/v3/orders') && method === 'POST') {
      pedidosCreados++;
      return { ok: true, json: async () => ({ id: 4000 + pedidosCreados, number: String(4000 + pedidosCreados), order_key: 'wc_order_nuevo', total: '48331' }) };
    }
    return { ok: true, json: async () => ({}), text: async () => '' };
  }));
});
afterEach(() => { vi.unstubAllGlobals(); });

function req(extra: Record<string, unknown> = {}) {
  return new NextRequest('http://localhost/api/create-order-gocuotas', {
    method: 'POST', body: JSON.stringify({ ...body, ...extra }),
    headers: { 'x-real-ip': '181.45.33.9', 'user-agent': 'vitest' },
  });
}

const retry = { wcOrderId: 3992, orderKey: 'wc_order_abc' };

describe('POST /api/create-order-gocuotas — reintentos', () => {
  it('sin retry se crea el pedido, como siempre', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(pedidosCreados).toBe(1);
  });

  it('el reintento reusa el pedido pending: no se crea otro ni se manda otro mail', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const res = await POST(req({ retry }));
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.wcOrderId).toBe(3992);
    expect(json.wcOrderNumber).toBe('3992');
    expect(json.orderKey).toBe('wc_order_abc');
    expect(pedidosCreados).toBe(0);
    expect(mailsEnviados).toBe(0);
  });

  it('cinco clics seguidos dejan un solo pedido', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    await POST(req());                       // el primero lo crea
    for (let i = 0; i < 4; i++) await POST(req({ retry }));
    expect(pedidosCreados).toBe(1);
  });

  it('si el pedido anterior ya se pagó, se crea uno nuevo (no se pisa una venta)', async () => {
    pedidoGuardado = { ...pedidoPendingGuardado(), status: 'processing' };
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const res = await POST(req({ retry }));
    const json = await res.json() as any;
    expect(pedidosCreados).toBe(1);
    expect(json.wcOrderId).toBe(4001);
  });

  it('con la order_key de otro no se puede tocar un pedido ajeno', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const res = await POST(req({ retry: { wcOrderId: 3992, orderKey: 'wc_order_adivinada' } }));
    const json = await res.json() as any;
    expect(pedidosCreados).toBe(1);
    expect(json.wcOrderId).toBe(4001);
  });

  it('si cambió el carrito entre intentos, se crea un pedido nuevo', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const res = await POST(req({
      retry,
      items: [{ id: 'remera-test', slug: 'remera-test', name: 'Remera', price: 40000, quantity: 3, size: 'M', image: '' }],
    }));
    expect(res.status).toBe(200);
    expect(pedidosCreados).toBe(1);
  });

  it('si no se puede leer el pedido anterior, se crea uno nuevo (fail-open)', async () => {
    pedidoGuardado = null; // Woo responde 404
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const res = await POST(req({ retry }));
    expect(res.status).toBe(200);
    expect(pedidosCreados).toBe(1);
  });
});
