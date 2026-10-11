import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * La ruta de los pedidos internacionales (FedEx, PayPal) con requests armadas a
 * mano, como create-order-precio-route.test.ts para la nacional:
 * - una prenda Próximamente (tag `proximamente`) no se puede pedir aunque
 *   llegue por URL directa o con el carrito manipulado (decisión del 11/10);
 * - el precio por línea y el envío los calcula el servidor, no el navegador.
 */
vi.mock('@/lib/products-server', () => ({
  fetchAllProducts: async () => [
    { slug: 'remera-test', price: 40000, originalPrice: undefined },
    { slug: 'longsleeve-proximamente', price: 60000, originalPrice: undefined },
  ],
}));
vi.mock('@/lib/promo-3x2-status', () => ({ getPromo3x2Status: async () => ({ promoActive: false }) }));
vi.mock('@/lib/promo-champion-status', () => ({ getPromoChampionStatus: async () => ({ promoActive: false }) }));
vi.mock('@/lib/goal-discount', () => ({ getActiveDiscountStatus: async () => ({ active: false }) }));

let pedidoEnviado: any = null;

const productos: Record<string, any> = {
  'remera-test': { id: 10, name: 'REMERA TEST', type: 'simple', weight: '0.25', categories: [{ name: 'Remera' }], tags: [{ slug: 'ss27-part-01' }] },
  'longsleeve-proximamente': { id: 11, name: 'LONGSLEEVE PRÓXIMAMENTE', type: 'simple', weight: '0.3', categories: [{ name: 'Longsleeve' }], tags: [{ slug: 'ss27-part-01' }, { slug: 'proximamente' }] },
};

beforeEach(() => {
  pedidoEnviado = null;
  vi.stubGlobal('fetch', vi.fn(async (url: any, init?: any) => {
    const u = String(url);
    const method = init?.method || 'GET';
    const slug = u.match(/products\?slug=([^&]+)/)?.[1];
    if (slug) return { ok: true, json: async () => (productos[decodeURIComponent(slug)] ? [productos[decodeURIComponent(slug)]] : []) };
    if (u.endsWith('/wc/v3/orders') && method === 'POST') {
      pedidoEnviado = JSON.parse(init.body);
      return { ok: true, json: async () => ({ id: 999, number: '999', order_key: 'wc_order_x', total: '0' }) };
    }
    // send-confirmation y cualquier otro: no importan acá.
    return { ok: true, json: async () => ({}), text: async () => '' };
  }));
});
afterEach(() => { vi.unstubAllGlobals(); });

function req(body: unknown) {
  return new NextRequest('http://localhost/api/create-order-intl', { method: 'POST', body: JSON.stringify(body) });
}

const customer = {
  email: 'a@b.com', nombre: 'A', apellido: 'B', direccion: '1 Main St', cp: '10001',
  ciudad: 'New York', provincia: 'NY', telefono: '+1 212 555 0100', pais: 'US',
};

describe('POST /api/create-order-intl', () => {
  it('una prenda Próximamente se rechaza y no se crea el pedido', async () => {
    const { POST } = await import('@/app/api/create-order-intl/route');
    const res = await POST(req({
      items: [{ id: 'longsleeve-proximamente', name: 'Longsleeve', price: 60000, quantity: 1, size: 'M' }],
      customer, shipping: 0, paymentMethod: 'paypal',
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/not available yet/);
    expect(pedidoEnviado).toBeNull();
  });

  it('mezclada con otra prenda, también se rechaza el pedido entero', async () => {
    const { POST } = await import('@/app/api/create-order-intl/route');
    const res = await POST(req({
      items: [
        { id: 'remera-test', name: 'Remera', price: 40000, quantity: 1, size: 'M' },
        { id: 'longsleeve-proximamente', name: 'Longsleeve', price: 60000, quantity: 1, size: 'M' },
      ],
      customer, shipping: 0, paymentMethod: 'paypal',
    }));
    expect(res.status).toBe(400);
    expect(pedidoEnviado).toBeNull();
  });

  it('una prenda a la venta sale con el precio del catálogo aunque el navegador mande otro', async () => {
    const { POST } = await import('@/app/api/create-order-intl/route');
    const res = await POST(req({
      items: [{ id: 'remera-test', name: 'Remera', price: 1, quantity: 2, size: 'M' }],
      customer, shipping: 0, paymentMethod: 'paypal',
    }));
    expect(res.status).toBe(200);
    expect(pedidoEnviado.line_items[0]).toMatchObject({ product_id: 10, quantity: 2, subtotal: '80000', total: '80000' });
    // El envío lo recalcula el servidor con el tarifario (FedEx), no el 0 del cliente.
    expect(pedidoEnviado.shipping_lines[0].method_id).toBe('fedex_international');
    expect(Number(pedidoEnviado.shipping_lines[0].total)).toBeGreaterThan(0);
  });
});
