import { describe, it, expect, vi, beforeEach } from 'vitest';

// Incidente MySQL/Hostinger 4/11/2026: la ficha no debe re-pedir el producto a
// WPGraphQL si el dato del servidor es reciente, pero SÍ si es viejo o no trae
// timestamp. Se capturan las opciones reales de useProduct y se corren contra
// un QueryClient de verdad para probar el comportamiento, no solo la config.
const captured = vi.hoisted(() => ({ opts: [] as any[] }));
const fetchProductDetail = vi.hoisted(() => vi.fn(async () => ({ slug: 'remera', price: 2 })));
vi.mock('react', () => ({ useEffect: () => {}, useRef: (v: any) => ({ current: v }) }));
vi.mock('@tanstack/react-query', async () => {
  const real = await vi.importActual<any>('@tanstack/react-query');
  return { ...real, useQuery: (o: any) => { captured.opts.push(o); return { refetch: vi.fn(), dataUpdatedAt: 0 }; } };
});
vi.mock('@/lib/product-detail', () => ({ fetchProductDetail }));

const { useProduct, PRODUCT_STALE_MS } = await import('@/hooks/useProduct');
const { QueryClient, QueryObserver } = await vi.importActual<any>('@tanstack/react-query');

const initial = { slug: 'remera', price: 1 } as any;

async function montar(updatedAt?: number) {
  captured.opts = [];
  useProduct('remera', initial, updatedAt);
  const { refetchInterval: _ri, ...opts } = captured.opts[0];
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const obs = new QueryObserver(client, opts);
  const unsub = obs.subscribe(() => {});
  await new Promise(r => setTimeout(r, 0));
  const res = obs.getCurrentResult();
  unsub();
  return res;
}

describe('useProduct contra un QueryClient real', () => {
  beforeEach(() => fetchProductDetail.mockClear());

  it('dato del servidor reciente: no consulta WordPress desde el browser', async () => {
    const res = await montar(Date.now() - 60_000);
    expect(fetchProductDetail).not.toHaveBeenCalled();
    expect(res.data).toBe(initial);
  });

  it('dato del servidor más viejo que la ventana: re-pide (precio/stock frescos)', async () => {
    await montar(Date.now() - PRODUCT_STALE_MS - 1_000);
    expect(fetchProductDetail).toHaveBeenCalledTimes(1);
  });

  it('sin timestamp: conserva el comportamiento anterior y re-pide', async () => {
    await montar(undefined);
    expect(fetchProductDetail).toHaveBeenCalledTimes(1);
  });
});

describe('/api/public-reviews: caché de 5 minutos sin cachear caídas', () => {
  beforeEach(() => { vi.resetModules(); vi.unstubAllGlobals(); });

  async function llamar(wp: () => Promise<Response>, qs = 'sort=recent&per_page=1') {
    vi.doMock('next/cache', () => ({ unstable_cache: (fn: any) => fn }));
    const fetchMock = vi.fn(wp);
    vi.stubGlobal('fetch', fetchMock);
    const { GET } = await import('@/app/api/public-reviews/route');
    const res = await GET(new Request(`https://x.test/api/public-reviews?${qs}`) as any);
    return { res, body: await res.json(), fetchMock };
  }

  it('WP ok: devuelve los datos con s-maxage=300', async () => {
    const data = { summary: { average: 4.8, total: 35 }, reviews: [{ id: 'r1' }], pagination: { page: 1, pages: 1, total: 1 } };
    const { res, body, fetchMock } = await llamar(async () => new Response(JSON.stringify(data), { status: 200 }));
    expect(body.reviews).toHaveLength(1);
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=300');
    // parámetros ordenados: misma clave de caché sin importar el orden
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain('per_page=1&sort=recent');
  });

  it('WP caído (500): vacío controlado y SIN caché', async () => {
    const { res, body } = await llamar(async () => new Response('err', { status: 500 }));
    expect(body.reviews).toEqual([]);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('timeout/red caída: vacío controlado y SIN caché', async () => {
    const { res, body } = await llamar(async () => { throw new Error('ECONNRESET'); });
    expect(body.reviews).toEqual([]);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('endpoint inexistente (404): respuesta definitiva, se cachea como vacío', async () => {
    const { res, body } = await llamar(async () => new Response('{}', { status: 404 }));
    expect(body.reviews).toEqual([]);
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=300');
  });
});
