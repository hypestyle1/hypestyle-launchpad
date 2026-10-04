import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Prueba de punta a punta de la ruta que crea los pedidos nacionales con una
 * request armada a mano (auditoría 28/09, C1): precio $1, descuento inflado y
 * envío en cero. El pedido que llega a WooCommerce tiene que salir con el
 * precio del catálogo, el descuento real y el envío del tarifario.
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
        { id: 'andreani_sucursal', label: 'Andreani (sucursal)', cost: 5556 },
        { id: 'andreani_estandar', label: 'Andreani (estándar)', cost: 8331 },
      ] }) };
    }
    if (u.includes('/wc/v3/coupons')) return { ok: true, json: async () => [] };
    if (u.includes('/wc/v3/products?slug=')) {
      return { ok: true, json: async () => [{ id: 10, type: 'simple', stock_status: 'instock' }] };
    }
    if (u.endsWith('/wc/v3/orders') && method === 'POST') {
      pedidoEnviado = JSON.parse(init.body);
      return { ok: true, json: async () => ({ id: 999, number: '999', order_key: 'wc_order_x', total: '0' }) };
    }
    return { ok: true, json: async () => ({}), text: async () => '' };
  }));
});
afterEach(() => { vi.unstubAllGlobals(); });

function req(body: unknown) {
  return new NextRequest('http://localhost/api/create-order-gocuotas', { method: 'POST', body: JSON.stringify(body) });
}

const customer = { email: 'a@b.com', nombre: 'A', apellido: 'B', dni: '30111222', direccion: 'Calle 1', cp: '1425', ciudad: 'CABA', provincia: 'CABA', telefono: '1145678900' };

describe('POST /api/create-order-gocuotas — precio en el servidor', () => {
  it('un pedido con precio $1, descuento inflado y envío 0 sale con los importes reales', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const res = await POST(req({
      items: [{ id: 'remera-test', slug: 'remera-test', name: 'Remera', price: 1, quantity: 2, size: 'M', image: '' }],
      customer,
      shipping: 0,
      discountAmount: 79999,
      discountLabel: '3x2',
      paymentMethod: 'tarjeta',
      shippingMethodId: 'andreani_estandar',
      shippingLabel: 'Envío gratis',
    }));
    expect(res.status).toBe(200);
    expect(pedidoEnviado.line_items[0]).toMatchObject({ product_id: 10, quantity: 2, subtotal: '80000', total: '80000' });
    expect(pedidoEnviado.fee_lines).toEqual([]);
    expect(pedidoEnviado.shipping_lines[0]).toMatchObject({ total: '8331', method_title: 'Andreani (estándar)' });
  });

  it('transferencia: el 10% lo calcula el servidor', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    await POST(req({
      items: [{ id: 'remera-test', name: 'Remera', price: 1, quantity: 1, size: 'M' }],
      customer, shipping: 5556, discountAmount: 40000,
      paymentMethod: 'transferencia', shippingMethodId: 'andreani_sucursal',
    }));
    expect(pedidoEnviado.fee_lines).toEqual([{ name: 'Transferencia (10%)', total: '-4000', tax_class: '' }]);
  });

  it('una tarifa de envío inventada se rechaza sin crear el pedido', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const res = await POST(req({
      items: [{ id: 'remera-test', name: 'Remera', price: 40000, quantity: 1, size: 'M' }],
      customer, shipping: 0, paymentMethod: 'tarjeta', shippingMethodId: 'envio_gratis_trucho',
    }));
    expect(res.status).toBe(400);
    expect(pedidoEnviado).toBeNull();
  });

  it('un producto que no existe en el catálogo se rechaza', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const res = await POST(req({
      items: [{ id: 'producto-inventado', name: 'X', price: 1, quantity: 1, size: 'M' }],
      customer, shipping: 0, paymentMethod: 'tarjeta', shippingMethodId: 'andreani_estandar',
    }));
    expect(res.status).toBe(400);
    expect(pedidoEnviado).toBeNull();
  });
});
