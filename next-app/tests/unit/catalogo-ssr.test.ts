import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Los listados (categorías y colecciones) traen sus cards en el HTML del
 * servidor para que Google vea los links a las fichas. Lo que se manda tiene
 * que ser lo mismo que después pinta el navegador con /api/products.
 */
const catalogo = vi.fn();
vi.mock('@/lib/products-server', () => ({ fetchAllProductsStrict: () => catalogo() }));

const { fetchCatalogForSsr, initialProductsFor, initialProductsBySlugs, initialProductsByTag, SLUGS_INTERNOS } =
  await import('@/lib/catalog');
const { getCategoryConfig, productsForCategory } = await import('@/lib/category-config');

const p = (slug: string, category: string, tags: string[] = []) =>
  ({ slug, name: slug, category, tags, price: 1, sizes: [], stock: {}, images: [], image: '', href: `/producto/${slug}`, id: slug });

beforeEach(() => {
  catalogo.mockReset();
  catalogo.mockResolvedValue([
    p('remera-a', 'Tee', ['new-in']),
    p('remera-b', 'Remera', ['best-seller']),
    p('hoodie-a', 'Hoodie'),
    p('gift-card', 'Gift card'),
    p('par-de-medias-hype', 'Accesorio'),
    p('sleeveless-ranglan', 'Sleeveless'),
  ]);
});

describe('fetchCatalogForSsr', () => {
  it('deja afuera los mismos productos internos que /api/products', async () => {
    const slugs = (await fetchCatalogForSsr()).map(x => x.slug);
    for (const interno of SLUGS_INTERNOS) expect(slugs).not.toContain(interno);
    expect(slugs).toEqual(['remera-a', 'remera-b', 'hoodie-a']);
  });

  it('en runtime, si WordPress falla, el error sube: ISR conserva la última versión buena', async () => {
    catalogo.mockRejectedValue(new Error('HTTP 503'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(fetchCatalogForSsr()).rejects.toThrow('HTTP 503');
    expect(log.mock.calls[0][0]).toContain('se conserva la última versión');
  });

  it('en el build, si WordPress falla, devuelve [] para no tirar el deploy', async () => {
    const antes = process.env.NEXT_PHASE;
    process.env.NEXT_PHASE = 'phase-production-build';
    try {
      catalogo.mockRejectedValue(new Error('timeout'));
      vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(await fetchCatalogForSsr()).toEqual([]);
    } finally {
      if (antes === undefined) delete process.env.NEXT_PHASE; else process.env.NEXT_PHASE = antes;
    }
  });

  it('un catálogo vacío de verdad (WP responde OK sin productos) es []', async () => {
    catalogo.mockResolvedValue([]);
    expect(await fetchCatalogForSsr()).toEqual([]);
  });

  it('se recupera solo: la siguiente regeneración con WP sano trae el catálogo', async () => {
    catalogo.mockRejectedValueOnce(new Error('timeout'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(fetchCatalogForSsr()).rejects.toThrow();
    expect((await fetchCatalogForSsr()).length).toBe(3);
  });
});

describe('subconjunto por página', () => {
  it('/tees: el mismo filtro que aplica CategoriaPage en el cliente', async () => {
    const config = getCategoryConfig('/tees/')!;
    const server = await initialProductsFor(config);
    const cliente = productsForCategory(await fetchCatalogForSsr(), config);
    expect(server.map(x => x.slug)).toEqual(cliente.map(x => x.slug));
    expect(server.every(x => config.categories.includes(x.category))).toBe(true);
  });

  it('colecciones por slug y por tag', async () => {
    expect((await initialProductsBySlugs(['hoodie-a', 'no-existe'])).map(x => x.slug)).toEqual(['hoodie-a']);
    expect((await initialProductsByTag('new-in')).map(x => x.slug)).toEqual(['remera-a']);
    expect(await initialProductsBySlugs(['gift-card'])).toEqual([]);
  });
});
