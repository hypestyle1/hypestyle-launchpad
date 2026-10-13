import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { ResolvedProduct } from '@/lib/mayorista-stock';
import { rateLimitReset } from '@/lib/rate-limit';

// /api/mayorista/pedido no puede confiar en el precio que manda el navegador.
// Acá se le pega a la ruta real con Woo simulado y se mira qué orden crea.

const stock = { status: 'publish', stockStatus: 'instock', manageStock: true, stockQuantity: 20 };
const hoodie: ResolvedProduct = {
  product_id: 2033, stock, regularPrice: null,
  variations: [{ id: 2058, options: ['m'], stock, regularPrice: 96000 }, { id: 2059, options: ['l'], stock, regularPrice: 96000 }],
};
const cap: ResolvedProduct = { product_id: 924, stock, regularPrice: 43000, variations: [] };
// Sin gestión de stock (caso University tees / Chain Hype del 13/10): se ve, no se pide.
const unmanaged = { status: 'publish', stockStatus: 'instock', manageStock: false, stockQuantity: null };
const universityTee: ResolvedProduct = { product_id: 3662, stock: unmanaged, regularPrice: null, variations: [{ id: 3663, options: ['m'], stock: unmanaged, regularPrice: 39000 }] };
// Tag "proximamente" con stock cargado: tampoco se pide todavía.
const equestrian: ResolvedProduct = { product_id: 3898, stock: { ...stock, comingSoon: true }, regularPrice: null, variations: [{ id: 3899, options: ['m'], stock, regularPrice: 67000 }] };
const catalog = new Map<string, ResolvedProduct | null>([['faith-hoodie', hoodie], ['camo-cap', cap], ['university-tee', universityTee], ['equestrian', equestrian]]);
// Últimos pedidos del cliente en Woo (freno al pedido duplicado).
let recentOrders: any[] = [];
// Metas del cliente en Woo (exclusividad por ciudad).
let customerMeta: { key: string; value: string }[] = [];
const wooOrder = (minutesAgo: number, extra: Record<string, unknown> = {}) => ({
  id: 3324, number: '3324', status: 'on-hold', total: '1018960.00',
  date_created_gmt: new Date(Date.now() - minutesAgo * 60_000).toISOString().slice(0, 19),
  line_items: [{ quantity: 40 }, { quantity: 4 }],
  meta_data: [{ key: '_es_mayorista', value: 'true' }],
  ...extra,
});

vi.mock('@/lib/mayorista-auth', () => ({
  MAYORISTA_COOKIE: 'hype_mayorista_session',
  verifySessionToken: vi.fn(async (t?: string) => (t === 'ok' ? 19 : null)),
}));
// Mínimo general de WordPress (ruta hypestyle/v1/mayorista-settings), simulado
// en la red y no en el módulo: lib/mayorista-settings se usa real. $1 en la
// mayoría de los tests (no es el tema); los de "pedido mínimo" lo cambian.
let settingsResponse: () => Response = () => new Response(JSON.stringify({ minOrder: 1 }), { status: 200 });
const settingsCalls: string[] = [];
vi.mock('@/lib/mayorista-stock', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/mayorista-stock')>();
  return {
    ...real,
    wcAuth: () => 'Basic test',
    wcGet: vi.fn(async (path: string) => {
      if (path.startsWith('customers/19')) return { email: 'mask@test.com', meta_data: customerMeta };
      if (path.startsWith('orders?')) return recentOrders;
      throw new Error('wcGet inesperado: ' + path);
    }),
    resolveProducts: vi.fn(async (slugs: string[]) => new Map(slugs.map(s => [s, catalog.get(s) ?? null]))),
  };
});

// La ruta real importa medio lib/: con la suite entera corriendo en paralelo
// el primer import puede pasar los 5 s por defecto.
vi.setConfig({ testTimeout: 20000 });

const wcOrderPosts: any[] = [];
beforeEach(() => {
  wcOrderPosts.length = 0;
  recentOrders = [];
  customerMeta = [];
  settingsResponse = () => new Response(JSON.stringify({ minOrder: 1 }), { status: 200 });
  settingsCalls.length = 0;
  // El tope de 20 pedidos por cuenta cada 10 min (lib/rate-limit.ts) frenaría la suite entera.
  rateLimitReset();
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (String(url).includes('/hypestyle/v1/mayorista-settings')) { settingsCalls.push(String(url)); return settingsResponse(); }
    if (String(url).includes('/wc/v3/orders')) {
      wcOrderPosts.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ id: 5001, number: '5001' }), { status: 201 });
    }
    // Perfil del cliente y mails: no importan acá.
    return new Response('{}', { status: 200 });
  }));
});

const shipping = {
  first_name: 'Tomás', last_name: 'Carrera', company: 'MASK', address_1: 'Calle 1', city: 'General La Madrid',
  phone: '2286401316', dni: '40000000', envio_metodo: 'via_cargo', envio_destino: 'Sucursal Olavarría',
};

async function post(body: unknown, cookie = 'ok') {
  const { POST } = await import('@/app/api/mayorista/pedido/route');
  const req = new NextRequest('http://localhost/api/mayorista/pedido', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: `hype_mayorista_session=${cookie}` },
    body: JSON.stringify(body),
  });
  const res = await POST(req);
  return { status: res.status, data: await res.json() };
}

const hoodieL = (price: unknown, extra: Record<string, unknown> = {}) => ({ slug: 'faith-hoodie', name: 'FAITH HOODIE', size: 'L', quantity: 2, price, ...extra });

describe('POST /api/mayorista/pedido — precio calculado en el servidor', () => {
  it('sin sesión: 401 y no crea orden', async () => {
    const r = await post({ items: [hoodieL(48000)], shipping }, 'nope');
    expect(r.status).toBe(401);
    expect(wcOrderPosts).toHaveLength(0);
  });

  it('precio vigente en el carrito: crea la orden a $48.000 la unidad', async () => {
    const r = await post({ items: [hoodieL(48000)], shipping });
    expect(r.status).toBe(200);
    expect(r.data).toMatchObject({ wcOrderNumber: '5001', total: 96000 });
    expect(wcOrderPosts).toHaveLength(1);
    expect(wcOrderPosts[0].line_items).toEqual([expect.objectContaining({ product_id: 2033, variation_id: 2059, quantity: 2, subtotal: '96000', total: '96000' })]);
  });

  for (const [caso, price] of [['precio $1', 1], ['precio viejo de un carrito anterior', 44500], ['precio mayor al vigente', 57500]] as const) {
    it(`${caso}: 409 PRICE_CHANGED con el total vigente y sin crear orden`, async () => {
      const r = await post({ items: [hoodieL(price)], shipping });
      expect(r.status).toBe(409);
      expect(r.data.code).toBe('PRICE_CHANGED');
      expect(r.data.total).toBe(96000);
      expect(r.data.changes).toEqual([expect.objectContaining({ slug: 'faith-hoodie', before: price, after: 48000 })]);
      expect(wcOrderPosts).toHaveLength(0);
    });

    it(`${caso} + confirmPrices: crea la orden, pero a $48.000 (no al precio enviado)`, async () => {
      const r = await post({ items: [hoodieL(price)], shipping, confirmPrices: true });
      expect(r.status).toBe(200);
      expect(r.data.total).toBe(96000);
      expect(wcOrderPosts[0].line_items[0]).toMatchObject({ subtotal: '96000', total: '96000' });
      expect(r.data.items[0].price).toBe(48000);
    });
  }

  it('producto inexistente: 409 y no crea orden (aunque el precio "coincida")', async () => {
    const r = await post({ items: [{ slug: 'no-existe', name: 'Fantasma', size: 'M', quantity: 1, price: 10000 }], shipping, confirmPrices: true });
    expect(r.status).toBe(409);
    expect(r.data.unavailable).toEqual([expect.objectContaining({ slug: 'no-existe', reason: 'not-published' })]);
    expect(wcOrderPosts).toHaveLength(0);
  });

  it('variation_id de otro producto en el request: se ignora, la orden lleva la variación resuelta por talle', async () => {
    const r = await post({ items: [hoodieL(48000, { variation_id: 924, variationId: 924, product_id: 924 })], shipping });
    expect(r.status).toBe(200);
    expect(wcOrderPosts[0].line_items[0]).toMatchObject({ product_id: 2033, variation_id: 2059, total: '96000' });
  });

  it('variación sin gestión de stock: 409 "unconfirmed" y no crea orden (antes entraba como ilimitado)', async () => {
    const r = await post({ items: [{ slug: 'university-tee', name: 'UNIVERSITY TEE', size: 'M', quantity: 40, price: 19500 }], shipping, confirmPrices: true });
    expect(r.status).toBe(409);
    expect(r.data.unavailable).toEqual([expect.objectContaining({ slug: 'university-tee', reason: 'unconfirmed' })]);
    expect(r.data.message).toContain('no tiene stock confirmado');
    expect(wcOrderPosts).toHaveLength(0);
  });

  it('producto "proximamente": 409 "coming-soon" aunque tenga stock', async () => {
    const r = await post({ items: [{ slug: 'equestrian', name: 'EQUESTRIAN', size: 'M', quantity: 1, price: 33500 }], shipping, confirmPrices: true });
    expect(r.status).toBe(409);
    expect(r.data.unavailable).toEqual([expect.objectContaining({ slug: 'equestrian', reason: 'coming-soon' })]);
    expect(wcOrderPosts).toHaveLength(0);
  });

  it('un producto sin regular_price en Woo no se puede pedir', async () => {
    catalog.set('sin-precio', { product_id: 1, stock, regularPrice: null, variations: [] });
    const r = await post({ items: [{ slug: 'sin-precio', name: 'Sin precio', size: 'Única', quantity: 1, price: 5000 }], shipping, confirmPrices: true });
    expect(r.status).toBe(409);
    expect(r.data.unpriced).toHaveLength(1);
    expect(wcOrderPosts).toHaveLength(0);
  });

  it('el total de la orden es la suma a precio de servidor, mezcla de líneas', async () => {
    const r = await post({ items: [hoodieL(1), { slug: 'camo-cap', name: 'Camo Cap', size: 'Única', quantity: 3, price: 999999 }], shipping, confirmPrices: true });
    expect(r.status).toBe(200);
    expect(r.data.total).toBe(96000 + 21500 * 3);
    expect(wcOrderPosts[0].line_items.map((l: any) => l.total)).toEqual(['96000', '64500']);
  });
});

// 28/09/2026: AKASHA confirmó, vio un error (la orden #3324 se había creado
// igual), recargó y confirmó de nuevo → #3325 duplicada.
describe('POST /api/mayorista/pedido — pedido duplicado', () => {
  it('con un pedido de hace 1 minuto: 409 RECENT_ORDER con sus datos y sin crear orden', async () => {
    recentOrders = [wooOrder(1)];
    const r = await post({ items: [hoodieL(48000)], shipping });
    expect(r.status).toBe(409);
    expect(r.data.code).toBe('RECENT_ORDER');
    expect(r.data.order).toMatchObject({ number: '3324', total: 1018960, units: 44, status: 'on-hold' });
    expect(wcOrderPosts).toHaveLength(0);
  });

  it('una orden todavía en pending (Woo la está creando) también frena', async () => {
    recentOrders = [wooOrder(0.5, { status: 'pending' })];
    const r = await post({ items: [hoodieL(48000)], shipping });
    expect(r.status).toBe(409);
    expect(wcOrderPosts).toHaveLength(0);
  });

  it('confirmDuplicate: crea la orden igual', async () => {
    recentOrders = [wooOrder(1)];
    const r = await post({ items: [hoodieL(48000)], shipping, confirmDuplicate: true });
    expect(r.status).toBe(200);
    expect(wcOrderPosts).toHaveLength(1);
  });

  for (const [caso, order] of [
    ['de hace 11 minutos', () => wooOrder(11)],
    ['cancelado', () => wooOrder(1, { status: 'cancelled' })],
    ['minorista', () => wooOrder(1, { meta_data: [] })],
  ] as const) {
    it(`un pedido ${caso} no frena`, async () => {
      recentOrders = [order()];
      const r = await post({ items: [hoodieL(48000)], shipping });
      expect(r.status).toBe(200);
      expect(wcOrderPosts).toHaveLength(1);
    });
  }

  it('el cambio de precio se avisa antes que el duplicado', async () => {
    recentOrders = [wooOrder(1)];
    const r = await post({ items: [hoodieL(1)], shipping });
    expect(r.data.code).toBe('PRICE_CHANGED');
  });

  it('GET devuelve el pedido reciente para que el carrito verifique', async () => {
    recentOrders = [wooOrder(2)];
    const { GET } = await import('@/app/api/mayorista/pedido/route');
    const res = await GET(new NextRequest('http://localhost/api/mayorista/pedido', { headers: { cookie: 'hype_mayorista_session=ok' } }));
    expect(res.status).toBe(200);
    const { recent } = await res.json();
    expect(recent.number).toBe('3324');
    // La fecha de Woo viene sin milisegundos.
    expect(recent.ageSeconds).toBeGreaterThanOrEqual(120);
    expect(recent.ageSeconds).toBeLessThanOrEqual(121);
  });

  it('si Woo responde 5xx al crear, la respuesta avisa que la orden pudo entrar', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      String(url).includes('/wc/v3/orders') ? new Response('timeout', { status: 504 })
      : String(url).includes('/hypestyle/v1/mayorista-settings') ? settingsResponse()
      : new Response('{}', { status: 200 })));
    const r = await post({ items: [hoodieL(48000)], shipping });
    expect(r.status).toBe(502);
    expect(r.data.maybeCreated).toBe(true);
  });
});

// 13/10/2026: el mínimo vive en WordPress ($600.000 general, override por
// cliente, propio por campaña). Si no se puede leer, no se cae a $500.000 ni
// se deja pasar: se pide reintento, igual que con las campañas.
describe('POST /api/mayorista/pedido — pedido mínimo', () => {
  it('por debajo del mínimo general: 400 con el monto y sin crear orden', async () => {
    settingsResponse = () => new Response(JSON.stringify({ minOrder: 600000 }), { status: 200 });
    const r = await post({ items: [hoodieL(48000)], shipping });
    expect(r.status).toBe(400);
    expect(r.data.message).toContain('600.000');
    expect(wcOrderPosts).toHaveLength(0);
  });

  it('el override del cliente manda sobre el general (y no se consulta WordPress)', async () => {
    settingsResponse = () => new Response(JSON.stringify({ minOrder: 600000 }), { status: 200 });
    customerMeta = [{ key: 'mayorista_min_order', value: '90000' }];
    const r = await post({ items: [hoodieL(48000)], shipping });
    expect(r.status).toBe(200);
    expect(settingsCalls).toHaveLength(0);
  });

  it('WordPress no responde el mínimo: 502 MIN_ORDER_UNAVAILABLE y no crea orden', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    settingsResponse = () => new Response('error', { status: 503 });
    const r = await post({ items: [hoodieL(48000)], shipping });
    expect(r.status).toBe(502);
    expect(r.data.code).toBe('MIN_ORDER_UNAVAILABLE');
    expect(r.data.message).toContain('pedido mínimo');
    expect(wcOrderPosts).toHaveLength(0);
    error.mockRestore();
  });

  it('mínimo inválido en WordPress (0 o vacío) también frena: no se asume "sin mínimo"', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    settingsResponse = () => new Response(JSON.stringify({ minOrder: 0 }), { status: 200 });
    const r = await post({ items: [hoodieL(48000)], shipping });
    expect(r.status).toBe(502);
    expect(wcOrderPosts).toHaveLength(0);
    error.mockRestore();
  });

  it('con override, que WordPress no responda el general no frena el pedido', async () => {
    settingsResponse = () => new Response('error', { status: 503 });
    customerMeta = [{ key: 'mayorista_min_order', value: '90000' }];
    const r = await post({ items: [hoodieL(48000)], shipping });
    expect(r.status).toBe(200);
    expect(wcOrderPosts).toHaveLength(1);
  });
});

describe('POST /api/mayorista/pedido — exclusividad por ciudad', () => {
  it('cuenta bloqueada por la exclusividad de otro local: 403 EXCLUSIVITY_BLOCKED y no crea orden', async () => {
    customerMeta = [{ key: 'mayorista_bloqueo_exclusividad', value: JSON.stringify({ ciudad: 'Córdoba Capital', titular: 'AKASHA RAGS', desde: '2026-10-05' }) }];
    const r = await post({ items: [hoodieL(48000)], shipping });
    expect(r.status).toBe(403);
    expect(r.data.code).toBe('EXCLUSIVITY_BLOCKED');
    expect(r.data.message).toContain('Córdoba Capital');
    expect(r.data.message).toContain('WhatsApp');
    expect(wcOrderPosts).toHaveLength(0);
  });

  it('la cuenta titular de la exclusividad pide normal', async () => {
    customerMeta = [{ key: 'mayorista_exclusividad', value: JSON.stringify({ ciudad: 'Córdoba Capital', desde: '2026-09-28', pedido: 3324 }) }];
    const r = await post({ items: [hoodieL(48000)], shipping });
    expect(r.status).toBe(200);
    expect(wcOrderPosts).toHaveLength(1);
  });

  it('meta de bloqueo vacía (se quitó desde el panel): pide normal', async () => {
    customerMeta = [{ key: 'mayorista_bloqueo_exclusividad', value: '' }];
    const r = await post({ items: [hoodieL(48000)], shipping });
    expect(r.status).toBe(200);
  });
});

// 13/10/2026: dos envíos casi simultáneos del mismo carrito (doble click, dos
// pestañas, POST reintentado por el navegador) pasaban los dos el freno por
// pedido reciente y creaban dos órdenes. El carrito manda una clave por
// carrito (lib/mayorista-idempotency.ts).
describe('POST /api/mayorista/pedido — clave de idempotencia', () => {
  const KEY = '0f3c9a2e-5b7d-4e81-9c6a-1d2b3c4d5e6f';
  const keyed = (id: number, extra: Record<string, unknown> = {}) => wooOrder(0.2, { id, number: String(id), meta_data: [{ key: '_es_mayorista', value: 'true' }, { key: '_mayorista_idempotency_key', value: KEY }], ...extra });

  it('la orden nueva lleva la clave en meta', async () => {
    const r = await post({ items: [hoodieL(48000)], shipping, idempotencyKey: KEY });
    expect(r.status).toBe(200);
    expect(wcOrderPosts[0].meta_data).toContainEqual({ key: '_mayorista_idempotency_key', value: KEY });
  });

  it('clave inválida: se ignora y la orden sale sin meta', async () => {
    const r = await post({ items: [hoodieL(48000)], shipping, idempotencyKey: 'abc' });
    expect(r.status).toBe(200);
    expect(wcOrderPosts[0].meta_data.map((m: any) => m.key)).not.toContain('_mayorista_idempotency_key');
  });

  it('misma clave que una orden viva: devuelve esa orden y no crea otra (aunque confirmDuplicate)', async () => {
    recentOrders = [keyed(7000)];
    const r = await post({ items: [hoodieL(48000)], shipping, idempotencyKey: KEY, confirmDuplicate: true });
    expect(r.status).toBe(200);
    expect(r.data).toMatchObject({ wcOrderNumber: '7000', replayed: true, total: 1018960, creditUsed: 0 });
    expect(wcOrderPosts).toHaveLength(0);
  });

  it('otra clave en el pedido reciente: sigue el freno de siempre (409 RECENT_ORDER)', async () => {
    recentOrders = [wooOrder(1)];
    const r = await post({ items: [hoodieL(48000)], shipping, idempotencyKey: KEY });
    expect(r.status).toBe(409);
    expect(r.data.code).toBe('RECENT_ORDER');
  });

  it('carrera: tras crear aparece otra orden más vieja con la clave → cancela la nuestra y responde con la otra', async () => {
    const cancelled: { url: string; body: any }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('/hypestyle/v1/mayorista-settings')) return settingsResponse();
      const u = String(url);
      if (u.includes('/wc/v3/orders/') && init?.method === 'PUT') { cancelled.push({ url: u, body: JSON.parse(String(init.body)) }); return new Response('{}', { status: 200 }); }
      if (u.includes('/wc/v3/orders') && init?.method === 'POST') {
        wcOrderPosts.push(JSON.parse(String(init.body)));
        // El otro envío ganó la carrera: su orden (4999) ya está cuando volvemos a leer.
        recentOrders = [keyed(5001), keyed(4999)];
        return new Response(JSON.stringify({ id: 5001, number: '5001' }), { status: 201 });
      }
      return new Response('{}', { status: 200 });
    }));
    const r = await post({ items: [hoodieL(48000)], shipping, idempotencyKey: KEY });
    expect(r.status).toBe(200);
    expect(r.data).toMatchObject({ wcOrderNumber: '4999', replayed: true });
    expect(wcOrderPosts).toHaveLength(1);
    expect(cancelled).toHaveLength(1);
    expect(cancelled[0].url).toContain('/wc/v3/orders/5001');
    expect(cancelled[0].body.status).toBe('cancelled');
    expect(cancelled[0].body.customer_note).toContain('4999');
  });

  it('carrera donde ganamos nosotros: la orden queda y no se cancela nada', async () => {
    const puts: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('/hypestyle/v1/mayorista-settings')) return settingsResponse();
      const u = String(url);
      if (u.includes('/wc/v3/orders/') && init?.method === 'PUT') { puts.push(u); return new Response('{}', { status: 200 }); }
      if (u.includes('/wc/v3/orders') && init?.method === 'POST') {
        wcOrderPosts.push(JSON.parse(String(init.body)));
        recentOrders = [keyed(5002), keyed(5001)];
        return new Response(JSON.stringify({ id: 5001, number: '5001' }), { status: 201 });
      }
      return new Response('{}', { status: 200 });
    }));
    const r = await post({ items: [hoodieL(48000)], shipping, idempotencyKey: KEY });
    expect(r.status).toBe(200);
    expect(r.data.wcOrderNumber).toBe('5001');
    expect(r.data.replayed).toBeUndefined();
    expect(puts).toHaveLength(0);
  });
});

// 13/10/2026: límite de líneas por pedido y saldo a favor atómico.
describe('POST /api/mayorista/pedido — tope de líneas y saldo a favor', () => {
  it('más de 200 líneas: 400 sin tocar Woo', async () => {
    const items = Array.from({ length: 201 }, () => hoodieL(48000));
    const r = await post({ items, shipping });
    expect(r.status).toBe(400);
    expect(r.data.message).toContain('200');
    expect(wcOrderPosts).toHaveLength(0);
  });

  it('con saldo a favor: se descuenta ANTES de crear la orden y después se anota el número', async () => {
    customerMeta = [{ key: 'mayorista_credito', value: JSON.stringify({ saldo: 30000, movimientos: [] }) }];
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('/hypestyle/v1/mayorista-settings')) return settingsResponse();
      const u = String(url);
      if (u.includes('/wc/v3/customers/19') && init?.method === 'PUT') {
        const body = JSON.parse(String(init.body));
        const credit = body.meta_data?.find((m: any) => m.key === 'mayorista_credito');
        calls.push(credit ? `credit:${JSON.parse(credit.value).saldo}:${JSON.parse(credit.value).movimientos.at(-1)?.orden ?? '-'}` : 'perfil');
        return new Response('{}', { status: 200 });
      }
      if (u.includes('/wc/v3/orders') && init?.method === 'POST') { calls.push('order'); wcOrderPosts.push(JSON.parse(String(init.body))); return new Response(JSON.stringify({ id: 5001, number: '5001' }), { status: 201 }); }
      return new Response('{}', { status: 200 });
    }));
    const r = await post({ items: [hoodieL(48000)], shipping });
    expect(r.status).toBe(200);
    // Pedido de $96.000 con $30.000 de saldo: se usa todo el saldo (queda 0).
    expect(r.data.creditUsed).toBe(30000);
    expect(calls.indexOf('credit:0:-')).toBeLessThan(calls.indexOf('order'));
    expect(calls).toContain('credit:0:5001');
  });

  it('si Woo rechaza la orden con 4xx, el saldo vuelve', async () => {
    customerMeta = [{ key: 'mayorista_credito', value: JSON.stringify({ saldo: 30000, movimientos: [] }) }];
    const credits: number[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('/hypestyle/v1/mayorista-settings')) return settingsResponse();
      const u = String(url);
      if (u.includes('/wc/v3/customers/19') && init?.method === 'PUT') {
        const credit = JSON.parse(String(init.body)).meta_data?.find((m: any) => m.key === 'mayorista_credito');
        if (credit) credits.push(JSON.parse(credit.value).saldo);
        return new Response('{}', { status: 200 });
      }
      if (u.includes('/wc/v3/orders') && init?.method === 'POST') return new Response('bad', { status: 400 });
      return new Response('{}', { status: 200 });
    }));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await post({ items: [hoodieL(48000)], shipping });
    expect(r.status).toBe(502);
    expect(r.data.maybeCreated).toBeUndefined();
    // Descontado a 0 antes de crear; repuesto a 30.000 cuando Woo rechazó.
    expect(credits).toEqual([0, 30000]);
    error.mockRestore();
  });

  it('si no se pudo reservar el saldo, no se crea la orden', async () => {
    customerMeta = [{ key: 'mayorista_credito', value: JSON.stringify({ saldo: 30000, movimientos: [] }) }];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('/hypestyle/v1/mayorista-settings')) return settingsResponse();
      if (String(url).includes('/wc/v3/customers/19') && init?.method === 'PUT') return new Response('x', { status: 500 });
      if (String(url).includes('/wc/v3/orders')) { wcOrderPosts.push({}); return new Response('{}', { status: 201 }); }
      return new Response('{}', { status: 200 });
    }));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await post({ items: [hoodieL(48000)], shipping });
    expect(r.status).toBe(502);
    expect(r.data.message).toContain('saldo a favor');
    expect(wcOrderPosts).toHaveLength(0);
    error.mockRestore();
  });
});

describe('POST /api/mayorista/pedido — tope de envíos por cuenta', () => {
  it('el envío 21 en 10 minutos devuelve 429 sin tocar Woo', async () => {
    for (let i = 0; i < 20; i++) expect((await post({ items: [hoodieL(48000)], shipping, confirmDuplicate: true })).status).toBe(200);
    const r = await post({ items: [hoodieL(48000)], shipping, confirmDuplicate: true });
    expect(r.status).toBe(429);
    expect(r.data.message).toContain('Demasiados envíos');
    expect(wcOrderPosts).toHaveLength(20);
  });
});
