import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import fixture from '../fixtures/private-stock-sale.json';
import type { ResolvedProduct } from '@/lib/mayorista-stock';

// /api/mayorista/disponibilidad es lo que el carrito consulta al hidratar y
// al cargar un borrador. Además del stock y los precios vigentes devuelve el
// mínimo que va a validar el pedido para esas líneas, con la misma regla
// (override > campaña > general), así la barra y el botón Continuar no
// contradicen al servidor.

const stock = { status: 'publish', stockStatus: 'instock', manageStock: true, stockQuantity: 20 };
const catalog = new Map<string, ResolvedProduct | null>([
  ['camo-cap', { product_id: 924, stock, regularPrice: 43000, variations: [] }],
  // Find Jesus está en la campaña del fixture (20%).
  ['find-jesus', { product_id: 713, stock: { ...stock, manageStock: false, stockQuantity: null }, regularPrice: null, variations: [{ id: 714, options: ['m'], stock, regularPrice: 67000 }] }],
]);

let customerMeta: { key: string; value: string }[] = [];
let campaignsResponse: () => Promise<any[]> = async () => [];
// Mínimo general: simulado en la red (lib/mayorista-settings se usa real).
let settingsResponse: () => Response = () => new Response(JSON.stringify({ minOrder: 600000 }), { status: 200 });
const settingsCalls: string[] = [];

vi.mock('@/lib/mayorista-auth', () => ({ MAYORISTA_COOKIE: 'hype_mayorista_session', verifySessionToken: vi.fn(async (t?: string) => (t === 'ok' ? 19 : null)) }));
vi.mock('@/lib/mayorista-drop-server', () => ({ mayoristaDropTag: vi.fn(async () => null) }));
vi.mock('@/lib/wholesale-campaigns-store', () => ({ readCampaigns: vi.fn(() => campaignsResponse()) }));
vi.mock('@/lib/mayorista-stock', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/mayorista-stock')>();
  return {
    ...real,
    wcGet: vi.fn(async (path: string) => {
      if (path.startsWith('customers/19')) return { meta_data: customerMeta };
      throw new Error('wcGet inesperado: ' + path);
    }),
    resolveProducts: vi.fn(async (slugs: string[]) => new Map(slugs.map(s => [s, catalog.get(s) ?? null]))),
  };
});

vi.setConfig({ testTimeout: 20000 });

beforeEach(() => {
  customerMeta = [];
  campaignsResponse = async () => [];
  settingsResponse = () => new Response(JSON.stringify({ minOrder: 600000 }), { status: 200 });
  settingsCalls.length = 0;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (String(url).includes('/hypestyle/v1/mayorista-settings')) { settingsCalls.push(String(url)); return settingsResponse(); }
    throw new Error('fetch inesperado: ' + url);
  }));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

async function post(items: unknown[], cookie = 'ok') {
  const { POST } = await import('@/app/api/mayorista/disponibilidad/route');
  const req = new NextRequest('http://localhost/api/mayorista/disponibilidad', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: `hype_mayorista_session=${cookie}` },
    body: JSON.stringify({ items }),
  });
  const res = await POST(req);
  return { status: res.status, data: await res.json() };
}

const cap = { slug: 'camo-cap', name: 'Camo Cap', size: 'Única', quantity: 2 };
const jesus = { slug: 'find-jesus', name: 'FIND JESUS', size: 'M', quantity: 1 };

describe('POST /api/mayorista/disponibilidad — mínimo efectivo', () => {
  it('sin sesión: 401', async () => {
    expect((await post([cap], 'nope')).status).toBe(401);
  });

  it('sin override ni campaña: el general de WordPress', async () => {
    const r = await post([cap]);
    expect(r.status).toBe(200);
    expect(r.data.minOrder).toBe(600000);
    expect(r.data.prices[0]).toMatchObject({ slug: 'camo-cap', unitPrice: 21500 });
  });

  it('override del cliente: manda y no se consulta el general', async () => {
    customerMeta = [{ key: 'mayorista_min_order', value: '250000' }];
    const r = await post([cap]);
    expect(r.data.minOrder).toBe(250000);
    expect(settingsCalls).toHaveLength(0);
  });

  it('campaña vigente con mínimo propio y un producto de la campaña en el carrito: rige el de la campaña', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-28T15:00:00-03:00'));
    campaignsResponse = async () => [{ ...fixture.campaign, minOrder: 100000 }];
    const r = await post([jesus, cap]);
    vi.useRealTimers();
    expect(r.data.minOrder).toBe(100000);
    expect(r.data.prices.find((p: any) => p.slug === 'find-jesus').campaign).toBeTruthy();
  });

  it('la misma campaña sin productos suyos en el carrito: rige el general', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-28T15:00:00-03:00'));
    campaignsResponse = async () => [{ ...fixture.campaign, minOrder: 100000 }];
    const r = await post([cap]);
    vi.useRealTimers();
    expect(r.data.minOrder).toBe(600000);
  });

  it('WordPress no responde el mínimo: minOrder null (el carrito no deja continuar), el resto sigue', async () => {
    settingsResponse = () => new Response('error', { status: 503 });
    const r = await post([cap]);
    expect(r.status).toBe(200);
    expect(r.data.minOrder).toBeNull();
    expect(r.data.unavailable).toEqual([]);
    expect(r.data.prices).toHaveLength(1);
  });

  it('si no se pudo leer el cliente, se usa el general (el pedido vuelve a mirar el override)', async () => {
    const { wcGet } = await import('@/lib/mayorista-stock');
    (wcGet as any).mockRejectedValueOnce(new Error('WC 500'));
    const r = await post([cap]);
    expect(r.data.minOrder).toBe(600000);
  });
});
