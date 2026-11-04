import { describe, expect, it, vi } from 'vitest';

// Incidente MySQL 4/11/2026: /api/products es la "consulta de ~400 posts".
// Pasa por unstable_cache (60 s) con un solo intento y no cachea errores.
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), cached: [] as any[] }));
vi.mock('@/lib/fetch-retry', () => ({ fetchWithRetry: mocks.fetch }));
vi.mock('next/cache', () => ({ unstable_cache: (fn: any, key: any, opts: any) => { mocks.cached.push({ key, opts }); return fn; } }));
vi.mock('@/lib/wp-cortacircuitos', () => ({ crearCortacircuitos: () => (fn: any) => fn() }));
const { GET } = await import('@/app/api/products/route');

const pagina = (nodes: any[]) => new Response(JSON.stringify({ data: { products: { nodes, pageInfo: { hasNextPage: false } } } }), { status: 200 });

describe('/api/products', () => {
  it('lee por la caché compartida de 60 s, un solo intento de 25 s y sin la caché por request', async () => {
    mocks.fetch.mockResolvedValueOnce(pagina([{ id: '1', slug: 'remera' }, { id: '2', slug: 'gift-card' }, { id: '1', slug: 'remera' }]));
    const res = await GET();
    expect((await res.json()).products.nodes).toEqual([{ id: '1', slug: 'remera' }]);
    expect(mocks.cached).toContainEqual({ key: ['api-products-nodos-v1'], opts: { revalidate: 60 } });
    const [, init, opts] = mocks.fetch.mock.calls[0];
    expect(init.cache).toBe('no-store');
    expect(opts).toEqual({ retries: 0, timeoutMs: 25_000 });
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=60');
  });
  it('si WordPress falla devuelve error sin caché (la caché compartida conserva lo último bueno)', async () => {
    mocks.fetch.mockResolvedValueOnce(new Response('x', { status: 500 }));
    const res = await GET();
    expect(res.status).toBe(502);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});
