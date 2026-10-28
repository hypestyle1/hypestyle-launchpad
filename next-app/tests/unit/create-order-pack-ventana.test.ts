import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  PACK_REGULAR_X4_GRACIA_MS,
  PACK_REGULAR_X4_HASTA,
} from '@/lib/promo-pack-regular';

/**
 * El pack de 4 del evento HYPE 72, en la ruta que crea los pedidos nacionales y
 * con el reloj movido a mano: qué fee line llega a WooCommerce en cada instante.
 *
 * Es la prueba de la garantía "el cliente nunca paga más que el precio
 * promocional mostrado" del lado que cobra. El navegador puede mandar cualquier
 * `discountAmount`: el que vale es el que calcula el servidor con SU reloj
 * (auditoría 28/09, C1), más la gracia del cierre para no cobrar de más a quien
 * todavía estaba viendo el pack de 4.
 */
vi.mock('@/lib/products-server', () => ({
  fetchAllProducts: async () => [
    { slug: 'regular-tee-black', price: 23400, originalPrice: undefined },
    { slug: 'regular-tees-3-pack-black', price: 66300, originalPrice: undefined },
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
      return { ok: true, json: async () => ({ id: 999, number: '999', order_key: 'wc_order_x', total: '0' }) };
    }
    return { ok: true, json: async () => ({}), text: async () => '' };
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/** Fija el reloj del servidor. Solo Date: la ruta usa promesas, no timers. */
function relojDelServidor(t: number | string) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(typeof t === 'string' ? new Date(t) : new Date(t));
}

const customer = {
  email: 'a@b.com', nombre: 'A', apellido: 'B', dni: '30111222',
  direccion: 'Calle 1', cp: '1425', ciudad: 'CABA', provincia: 'CABA', telefono: '1145678900',
};

/** 4 Regular individuales: lo que el carrito muestra a $66.300 en la ventana. */
async function pedirCuatroRegular(descuentoCliente: number) {
  const { POST } = await import('@/app/api/create-order-gocuotas/route');
  const res = await POST(new NextRequest('http://localhost/api/create-order-gocuotas', {
    method: 'POST',
    body: JSON.stringify({
      items: [{ id: 'regular-tee-black', slug: 'regular-tee-black', name: 'Regular Tee Black', price: 23400, quantity: 4, size: 'M', image: '' }],
      customer,
      shipping: 8331,
      discountAmount: descuentoCliente,
      discountLabel: 'Pack Regular x4',
      paymentMethod: 'tarjeta',
      shippingMethodId: 'andreani_estandar',
      shippingLabel: 'Andreani (estándar)',
    }),
  }));
  expect(res.status).toBe(200);
  return pedidoEnviado;
}

// 4 × $23.400 = $93.600. Con el pack del evento se pagan $66.300 → $27.300 de
// descuento. Con el pack de 3 del catálogo ($66.300) solo $3.900.
const DESCUENTO_X4 = 27300;
const DESCUENTO_X3 = 3900;

describe('POST /api/create-order-gocuotas — ventana del pack de 4', () => {
  it('dentro de la ventana cobra $66.300 por 4, con el fee x4', async () => {
    relojDelServidor('2026-11-03T12:00:00-03:00');
    const pedido = await pedirCuatroRegular(DESCUENTO_X4);
    expect(pedido.line_items[0]).toMatchObject({ quantity: 4, subtotal: '93600', total: '93600' });
    expect(pedido.fee_lines).toEqual([{ name: 'Pack Regular x4', total: '-27300', tax_class: '' }]);
  });

  it('el navegador no puede abrir la ventana: fuera de fecha se cobra el pack de 3', async () => {
    // Misma request, con el `discountAmount` del evento, pero el reloj del
    // servidor está lejos de la ventana. Manda el servidor.
    relojDelServidor('2026-10-25T12:00:00-03:00');
    const pedido = await pedirCuatroRegular(DESCUENTO_X4);
    expect(pedido.fee_lines).toEqual([{ name: 'Pack Regular x3', total: '-3900', tax_class: '' }]);
  });

  it('un minuto después del cierre sigue cobrando el pack de 4 (gracia)', async () => {
    // El carrito pudo haber mostrado $66.300 hasta 5 minutos después del cierre:
    // cobrarle el pack de 3 sería cobrarle $23.400 más de lo que vio.
    relojDelServidor(PACK_REGULAR_X4_HASTA + 60_000);
    const pedido = await pedirCuatroRegular(DESCUENTO_X4);
    expect(pedido.fee_lines).toEqual([{ name: 'Pack Regular x4', total: `-${DESCUENTO_X4}`, tax_class: '' }]);
  });

  it('pasada la gracia vuelve el pack de 3 y el total sube: el checkout lo tiene que avisar', async () => {
    relojDelServidor(PACK_REGULAR_X4_HASTA + PACK_REGULAR_X4_GRACIA_MS + 60_000);
    const pedido = await pedirCuatroRegular(DESCUENTO_X4);
    expect(pedido.fee_lines).toEqual([{ name: 'Pack Regular x3', total: `-${DESCUENTO_X3}`, tax_class: '' }]);
    // El pedido queda $23.400 más caro que el que mostró el carrito. Nadie lo
    // paga sin verlo: el checkout compara el total de Woo con el que mostró
    // (authorizedTotal vs montoAPagar) y pide confirmación.
    expect(DESCUENTO_X4 - DESCUENTO_X3).toBe(23400);
  });

  it('apenas abre el evento (1/11 20:30) cobra el pack de 4', async () => {
    relojDelServidor('2026-11-01T20:30:00-03:00');
    const pedido = await pedirCuatroRegular(DESCUENTO_X4);
    expect(pedido.fee_lines).toEqual([{ name: 'Pack Regular x4', total: '-27300', tax_class: '' }]);
  });

  it('media hora antes de abrir (1/11 19:30) todavía es el pack de 3', async () => {
    relojDelServidor('2026-11-01T19:30:00-03:00');
    const pedido = await pedirCuatroRegular(DESCUENTO_X4);
    expect(pedido.fee_lines).toEqual([{ name: 'Pack Regular x3', total: '-3900', tax_class: '' }]);
  });
});
