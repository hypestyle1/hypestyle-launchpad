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
      throw new Error('wcGet inesperado: ' + path);
    }),
    resolveProducts: vi.fn(async (slugs: string[]) => new Map(slugs.map(s => [s, catalog.get(s) ?? null]))),
  };
});

const wcOrderPosts: any[] = [];
beforeEach(() => {
  wcOrderPosts.length = 0;
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
