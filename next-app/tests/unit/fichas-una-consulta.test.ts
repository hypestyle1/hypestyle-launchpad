import { describe, it, expect, vi, beforeEach } from 'vitest';
import { crearLimiteConcurrencia, crearProteccionFichas, WordPressEnPausaError } from '@/lib/wp-cortacircuitos';

// 9/11/2026: un crawler recorriendo las ~300 fichas hacía que cada una
// refrescara su caché a la vez, con 2 consultas y 1 reintento cada una:
// 6/11 00:21 ART, 1.354 POST /graphql en 4 min (el guard de Hostinger rechazó
// todo lo que pasó de 15 conexiones/s). Estos tests fijan el recorte.

const fetchWithRetry = vi.hoisted(() => vi.fn());
vi.mock('@/lib/fetch-retry', () => ({ fetchWithRetry }));

const esperar = () => new Promise(r => setTimeout(r, 0));

describe('límite global de lecturas simultáneas', () => {
  it('nunca hay más de N lecturas en curso y las demás esperan en orden', async () => {
    const limitar = crearLimiteConcurrencia(2);
    let enCurso = 0; let maximo = 0; const orden: number[] = [];
    const resolvers: (() => void)[] = [];
    const lectura = (i: number) => () => new Promise<number>(r => {
      enCurso++; maximo = Math.max(maximo, enCurso); orden.push(i);
      resolvers.push(() => { enCurso--; r(i); });
    });
    const todas = Promise.all([1, 2, 3, 4, 5].map(i => limitar(lectura(i))));
    await esperar();
    expect(orden).toEqual([1, 2]);
    while (resolvers.length) { resolvers.shift()!(); await esperar(); }
    expect(await todas).toEqual([1, 2, 3, 4, 5]);
    expect(maximo).toBe(2);
    expect(orden).toEqual([1, 2, 3, 4, 5]);
  });

  it('una lectura que falla libera su lugar', async () => {
    const limitar = crearLimiteConcurrencia(1);
    await expect(limitar(() => Promise.reject(new Error('503')))).rejects.toThrow('503');
    expect(await limitar(() => Promise.resolve('ok'))).toBe('ok');
  });
});

describe('protección de fichas (por slug + global)', () => {
  it('300 fichas a la vez llegan a WordPress de a 2', async () => {
    const proteger = crearProteccionFichas(2, 60_000);
    let enCurso = 0; let maximo = 0;
    const leer = () => new Promise<string>(r => {
      enCurso++; maximo = Math.max(maximo, enCurso);
      setTimeout(() => { enCurso--; r('ok'); }, 1);
    });
    const slugs = Array.from({ length: 300 }, (_, i) => `ficha-${i}`);
    await Promise.all(slugs.map(s => proteger(s, leer)));
    expect(maximo).toBe(2);
  });

  it('pedidos repetidos de la misma ficha comparten la lectura y no ocupan cola', async () => {
    const proteger = crearProteccionFichas(1, 60_000);
    const leer = vi.fn(() => Promise.resolve('ficha'));
    const r = await Promise.all([proteger('a', leer), proteger('a', leer), proteger('a', leer)]);
    expect(r).toEqual(['ficha', 'ficha', 'ficha']);
    expect(leer).toHaveBeenCalledTimes(1);
  });

  it('tras una falla la ficha queda en pausa 60 s sin tocar WordPress', async () => {
    const proteger = crearProteccionFichas(2, 60_000, () => 0);
    const leer = vi.fn().mockRejectedValueOnce(new Error('503')).mockResolvedValue('ok');
    await expect(proteger('a', leer)).rejects.toThrow('503');
    await expect(proteger('a', leer)).rejects.toBeInstanceOf(WordPressEnPausaError);
    expect(leer).toHaveBeenCalledTimes(1);
  });
});

describe('ficha del servidor: 1 consulta, sin reintento', () => {
  beforeEach(() => {
    fetchWithRetry.mockReset();
    fetchWithRetry.mockImplementation(async () => new Response(JSON.stringify({
      data: { product: {
        id: '1', name: 'Hoodie Grey', slug: 'hoodie-grey-hstars', description: '', productTags: { nodes: [] },
        productCategories: { nodes: [{ slug: 'hoodies', name: 'Hoodies' }] },
        image: { sourceUrl: 'https://wp/hoodie.jpg' }, galleryImages: { nodes: [] },
        price: '$1', regularPrice: '$1', stockStatus: 'IN_STOCK', stockQuantity: 5,
      } },
    }), { status: 200 }));
  });

  it('fetchProductDetailParaFicha hace UNA consulta con retries 0', async () => {
    const { fetchProductDetailParaFicha } = await import('@/lib/product-detail');
    await fetchProductDetailParaFicha('hoodie-grey-hstars');
    expect(fetchWithRetry).toHaveBeenCalledTimes(1);
    const [, , opts] = fetchWithRetry.mock.calls[0];
    expect(opts).toEqual({ retries: 0 });
    expect(JSON.parse(fetchWithRetry.mock.calls[0][1].body).query).toContain('GetProduct');
  });

  it('el navegador y la traducción siguen con su comportamiento (reintento por defecto)', async () => {
    const { fetchProductDetail } = await import('@/lib/product-detail');
    await fetchProductDetail('hoodie-grey-hstars', { server: true });
    expect(fetchWithRetry.mock.calls[0][2]).toBeUndefined();
  });
});

describe('miniaturas de colorways desde el catálogo', () => {
  const producto = (colors: any[]) => ({ slug: 'tee-black', colors } as any);
  const colores = [
    { label: 'Black', value: '#000', image: 'local/black.png', slug: 'tee-black' },
    { label: 'White', value: '#fff', image: 'local/white.png', slug: 'tee-white' },
    { label: 'Navy', value: '#00f', image: 'local/navy.png', slug: 'tee-navy' },
  ];

  it('toma la foto destacada de cada hermano y saca los que no están publicados', async () => {
    const { aplicarImagenesDeColorway } = await import('@/lib/product-detail');
    const original = producto(colores);
    const r = aplicarImagenesDeColorway(original, [
      { slug: 'tee-black', image: 'wp/black.jpg' },
      { slug: 'tee-white', image: 'wp/white.jpg' },
    ]);
    expect(r.colors.map(c => [c.slug, c.image])).toEqual([
      ['tee-black', 'wp/black.jpg'],
      ['tee-white', 'wp/white.jpg'],
    ]);
    expect(original.colors).toHaveLength(3); // no muta lo que viene de caché
  });

  it('el producto actual queda aunque no esté en el catálogo', async () => {
    const { aplicarImagenesDeColorway } = await import('@/lib/product-detail');
    const r = aplicarImagenesDeColorway(producto(colores), [{ slug: 'tee-white', image: 'wp/white.jpg' }]);
    expect(r.colors.map(c => c.slug)).toEqual(['tee-black', 'tee-white']);
    expect(r.colors[0].image).toBe('local/black.png');
  });

  it('con catálogo vacío (sin lectura) no saca ningún color', async () => {
    const { aplicarImagenesDeColorway } = await import('@/lib/product-detail');
    const p = producto(colores);
    expect(aplicarImagenesDeColorway(p, [])).toBe(p);
  });

  it('productos sin colorways quedan igual', async () => {
    const { aplicarImagenesDeColorway } = await import('@/lib/product-detail');
    const p = producto([colores[0]]);
    expect(aplicarImagenesDeColorway(p, [{ slug: 'tee-black', image: 'x' }])).toBe(p);
  });
});
