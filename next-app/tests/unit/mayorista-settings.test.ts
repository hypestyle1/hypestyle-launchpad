import { describe, it, expect, vi, afterEach } from 'vitest';
import { getGlobalMinOrder, effectiveMinOrder, resolveMinOrder, customerMinOrderOverride, MinOrderUnavailableError } from '@/lib/mayorista-settings';

// Política del 13/10/2026: el mínimo vive en WordPress (option
// hs_mayorista_min_order). Si no se puede leer, NO se cae a un número fijo:
// antes `getGlobalMinOrder` devolvía 500.000 ante cualquier error, y el
// cliente podía ver $600.000 en pantalla mientras el servidor validaba
// $500.000 (o al revés).

const wpOk = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

afterEach(() => vi.unstubAllGlobals());

describe('getGlobalMinOrder', () => {
  it('devuelve el mínimo de WordPress', async () => {
    vi.stubGlobal('fetch', wpOk({ minOrder: 600000 }));
    expect(await getGlobalMinOrder()).toBe(600000);
  });

  it('pide sin caché y con cache-buster (la CDN cachea los GET por URL)', async () => {
    const fetchMock = wpOk({ minOrder: 600000 });
    vi.stubGlobal('fetch', fetchMock);
    await getGlobalMinOrder();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/mayorista-settings\?_cb=\d+/);
    expect(init.cache).toBe('no-store');
  });

  it('WordPress responde 5xx: lanza, no inventa 500.000', async () => {
    vi.stubGlobal('fetch', wpOk({ message: 'boom' }, 503));
    await expect(getGlobalMinOrder()).rejects.toBeInstanceOf(MinOrderUnavailableError);
  });

  it('error de red: lanza', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNRESET'); }));
    await expect(getGlobalMinOrder()).rejects.toThrow(/ECONNRESET/);
  });

  for (const [caso, body] of [['vacío', {}], ['cero', { minOrder: 0 }], ['texto', { minOrder: 'abc' }], ['negativo', { minOrder: -5 }]] as const) {
    it(`mínimo ${caso} en WordPress: lanza (configuración rota, no "sin mínimo")`, async () => {
      vi.stubGlobal('fetch', wpOk(body));
      await expect(getGlobalMinOrder()).rejects.toBeInstanceOf(MinOrderUnavailableError);
    });
  }
});

describe('effectiveMinOrder — una sola regla para perfil, disponibilidad y pedido', () => {
  it('el override del cliente manda sobre la campaña y el general', () => {
    expect(effectiveMinOrder({ override: 250000, campaignMin: 100000, global: 600000 })).toBe(250000);
  });
  it('override en 0 (pedido autorizado a mano sin mínimo) también manda', () => {
    expect(effectiveMinOrder({ override: 0, campaignMin: 100000, global: 600000 })).toBe(0);
  });
  it('sin override, la campaña pisa al general', () => {
    expect(effectiveMinOrder({ override: null, campaignMin: 100000, global: 600000 })).toBe(100000);
  });
  it('sin override ni campaña, rige el general', () => {
    expect(effectiveMinOrder({ override: null, campaignMin: null, global: 600000 })).toBe(600000);
  });
  it('sin ninguno: null (no hay mínimo que validar, el que llama frena)', () => {
    expect(effectiveMinOrder({ override: null, campaignMin: null, global: null })).toBeNull();
  });
});

describe('resolveMinOrder', () => {
  it('con override no consulta WordPress', async () => {
    const fetchMock = wpOk({ minOrder: 600000 });
    vi.stubGlobal('fetch', fetchMock);
    expect(await resolveMinOrder({ override: 250000 })).toBe(250000);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('con mínimo de campaña tampoco', async () => {
    const fetchMock = wpOk({ minOrder: 600000 });
    vi.stubGlobal('fetch', fetchMock);
    expect(await resolveMinOrder({ override: null, campaignMin: 100000 })).toBe(100000);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sin override ni campaña lee el general', async () => {
    vi.stubGlobal('fetch', wpOk({ minOrder: 600000 }));
    expect(await resolveMinOrder({ override: null })).toBe(600000);
  });

  it('si el general no se puede leer devuelve null (y lo loguea)', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', wpOk({}, 502));
    expect(await resolveMinOrder({ override: null })).toBeNull();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe('customerMinOrderOverride', () => {
  it('lee la meta mayorista_min_order', () => {
    expect(customerMinOrderOverride([{ key: 'mayorista_min_order', value: '300000' }])).toBe(300000);
  });
  it('override borrado desde el panel (string vacío) no es "mínimo 0"', () => {
    expect(customerMinOrderOverride([{ key: 'mayorista_min_order', value: '' }])).toBeNull();
  });
  it('sin meta o inválida: null', () => {
    expect(customerMinOrderOverride(undefined)).toBeNull();
    expect(customerMinOrderOverride([{ key: 'mayorista_min_order', value: 'abc' }])).toBeNull();
    expect(customerMinOrderOverride([{ key: 'mayorista_min_order', value: '-1' }])).toBeNull();
  });
});
