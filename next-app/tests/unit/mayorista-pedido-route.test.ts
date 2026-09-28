import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { ResolvedProduct } from '@/lib/mayorista-stock';

// /api/mayorista/pedido no puede confiar en el precio que manda el navegador.
// Acá se le pega a la ruta real con Woo simulado y se mira qué orden crea.

const stock = { status: 'publish', stockStatus: 'instock', manageStock: true, stockQuantity: 20 };
const hoodie: ResolvedProduct = {
  product_id: 2033, stock, regularPrice: null,
  variations: [{ id: 2058, options: ['m'], stock, regularPrice: 96000 }, { id: 2059, options: ['l'], stock, regularPrice: 96000 }],
};
const cap: ResolvedProduct = { product_id: 924, stock, regularPrice: 43000, variations: [] };
const catalog = new Map<string, ResolvedProduct | null>([['faith-hoodie', hoodie], ['camo-cap', cap]]);
// Últimos pedidos del cliente en Woo (freno al pedido duplicado).
let recentOrders: any[] = [];
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
vi.mock('@/lib/mayorista-settings', () => ({
  getGlobalMinOrder: vi.fn(async () => 0),
  customerMinOrderOverride: vi.fn(() => null),
}));
vi.mock('@/lib/mayorista-stock', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/mayorista-stock')>();
  return {
    ...real,
    wcAuth: () => 'Basic test',
    wcGet: vi.fn(async (path: string) => {
      if (path.startsWith('customers/19')) return { email: 'mask@test.com', meta_data: [] };
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
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
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
    vi.stubGlobal('fetch', vi.fn(async (url: string) => String(url).includes('/wc/v3/orders') ? new Response('timeout', { status: 504 }) : new Response('{}', { status: 200 })));
    const r = await post({ items: [hoodieL(48000)], shipping });
    expect(r.status).toBe(502);
    expect(r.data.maybeCreated).toBe(true);
  });
});
