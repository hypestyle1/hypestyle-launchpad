import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Integración del camino a sucursal: checkout → pedido en WooCommerce → lectura
 * del panel. El checkout ya no pide domicilio ni barrio cuando el envío es a
 * sucursal (PR #601), así que la sucursal elegida es el ÚNICO dato que dice a
 * dónde va el paquete. Si se pierde, el pedido no se puede despachar y el panel
 * no tiene con qué contestarle al cliente (caso #4054).
 *
 * Lo que fija este test:
 *   - el pedido guarda nombre+dirección (`_shipping_branch`) Y código
 *     (`_shipping_branch_code`), que es el único que lee el plugin de Andreani;
 *   - guarda la tarifa elegida en `_chosen_shipping` y la línea de envío con el
 *     method_id que espera el plugin;
 *   - si el checkout no encontró sucursales, queda escrito "A COORDINAR" en vez
 *     de un pedido que parece de domicilio;
 *   - lo que queda guardado es exactamente lo que el panel después lee
 *     (entregaDeOrden sobre la misma meta).
 */
vi.mock('@/lib/products-server', () => ({
  fetchAllProducts: async () => [{ slug: 'camo-cap-grey', price: 38700, originalPrice: undefined }],
}));
vi.mock('@/lib/promo-3x2-status', () => ({ getPromo3x2Status: async () => ({ promoActive: false }) }));
vi.mock('@/lib/promo-champion-status', () => ({ getPromoChampionStatus: async () => ({ promoActive: false }) }));
vi.mock('@/lib/goal-discount', () => ({ getActiveDiscountStatus: async () => ({ active: false }) }));

import { entregaDeOrden } from '@/lib/orders-entrega';

let pedidoEnviado: any = null;

beforeEach(() => {
  pedidoEnviado = null;
  vi.stubGlobal('fetch', vi.fn(async (url: any, init?: any) => {
    const u = String(url);
    const method = init?.method || 'GET';
    if (u.includes('admin-ajax.php')) {
      return { ok: true, json: async () => ({ rates: [
        { id: 'andreani_pyme_sucursal', label: 'Andreani (sucursal)', cost: 6408 },
      ] }) };
    }
    if (u.includes('/wc/v3/coupons')) return { ok: true, json: async () => [] };
    if (u.includes('/wc/v3/products?slug=')) {
      return { ok: true, json: async () => [{ id: 10, type: 'simple', stock_status: 'instock' }] };
    }
    if (u.endsWith('/wc/v3/orders') && method === 'POST') {
      pedidoEnviado = JSON.parse(init.body);
      return { ok: true, json: async () => ({ id: 4054, number: '4054', order_key: 'wc_x', total: '45108' }) };
    }
    return { ok: true, json: async () => ({}), text: async () => '' };
  }));
});
afterEach(() => { vi.unstubAllGlobals(); });

const customer = {
  email: 'soysanti@test.com', nombre: 'Santiago', apellido: 'Fortunato', dni: '49009349',
  direccion: 'arenales 2141', cp: '1602', ciudad: 'Florida', provincia: 'Buenos Aires', telefono: '1138898802',
};

const base = {
  items: [{ id: 'camo-cap-grey', slug: 'camo-cap-grey', name: 'CAMO CAP — GREY', price: 38700, quantity: 1, size: '', image: '' }],
  customer, shipping: 6408, discountAmount: 0,
  paymentMethod: 'transferencia',
  shippingMethodId: 'andreani_pyme_sucursal',
  shippingLabel: 'Andreani (sucursal)',
};

const meta = (pedido: any): Record<string, string> =>
  Object.fromEntries((pedido.meta_data ?? []).map((m: any) => [m.key, String(m.value)]));

async function crear(body: Record<string, unknown>) {
  const { POST } = await import('@/app/api/create-order-gocuotas/route');
  const res = await POST(new NextRequest('http://localhost/api/create-order-gocuotas', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }));
  expect(res.status).toBeLessThan(400);
  return pedidoEnviado;
}

describe('POST /api/create-order-gocuotas — envío a sucursal', () => {
  it('guarda la sucursal elegida con nombre, dirección y código', async () => {
    const pedido = await crear({
      ...base,
      shippingBranch: 'PUNTO ANDREANI HOP GRAL JOSÉ DE SAN MARTÍN 2002 — Gral José de San Martín 2002, Florida',
      shippingBranchCode: 'HOP8754',
    });
    const m = meta(pedido);
    expect(m._shipping_branch).toBe('PUNTO ANDREANI HOP GRAL JOSÉ DE SAN MARTÍN 2002 — Gral José de San Martín 2002, Florida');
    expect(m._shipping_branch_code).toBe('HOP8754');
  });

  it('guarda la tarifa elegida, que es de donde la lee el plugin de Andreani', async () => {
    const pedido = await crear({ ...base, shippingBranch: 'X — Y', shippingBranchCode: 'HOP1' });
    expect(meta(pedido)._chosen_shipping).toBe('andreani_pyme_sucursal');
  });

  it('la línea de envío lleva el method_id del plugin, no el id de la tarifa', async () => {
    const pedido = await crear({ ...base, shippingBranch: 'X — Y', shippingBranchCode: 'HOP1' });
    expect(pedido.shipping_lines[0].method_id).toBe('andreani_flexipaas');
    expect(pedido.shipping_lines[0].method_title).toBe('Andreani (sucursal)');
  });

  it('el panel lee de esa meta exactamente la sucursal que eligió el cliente', async () => {
    const pedido = await crear({
      ...base,
      shippingBranch: 'PUNTO ANDREANI HOP GRAL JOSÉ DE SAN MARTÍN 2002 — Gral José de San Martín 2002, Florida',
      shippingBranchCode: 'HOP8754',
    });
    const m = meta(pedido);
    const entrega = entregaDeOrden(pedido.shipping_lines, (k) => m[k] ?? '');
    expect(entrega.tipo).toBe('sucursal');
    expect(entrega.incompleto).toBe(false);
    expect(entrega.sucursal).toEqual({
      nombre: 'PUNTO ANDREANI HOP GRAL JOSÉ DE SAN MARTÍN 2002',
      direccion: 'Gral José de San Martín 2002, Florida',
      codigo: 'HOP8754',
    });
  });

  it('sin sucursales para el CP queda "A COORDINAR", no un pedido que parece de domicilio', async () => {
    const pedido = await crear({ ...base, shippingBranch: 'A COORDINAR — no se encontraron sucursales para el CP' });
    const m = meta(pedido);
    expect(m._shipping_branch).toMatch(/^A COORDINAR/);
    expect(m._shipping_branch_code).toBeUndefined();

    const entrega = entregaDeOrden(pedido.shipping_lines, (k) => m[k] ?? '');
    expect(entrega.tipo).toBe('sucursal');
    expect(entrega.sucursal).toBeNull();
    expect(entrega.incompleto).toBe(true);
  });

  it('a domicilio no se cuelga ninguna meta de sucursal', async () => {
    const pedido = await crear({ ...base, shippingMethodId: 'andreani_pyme_sucursal', shippingLabel: 'Andreani (estándar)' });
    const m = meta(pedido);
    expect(m._shipping_branch).toBeUndefined();
    expect(m._shipping_branch_code).toBeUndefined();
  });

  it('la dirección del cliente se guarda igual: es su dato de contacto, no el destino', async () => {
    const pedido = await crear({ ...base, shippingBranch: 'X — Y', shippingBranchCode: 'HOP1' });
    expect(pedido.billing.address_1).toBe('arenales 2141');
    expect(pedido.shipping.address_1).toBe('arenales 2141');
  });
});

/**
 * Caso #4057 (23/10/2026): desde #601 el checkout no pide domicilio cuando el
 * envío es a sucursal, y el plugin de Andreani frena el alta de la guía si el
 * pedido no tiene dirección y ciudad ("Datos de destino incompletos: faltan
 * dirección"). El destino de un envío a sucursal ES la sucursal, así que es su
 * calle lo que va en el envío del pedido.
 */
describe('POST /api/create-order-gocuotas — sucursal sin domicilio del comprador', () => {
  const sinDomicilio = {
    ...base,
    customer: { ...customer, direccion: '', ciudad: '' },
  };

  it('el envío del pedido queda con la calle y la localidad de la sucursal', async () => {
    const pedido = await crear({
      ...sinDomicilio,
      shippingBranch: 'COMODORO RIVADAVIA (CENTRO) — Sarmiento 128, Comodoro Rivadavia',
      shippingBranchCode: 'CRD',
      shippingBranchStreet: 'Sarmiento 128',
      shippingBranchCity: 'Comodoro Rivadavia',
    });
    expect(pedido.shipping.address_1).toBe('Sarmiento 128');
    expect(pedido.shipping.city).toBe('Comodoro Rivadavia');
    // La facturación no se toca: el comprador nunca dio un domicilio.
    expect(pedido.billing.address_1).toBe('');
  });

  it('sirve igual con un checkout viejo que solo manda el texto de la sucursal', async () => {
    const pedido = await crear({
      ...sinDomicilio,
      shippingBranch: 'PUNTO ANDREANI HOP PERÚ 628 — Perú 628, C.a.b.a.',
      shippingBranchCode: 'HOP9',
    });
    expect(pedido.shipping.address_1).toBe('Perú 628');
    expect(pedido.shipping.city).toBe('C.a.b.a.');
  });

  it('sin sucursal elegida ("A COORDINAR") no se inventa una dirección', async () => {
    const pedido = await crear({
      ...sinDomicilio,
      shippingBranch: 'A COORDINAR — no se encontraron sucursales para el CP',
    });
    expect(pedido.shipping.address_1).toBe('');
  });

  it('con domicilio cargado manda el del comprador, no el de la sucursal', async () => {
    const pedido = await crear({
      ...base,
      shippingBranch: 'COMODORO RIVADAVIA (CENTRO) — Sarmiento 128, Comodoro Rivadavia',
      shippingBranchCode: 'CRD',
      shippingBranchStreet: 'Sarmiento 128',
      shippingBranchCity: 'Comodoro Rivadavia',
    });
    expect(pedido.shipping.address_1).toBe('arenales 2141');
    expect(pedido.shipping.city).toBe('Florida');
  });

  it('el depto sin dirección no deja un ", 4B" suelto', async () => {
    const pedido = await crear({
      ...base,
      customer: { ...customer, direccion: '', depto: '4B' },
      shippingBranch: 'A COORDINAR — no se encontraron sucursales para el CP',
    });
    expect(pedido.billing.address_1).toBe('');
  });
});
