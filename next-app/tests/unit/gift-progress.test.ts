import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { giftProgressKey, giftProgressPayload } from '@/lib/gift-progress-payload';
import { computePackRegularDiscount } from '@/lib/promo-pack-regular';

/**
 * Bug D12 — el regalo por compra se prometía en el carrito y el pedido salía
 * sin él.
 *
 * Dos lados de la misma cuenta:
 *  - la barra del carrito tiene que restar el descuento de pack (y 3x2 /
 *    CAMPEON50), que son los que SÍ restan del monto elegible al crear el
 *    pedido, y NO el 10% por transferencia;
 *  - el pedido tiene que viajar con la porción de transferencia en el meta
 *    `_hs_transfer_discount`, porque los descuentos van concatenados en una
 *    sola fee line y del nombre no se pueden separar.
 */

const PRECIO_PACK = 120000;
const REGULAR = 45000;

describe('payload de la barra de regalo', () => {
  const linea = (id: string, quantity: number) => ({ id, size: 'M', quantity });

  it('sin pack el progreso no resta nada', () => {
    const items = [linea('buzo-oversize', 1)];
    const p = giftProgressPayload(items);
    expect(p.promo_discount).toBe(0);
    expect(p.items).toEqual([{ slug: 'buzo-oversize', size: 'M', quantity: 1 }]);
    expect(p.coupon_codes).toEqual([]);
  });

  it('con pack resta el descuento de pack, con la misma función que cobra el servidor', () => {
    // 3 Regular a $45.000 = $135.000, que al precio del pack son $120.000.
    const carrito = [{ id: 'regular-tee-black', price: REGULAR, quantity: 2 }, { id: 'regular-tee-white', price: REGULAR, quantity: 1 }];
    const packDiscount = computePackRegularDiscount(carrito, PRECIO_PACK);
    expect(packDiscount).toBe(15000);

    const p = giftProgressPayload([linea('regular-tee-black', 2), linea('regular-tee-white', 1)], { promoDiscount: packDiscount });
    expect(p.promo_discount).toBe(15000);
    // El plugin hace subtotal − promo_discount: $120.000, el mismo monto
    // elegible que va a calcular sobre el pedido ya creado.
    expect(REGULAR * 3 - p.promo_discount).toBe(120000);
  });

  it('el 10% de transferencia nunca entra en el payload', () => {
    // La barra no conoce el medio de pago y no tiene que conocerlo: el umbral
    // se mira antes del 10% en los dos lados.
    const p = giftProgressPayload([linea('regular-tee-black', 3)], { promoDiscount: 15000 });
    expect(Object.values(p)).not.toContain(12000); // 10% de $120.000
    expect(p.promo_discount).toBe(15000);
    expect(p).not.toHaveProperty('payment_method');
  });

  it('un descuento inválido no se manda', () => {
    expect(giftProgressPayload([linea('regular-tee-black', 3)], { promoDiscount: -5000 }).promo_discount).toBe(0);
    expect(giftProgressPayload([linea('regular-tee-black', 3)], { promoDiscount: NaN }).promo_discount).toBe(0);
    expect(giftProgressPayload([linea('regular-tee-black', 3)], {}).promo_discount).toBe(0);
  });

  it('cupón y email siguen viajando igual', () => {
    const p = giftProgressPayload([linea('regular-tee-black', 1)], { couponCode: 'FIRST10', email: 'a@b.com', promoDiscount: 0 });
    expect(p.coupon_codes).toEqual(['FIRST10']);
    expect(p.customer).toEqual({ email: 'a@b.com' });
  });

  it('la clave de caché cambia cuando cambia el descuento de promo', () => {
    const items = [linea('regular-tee-black', 3)];
    expect(giftProgressKey(items, { promoDiscount: 0 })).not.toBe(giftProgressKey(items, { promoDiscount: 15000 }));
    expect(giftProgressKey(items, { promoDiscount: 15000 })).toBe(giftProgressKey(items, { promoDiscount: 15000 }));
  });
});

// ─── El pedido lleva la porción de transferencia ─────────────────────────────

vi.mock('@/lib/products-server', () => ({
  fetchAllProducts: async () => [
    { slug: 'regular-tee-black', price: 45000, originalPrice: undefined },
    { slug: 'regular-tees-3-pack-black', price: 120000, originalPrice: undefined },
  ],
}));
vi.mock('@/lib/promo-3x2-status', () => ({ getPromo3x2Status: async () => ({ promoActive: false }) }));
vi.mock('@/lib/promo-champion-status', () => ({ getPromoChampionStatus: async () => ({ promoActive: false }) }));
vi.mock('@/lib/goal-discount', () => ({ getActiveDiscountStatus: async () => ({ active: false }) }));

let pedidoEnviado: any = null;

beforeEach(() => {
  // Estos casos prueban el pack habitual x3, no la ventana Cyber. No depender
  // de la hora real del runner (a las 19:00 del 1/11 cambia la etiqueta a x4).
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-31T12:00:00-03:00'));
  pedidoEnviado = null;
  vi.stubGlobal('fetch', vi.fn(async (url: any, init?: any) => {
    const u = String(url);
    const method = init?.method || 'GET';
    if (u.includes('admin-ajax.php')) {
      return { ok: true, json: async () => ({ rates: [{ id: 'andreani_sucursal', label: 'Andreani (sucursal)', cost: 5556 }] }) };
    }
    if (u.includes('/wc/v3/coupons')) return { ok: true, json: async () => [] };
    if (u.includes('/wc/v3/products?slug=')) return { ok: true, json: async () => [{ id: 10, type: 'simple', stock_status: 'instock' }] };
    if (u.endsWith('/wc/v3/orders') && method === 'POST') {
      pedidoEnviado = JSON.parse(init.body);
      return { ok: true, json: async () => ({ id: 999, number: '999', order_key: 'wc_order_x', total: '0' }) };
    }
    return { ok: true, json: async () => ({}), text: async () => '' };
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const customer = { email: 'a@b.com', nombre: 'A', apellido: 'B', direccion: 'Calle 1', cp: '1425', ciudad: 'CABA', provincia: 'CABA', telefono: '1145678900' };

function req(body: unknown) {
  return new NextRequest('http://localhost/api/create-order-gocuotas', { method: 'POST', body: JSON.stringify(body) });
}

const metaDe = (key: string) => (pedidoEnviado?.meta_data ?? []).find((m: any) => m.key === key);

describe('POST /api/create-order-gocuotas — meta _hs_transfer_discount', () => {
  const item = (quantity: number) => ({ id: 'regular-tee-black', name: 'Regular Tee Black', price: REGULAR, quantity, size: 'M', image: '' });
  const pedido = (paymentMethod: string, quantity: number) => req({
    items: [item(quantity)], customer, shipping: 5556, paymentMethod, shippingMethodId: 'andreani_sucursal',
  });

  it('transferencia sola: el meta trae el 10%', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    await POST(pedido('transferencia', 1));
    expect(pedidoEnviado.fee_lines).toEqual([{ name: 'Transferencia (10%)', total: '-4500', tax_class: '' }]);
    expect(metaDe('_hs_transfer_discount')).toEqual({ key: '_hs_transfer_discount', value: '4500' });
  });

  it('transferencia + pack: el fee va combinado y el meta separa la porción', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    await POST(pedido('transferencia', 3));
    // $135.000 → pack $120.000 (−$15.000) → 10% sobre $120.000 = $12.000.
    expect(pedidoEnviado.fee_lines).toEqual([{ name: 'Pack Regular x3 + Transferencia (10%)', total: '-27000', tax_class: '' }]);
    expect(metaDe('_hs_transfer_discount')).toEqual({ key: '_hs_transfer_discount', value: '12000' });
    // El plugin resta 27000 − 12000 = 15000 → monto elegible $120.000, el mismo
    // que mostró la barra del carrito.
    expect(REGULAR * 3 - (27000 - 12000)).toBe(120000);
  });

  it('sin transferencia no se escribe el meta', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    await POST(pedido('tarjeta', 3));
    expect(pedidoEnviado.fee_lines).toEqual([{ name: 'Pack Regular x3', total: '-15000', tax_class: '' }]);
    expect(metaDe('_hs_transfer_discount')).toBeUndefined();
  });
});
