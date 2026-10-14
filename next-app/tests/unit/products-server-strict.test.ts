import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * fetchAllProductsStrict() distingue "WordPress falló" de "no hay
 * productos". fetchAllProducts, el comportamiento de siempre (lo usan el checkout,
 * la home y las alertas de stock).
 */
const respuestas: Array<() => Response> = [];
vi.mock('@/lib/fetch-retry', () => ({
  fetchWithRetry: vi.fn(async () => {
    const r = respuestas.shift();
    if (!r) throw new Error('sin respuesta preparada');
    return r();
  }),
}));

const { fetchAllProducts, fetchAllProductsStrict, CatalogUnavailableError } = await import('@/lib/products-server');

const nodo = (id: string) => ({
  id, name: id, slug: id, price: '$ 1.000', regularPrice: '$ 1.000', stockStatus: 'IN_STOCK',
  image: null, galleryImages: { nodes: [] }, productCategories: { nodes: [] }, productTags: { nodes: [] },
});
const pagina = (ids: string[], hasNextPage = false) => () =>
  new Response(JSON.stringify({ data: { products: { pageInfo: { hasNextPage, endCursor: 'c' }, nodes: ids.map(nodo) } } }), { status: 200 });
const http = (status: number) => () => new Response('error', { status });
const sinDatos = () => () => new Response(JSON.stringify({ errors: [{ message: 'x' }] }), { status: 200 });

beforeEach(() => { respuestas.length = 0; });

describe('fetchAllProductsStrict', () => {
  it('catálogo vacío de verdad: []', async () => {
    respuestas.push(pagina([]));
    expect(await fetchAllProductsStrict()).toEqual([]);
  });

  it('HTTP de error: lanza CatalogUnavailableError', async () => {
    respuestas.push(http(503));
    await expect(fetchAllProductsStrict()).rejects.toBeInstanceOf(CatalogUnavailableError);
  });

  it('GraphQL sin datos: lanza', async () => {
    respuestas.push(sinDatos());
    await expect(fetchAllProductsStrict()).rejects.toThrow('sin products');
  });

  it('paginación cortada a la mitad: lanza en vez de devolver media lista', async () => {
    respuestas.push(pagina(['a', 'b'], true), http(500));
    await expect(fetchAllProductsStrict()).rejects.toThrow('página 2');
  });

  it('timeout (fetchWithRetry agotó los reintentos): el error sube', async () => {
    await expect(fetchAllProductsStrict()).rejects.toThrow();
  });

  it('dos páginas sanas: junta todo', async () => {
    respuestas.push(pagina(['a', 'b'], true), pagina(['c']));
    expect((await fetchAllProductsStrict()).map((p) => p.slug)).toEqual(['a', 'b', 'c']);
  });
});

describe('fetchAllProducts sin strict (checkout, home): sin cambios', () => {
  it('HTTP de error devuelve lo juntado, como siempre', async () => {
    respuestas.push(pagina(['a'], true), http(500));
    expect((await fetchAllProducts()).map((p) => p.slug)).toEqual(['a']);
  });
});
