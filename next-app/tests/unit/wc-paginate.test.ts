import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// El módulo lee las credenciales al importarse; con que existan alcanza.
process.env.WC_CONSUMER_KEY = 'ck_test';
process.env.WC_CONSUMER_SECRET = 'cs_test';

import { fetchOrderPages, rangeParams, MAX_PAGES } from '@/lib/dashboard/wc-paginate';

/** Woo de mentira: N pedidos repartidos en páginas de 100. */
function mockWoo(opts: {
  total: number;
  /** páginas (1-indexed) que devuelven error */
  fallan?: number[];
  /** omitir el header X-WP-TotalPages, como una instalación vieja */
  sinHeader?: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(opts.total / 100));
  const pedidas: number[] = [];
  const fetchMock = vi.fn(async (url: string) => {
    const page = Number(new URL(url).searchParams.get('page'));
    pedidas.push(page);
    if (opts.fallan?.includes(page)) {
      return { ok: false, status: 500, headers: new Headers(), json: async () => [] } as any;
    }
    const from = (page - 1) * 100;
    const batch = Array.from({ length: Math.max(0, Math.min(100, opts.total - from)) }, (_, i) => ({ id: from + i + 1 }));
    const headers = new Headers();
    if (!opts.sinHeader) headers.set('x-wp-totalpages', String(totalPages));
    return { ok: true, status: 200, headers, json: async () => batch } as any;
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, pedidas };
}

const OPTS = { fields: 'id', after: '2026-01-01T00:00:00.000Z', before: '2026-09-01T00:00:00.000Z' };

describe('fetchOrderPages', () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it('trae todas las páginas y las devuelve en orden', async () => {
    mockWoo({ total: 795 });
    const { raw, truncated } = await fetchOrderPages(OPTS);
    expect(raw).toHaveLength(795);
    expect(raw.map((o: any) => o.id)).toEqual(Array.from({ length: 795 }, (_, i) => i + 1));
    expect(truncated).toBe(false);
  });

  it('pide las páginas 2..N en paralelo, no de a una', async () => {
    // Cada respuesta tarda; si fuera secuencial el total sería ~8x el de una.
    const orden: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const page = Number(new URL(url).searchParams.get('page'));
      orden.push(`start${page}`);
      await new Promise((r) => setTimeout(r, 20));
      orden.push(`end${page}`);
      const from = (page - 1) * 100;
      const batch = Array.from({ length: Math.min(100, 795 - from) }, (_, i) => ({ id: from + i + 1 }));
      const headers = new Headers([['x-wp-totalpages', '8']]);
      return { ok: true, status: 200, headers, json: async () => batch } as any;
    }));
    await fetchOrderPages(OPTS);
    // Dentro de la primera tanda (páginas 2-5) las cuatro arrancan antes de que
    // termine ninguna: es la diferencia con el recorrido viejo.
    const i2 = orden.indexOf('start2'), i5 = orden.indexOf('start5'), fin2 = orden.indexOf('end2');
    expect(i5).toBeLessThan(fin2);
    expect(i2).toBeLessThan(i5);
  });

  it('una sola página no dispara pedidos de más', async () => {
    const { pedidas } = mockWoo({ total: 42 });
    const { raw, truncated } = await fetchOrderPages(OPTS);
    expect(raw).toHaveLength(42);
    expect(pedidas).toEqual([1]);
    expect(truncated).toBe(false);
  });

  it('rango vacío devuelve nada y no marca truncado', async () => {
    mockWoo({ total: 0 });
    expect(await fetchOrderPages(OPTS)).toEqual({ raw: [], truncated: false });
  });

  it('sin header de paginación cae al recorrido secuencial y trae lo mismo', async () => {
    const { pedidas } = mockWoo({ total: 250, sinHeader: true });
    const { raw, truncated } = await fetchOrderPages(OPTS);
    expect(raw).toHaveLength(250);
    expect(raw.map((o: any) => o.id)).toEqual(Array.from({ length: 250 }, (_, i) => i + 1));
    expect(pedidas).toEqual([1, 2, 3]);
    expect(truncated).toBe(false);
  });

  it('una página que falla marca truncated en vez de mentir con datos parciales', async () => {
    mockWoo({ total: 795, fallan: [4] });
    const { raw, truncated } = await fetchOrderPages(OPTS);
    expect(truncated).toBe(true);
    expect(raw.length).toBe(695); // faltan los 100 de la página caída, y se avisa
  });

  it('si falla la primera página no inventa un resultado vacío válido', async () => {
    mockWoo({ total: 795, fallan: [1] });
    expect(await fetchOrderPages(OPTS)).toEqual({ raw: [], truncated: true });
  });

  it('respeta el tope de MAX_PAGES y lo reporta', async () => {
    const { pedidas } = mockWoo({ total: (MAX_PAGES + 5) * 100 });
    const { raw, truncated } = await fetchOrderPages(OPTS);
    expect(truncated).toBe(true);
    expect(raw).toHaveLength(MAX_PAGES * 100);
    expect(Math.max(...pedidas)).toBe(MAX_PAGES);
  });
});

describe('rangeParams', () => {
  it('abre 6 horas a cada lado, como hacían los dos fetchers por su cuenta', () => {
    const r = rangeParams('2026-08-01T00:00:00.000Z', '2026-08-31T00:00:00.000Z');
    expect(r.after).toBe('2026-07-31T18:00:00.000Z');
    expect(r.before).toBe('2026-08-31T06:00:00.000Z');
    expect(r.startMs).toBe(Date.parse('2026-08-01T00:00:00.000Z'));
    expect(r.endMs).toBe(Date.parse('2026-08-31T00:00:00.000Z'));
  });
});
