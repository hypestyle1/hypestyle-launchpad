import { describe, it, expect, vi } from 'vitest';
import { crearCortacircuitos, WordPressEnPausaError } from '@/lib/wp-cortacircuitos';

// Incidente MySQL/Hostinger 4/11/2026 16:07: las regeneraciones de los listados
// reintentaban el catálogo contra un WordPress lento en cada visita y ocuparon
// todos los procesos PHP. Estos tests fijan cómo se corta ese bucle.

describe('cortacircuitos de WordPress', () => {
  it('pedidos simultáneos comparten UNA sola lectura', async () => {
    const proteger = crearCortacircuitos(60_000);
    let resolver!: (v: string) => void;
    const lectura = vi.fn(() => new Promise<string>(r => { resolver = r; }));
    const a = proteger(lectura); const b = proteger(lectura); const c = proteger(lectura);
    resolver('catalogo');
    expect(await Promise.all([a, b, c])).toEqual(['catalogo', 'catalogo', 'catalogo']);
    expect(lectura).toHaveBeenCalledTimes(1);
  });

  it('tras una falla no vuelve a pegarle a WordPress durante la pausa', async () => {
    let t = 1_000_000;
    const proteger = crearCortacircuitos(60_000, () => t);
    const lectura = vi.fn().mockRejectedValueOnce(new Error('aborted')).mockResolvedValue('ok');
    await expect(proteger(lectura)).rejects.toThrow('aborted');
    t += 30_000;
    await expect(proteger(lectura)).rejects.toBeInstanceOf(WordPressEnPausaError);
    expect(lectura).toHaveBeenCalledTimes(1);
    t += 31_000;
    expect(await proteger(lectura)).toBe('ok');
    expect(lectura).toHaveBeenCalledTimes(2);
  });

  it('una lectura exitosa limpia la pausa', async () => {
    let t = 0;
    const proteger = crearCortacircuitos(60_000, () => t);
    await expect(proteger(() => Promise.reject(new Error('x')))).rejects.toThrow();
    t = 61_000;
    await proteger(() => Promise.resolve(1));
    expect(await proteger(() => Promise.resolve(2))).toBe(2);
  });
});

describe('cortacircuitos por clave (fichas)', () => {
  it('la falla de una ficha no pausa a las demás', async () => {
    const { crearCortacircuitosPorClave } = await import('@/lib/wp-cortacircuitos');
    const proteger = crearCortacircuitosPorClave(60_000, () => 0);
    await expect(proteger('a', () => Promise.reject(new Error('x')))).rejects.toThrow('x');
    await expect(proteger('a', () => Promise.resolve(1))).rejects.toBeInstanceOf(WordPressEnPausaError);
    expect(await proteger('b', () => Promise.resolve(2))).toBe(2);
  });
});

describe('catálogo de los listados', () => {
  it('pasa por unstable_cache (60 s) con un solo intento de hasta 25 s, sin reintentos', async () => {
    vi.resetModules();
    const llamadas: any[] = [];
    const fetchAllProductsDentroDeCache = vi.fn(async (..._a: any[]) => [{ slug: 'remera' }, { slug: 'gift-card' }]);
    vi.doMock('@/lib/products-server', () => ({ fetchAllProductsDentroDeCache }));
    vi.doMock('next/cache', () => ({ unstable_cache: (fn: any, key: any, opts: any) => { llamadas.push({ key, opts }); return fn; } }));
    const { fetchCatalogForSsr } = await import('@/lib/catalog');
    expect(await fetchCatalogForSsr()).toEqual([{ slug: 'remera' }]);
    expect(llamadas).toEqual([{ key: ['catalogo-ssr-v1'], opts: { revalidate: 60 } }]);
    expect(fetchAllProductsDentroDeCache).toHaveBeenCalledWith({ retries: 0, timeoutMs: 25_000 });
  });
});

describe('errores internos de Next no pausan las lecturas (deploy #661, 4/11 18:07)', () => {
  it('un DYNAMIC_SERVER_USAGE no activa la pausa', async () => {
    const proteger = crearCortacircuitos(60_000, () => 0);
    const err = Object.assign(new Error('Dynamic server usage: no-store fetch'), { digest: 'DYNAMIC_SERVER_USAGE' });
    await expect(proteger(() => Promise.reject(err))).rejects.toBe(err);
    expect(await proteger(() => Promise.resolve('ok'))).toBe('ok');
  });
});

describe('lecturas dentro de unstable_cache no mandan cache no-store', () => {
  it('fetchAllProductsDentroDeCache no pasa cache ni next al fetch', async () => {
    vi.resetModules();
    const fetchWithRetry = vi.fn(async () => new Response(JSON.stringify({ data: { products: { nodes: [], pageInfo: { hasNextPage: false } } } }), { status: 200 }));
    vi.doUnmock('@/lib/products-server');
    vi.doMock('@/lib/fetch-retry', () => ({ fetchWithRetry }));
    const { fetchAllProductsDentroDeCache } = await import('@/lib/products-server');
    await fetchAllProductsDentroDeCache({ retries: 0 });
    const init = (fetchWithRetry.mock.calls[0] as any[])[1];
    expect(init.cache).toBeUndefined();
    expect(init.next).toBeUndefined();
  });
});
