import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Los listados (categorías y colecciones) traen sus cards en el HTML del
 * servidor para que Google vea los links a las fichas. Lo que se manda tiene
 * que ser lo mismo que después pinta el navegador con /api/products.
 */
const catalogo = vi.fn();
vi.mock('@/lib/products-server', () => ({ fetchAllProducts: () => catalogo() }));

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

  it('si WordPress falla devuelve [] (la grilla la carga el cliente, como antes)', async () => {
    catalogo.mockRejectedValue(new Error('timeout'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await fetchCatalogForSsr()).toEqual([]);
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
