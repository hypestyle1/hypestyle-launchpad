import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * La condición esencial del pedido de validación: un payload con campos
 * objetivamente inválidos no puede llegar a crear una orden en WooCommerce.
 *
 * Por eso lo que se afirma acá no es solo el código de respuesta: es que
 * `pedidoEnviado` siga en `null` y que no se haya llamado a nada — ni al
 * catálogo, ni a Andreani, ni a Talo, ni al mail de confirmación. Cero efectos,
 * no solo "no se creó el pedido".
 *
 * Y el otro lado de la moneda: en modo `observar` (el default, que es como se
 * despliega) un payload inválido **sí** crea el pedido, igual que hoy, con una
 * meta que dice qué se habría rechazado.
 */
vi.mock('@/lib/products-server', () => ({
  fetchAllProducts: async () => [
    { slug: 'remera-test', price: 40000, originalPrice: undefined, category: 'remeras', weight: 0.3 },
    { slug: 'gift-card', price: 50000, originalPrice: undefined },
  ],
}));
vi.mock('@/lib/promo-3x2-status', () => ({ getPromo3x2Status: async () => ({ promoActive: false }) }));
vi.mock('@/lib/promo-champion-status', () => ({ getPromoChampionStatus: async () => ({ promoActive: false }) }));
vi.mock('@/lib/goal-discount', () => ({ getActiveDiscountStatus: async () => ({ active: false }) }));

let pedidoEnviado: any = null;
let llamadas: string[] = [];

beforeEach(() => {
  pedidoEnviado = null;
  llamadas = [];
  // Se declara el entorno que este archivo necesita en vez de heredarlo:
  // process.env es del worker y otro archivo de test puede haberlo cambiado.
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('CHECKOUT_VALIDACION', 'bloquear');
  vi.stubGlobal('fetch', vi.fn(async (url: any, init?: any) => {
    const u = String(url);
    const method = init?.method || 'GET';
    llamadas.push(`${method} ${u}`);
    if (u.includes('admin-ajax.php')) {
      return { ok: true, json: async () => ({ rates: [{ id: 'andreani_estandar', label: 'Andreani (estándar)', cost: 8331 }] }) };
    }
    if (u.includes('/wc/v3/coupons')) return { ok: true, json: async () => [] };
    if (u.includes('/wc/v3/products?slug=')) {
      return { ok: true, json: async () => [{ id: 10, type: 'simple', stock_status: 'instock', tags: [] }] };
    }
    if (u.endsWith('/wc/v3/orders') && method === 'POST') {
      pedidoEnviado = JSON.parse(init.body);
      return { ok: true, json: async () => ({ id: 999, number: '999', order_key: 'wc_order_x', total: '48331' }) };
    }
    return { ok: true, json: async () => ({}), text: async () => '' };
  }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const CUSTOMER_OK = {
  email: 'a@b.com', nombre: 'Ana', apellido: 'Pérez', dni: '30111222',
  direccion: 'Calle 1', cp: '1425', ciudad: 'CABA', provincia: 'CABA', telefono: '1145678900',
};
const ITEMS = [{ id: 'remera-test', slug: 'remera-test', name: 'Remera', price: 40000, quantity: 1, size: 'M', image: '' }];

function reqNac(body: unknown) {
  return new NextRequest('http://localhost/api/create-order-gocuotas', { method: 'POST', body: JSON.stringify(body) });
}
function reqIntl(body: unknown) {
  return new NextRequest('http://localhost/api/create-order-intl', { method: 'POST', body: JSON.stringify(body) });
}
const cuerpoNac = (extra: Record<string, unknown> = {}) => ({
  items: ITEMS, customer: CUSTOMER_OK, shipping: 8331, paymentMethod: 'tarjeta',
  shippingMethodId: 'andreani_estandar', ...extra,
});
const cuerpoIntl = (extra: Record<string, unknown> = {}) => ({
  items: ITEMS,
  customer: { ...CUSTOMER_OK, pais: 'US', provincia: 'NY', ciudad: 'New York', cp: '10001', telefono: '+1 305 555 0123', dni: '' },
  paymentMethod: 'paypal', ...extra,
});

/** Nada de la cadena de creación se tocó. */
function sinEfectos() {
  expect(pedidoEnviado).toBeNull();
  expect(llamadas.filter((l) => /wc\/v3\/orders/.test(l))).toEqual([]);
  expect(llamadas.filter((l) => /products\?slug=/.test(l))).toEqual([]);
  expect(llamadas.filter((l) => /admin-ajax/.test(l))).toEqual([]);
  expect(llamadas.filter((l) => /talo-payment-data/.test(l))).toEqual([]);
  expect(llamadas.filter((l) => /send-confirmation/.test(l))).toEqual([]);
  expect(llamadas.filter((l) => /wc\/v3\/coupons/.test(l))).toEqual([]);
  // Lo más fuerte: no hubo ninguna llamada de red en absoluto.
  expect(llamadas).toEqual([]);
}

describe('POST /api/create-order-gocuotas — bloqueo de datos imposibles', () => {
  const invalidos: [string, Record<string, unknown>, string[]][] = [
    ['email vacío', { email: '' }, ['email']],
    ['email sin forma de email', { email: 'asdf' }, ['email']],
    ['nombre vacío', { nombre: '' }, ['nombre']],
    ['nombre sin ninguna letra', { nombre: '12345' }, ['nombre']],
    ['apellido vacío', { apellido: '   ' }, ['apellido']],
    ['teléfono de 5 dígitos', { telefono: '12345' }, ['telefono']],
    ['teléfono vacío', { telefono: '' }, ['telefono']],
    ['CP que no se puede leer', { cp: 'abcd' }, ['cp']],
    ['varios a la vez', { email: 'asdf', nombre: '', telefono: '1' }, ['email', 'nombre', 'telefono']],
  ];

  for (const [caso, parche, campos] of invalidos) {
    it(`${caso} → 422, sin crear el pedido y sin ningún efecto`, async () => {
      const { POST } = await import('@/app/api/create-order-gocuotas/route');
      const res = await POST(reqNac(cuerpoNac({ customer: { ...CUSTOMER_OK, ...parche } })));
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.codigo).toBe('datos_invalidos');
      expect(Object.keys(body.errores).sort()).toEqual([...campos].sort());
      sinEfectos();
    });
  }

  it('el cuerpo del 422 no devuelve ningún dato recibido', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const res = await POST(reqNac(cuerpoNac({ customer: { ...CUSTOMER_OK, email: 'basura-xyz', telefono: '00001' } })));
    const texto = JSON.stringify(await res.json());
    expect(texto).not.toContain('basura-xyz');
    expect(texto).not.toContain('00001');
    expect(texto).not.toContain(CUSTOMER_OK.dni);
  });

  it('un payload inválido repetido devuelve el mismo 422: nada que deduplicar', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const cuerpo = cuerpoNac({ customer: { ...CUSTOMER_OK, telefono: '1' } });
    const a = await POST(reqNac(cuerpo));
    const b = await POST(reqNac(cuerpo));
    expect([a.status, b.status]).toEqual([422, 422]);
    expect(await a.json()).toEqual(await b.json());
    sinEfectos();
  });
});

describe('POST /api/create-order-gocuotas — payloads deformes nunca dan 500', () => {
  const deformes: [string, unknown][] = [
    ['sin customer', { items: ITEMS, paymentMethod: 'tarjeta' }],
    ['customer: null', { items: ITEMS, customer: null, paymentMethod: 'tarjeta' }],
    ['customer: "texto"', { items: ITEMS, customer: 'texto', paymentMethod: 'tarjeta' }],
    ['customer: []', { items: ITEMS, customer: [], paymentMethod: 'tarjeta' }],
    ['nombre: ["a"]', { items: ITEMS, customer: { ...CUSTOMER_OK, nombre: ['a'] }, paymentMethod: 'tarjeta' }],
    ['telefono como número corto', { items: ITEMS, customer: { ...CUSTOMER_OK, telefono: 12345 }, paymentMethod: 'tarjeta' }],
    ['campos anidados', { items: ITEMS, customer: { ...CUSTOMER_OK, email: { a: 1 }, nombre: { b: 2 } }, paymentMethod: 'tarjeta' }],
    ['el body entero es null', null],
    ['el body entero es un número', 42],
    ['el body entero es una cadena', 'hola'],
    ['el body entero es un array', [1, 2]],
  ];

  for (const [caso, cuerpo] of deformes) {
    it(`${caso} → 422`, async () => {
      const { POST } = await import('@/app/api/create-order-gocuotas/route');
      const res = await POST(reqNac(cuerpo));
      expect(res.status).toBe(422);
      sinEfectos();
    });
  }

  it('un customer ausente devuelve 422 también en modo observar, en vez del 500 de hoy', async () => {
    vi.stubEnv('CHECKOUT_VALIDACION', 'observar');
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const res = await POST(reqNac({ items: ITEMS, customer: null, paymentMethod: 'tarjeta' }));
    expect(res.status).toBe(422);
    sinEfectos();
  });
});

describe('POST /api/create-order-gocuotas — modo observar, el default del despliegue', () => {
  beforeEach(() => { vi.stubEnv('CHECKOUT_VALIDACION', 'observar'); });

  it('un payload inválido crea el pedido igual y deja la marca de qué se habría rechazado', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const res = await POST(reqNac(cuerpoNac({ customer: { ...CUSTOMER_OK, telefono: '12345' } })));
    expect(res.status).toBe(200);
    expect(pedidoEnviado).not.toBeNull();
    const meta = pedidoEnviado.meta_data.find((m: any) => m.key === '_hs_validacion');
    expect(meta.value).toContain('telefono_corto');
    // La marca no lleva el valor del campo.
    expect(JSON.stringify(pedidoEnviado.meta_data)).not.toContain('12345');
  });

  it('sin la variable de entorno también observa: no bloquea por default', async () => {
    vi.stubEnv('CHECKOUT_VALIDACION', '');
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const res = await POST(reqNac(cuerpoNac({ customer: { ...CUSTOMER_OK, email: 'asdf' } })));
    expect(res.status).toBe(200);
    expect(pedidoEnviado).not.toBeNull();
  });

  it('un pedido válido sale exactamente como hoy: sin marca de validación', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const res = await POST(reqNac(cuerpoNac()));
    expect(res.status).toBe(200);
    expect(pedidoEnviado.meta_data.find((m: any) => m.key === '_hs_validacion')).toBeUndefined();
    // Y el teléfono y el nombre viajan tal como los escribió la persona: la
    // normalización es solo para medir, no reescribe el pedido.
    expect(pedidoEnviado.billing.phone).toBe('1145678900');
    expect(pedidoEnviado.billing.first_name).toBe('Ana');
    expect(pedidoEnviado.billing.email).toBe('a@b.com');
  });

  it('el teléfono con 15 y código de área de 4 dígitos no se reescribe en el pedido', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    await POST(reqNac(cuerpoNac({ customer: { ...CUSTOMER_OK, telefono: '03442 15 123456' } })));
    expect(pedidoEnviado.billing.phone).toBe('03442 15 123456');
    expect(pedidoEnviado.meta_data.find((m: any) => m.key === '_hs_validacion')).toBeUndefined();
  });
});

describe('POST /api/create-order-gocuotas — no se exige lo que el formulario no pide', () => {
  it('carrito de solo gift cards sin dirección, DNI ni CP: pasa', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const res = await POST(reqNac({
      items: [{ id: 'gift-card', slug: 'gift-card', name: 'Gift Card', price: 50000, quantity: 1, size: '', image: '' }],
      customer: { email: 'a@b.com', nombre: 'Ana', apellido: 'Pérez', dni: '', direccion: '', cp: '', ciudad: '', provincia: '', telefono: '1145678900' },
      shipping: 0, paymentMethod: 'tarjeta',
    }));
    expect(res.status).not.toBe(422);
  });

  it('retiro en sucursal sin dirección: pasa', async () => {
    const { POST } = await import('@/app/api/create-order-gocuotas/route');
    const res = await POST(reqNac(cuerpoNac({
      customer: { ...CUSTOMER_OK, direccion: '', ciudad: '' },
      shippingMethodId: 'andreani_sucursal',
      shippingBranchCode: 'ABC123',
    })));
    expect(res.status).not.toBe(422);
  });
});

describe('POST /api/create-order-intl — las reglas argentinas no se aplican', () => {
  it('un pedido internacional sin DNI y con ZIP con letras pasa', async () => {
    const { POST } = await import('@/app/api/create-order-intl/route');
    const res = await POST(reqIntl(cuerpoIntl({
      customer: { ...CUSTOMER_OK, pais: 'GB', provincia: 'London', ciudad: 'London', cp: 'SW1A 1AA', dni: '', telefono: '+44 20 7946 0958' },
    })));
    expect(res.status).not.toBe(422);
  });

  it('un teléfono de 7 dígitos pasa: el mínimo es el global, no el argentino', async () => {
    const { POST } = await import('@/app/api/create-order-intl/route');
    const res = await POST(reqIntl(cuerpoIntl({
      customer: { ...CUSTOMER_OK, pais: 'US', cp: '10001', dni: '', telefono: '5550123' },
    })));
    expect(res.status).not.toBe(422);
  });

  it('un email sin forma de email sí bloquea, y sin ningún efecto', async () => {
    const { POST } = await import('@/app/api/create-order-intl/route');
    const res = await POST(reqIntl(cuerpoIntl({ customer: { ...CUSTOMER_OK, pais: 'US', email: 'asdf', dni: '' } })));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(Object.keys(body.errores)).toEqual(['email']);
    sinEfectos();
  });

  it('customer: null → 422, no 500', async () => {
    const { POST } = await import('@/app/api/create-order-intl/route');
    const res = await POST(reqIntl({ items: ITEMS, customer: null, paymentMethod: 'paypal' }));
    expect(res.status).toBe(422);
    sinEfectos();
  });
});
