import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchFxRates, getUsdRate, mergeRates, FX_FALLBACK } from '@/lib/fx';
import { CURRENCIES } from '@/lib/currency';

/**
 * La cotización alimenta el precio que se le muestra al comprador de afuera y
 * el que le cobra PayPal. Lo que importa acá es que una respuesta rota de
 * cualquiera de las dos fuentes NUNCA se propague como precio: un 0 daría
 * division by zero y un Infinity en toda la vitrina.
 */

const mockFetch = (impl: (url: string) => any) => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => impl(String(url))));
};

const ok = (venta: any) => ({ ok: true, json: async () => ({ venta }) });
// frankfurter.dev: unidades de cada moneda por dólar.
const okCross = (rates: any) => ({ ok: true, json: async () => ({ base: 'USD', rates }) });
const caida = { ok: false, json: async () => ({}) };

/** dolarapi responde `venta` según la moneda del path; el cruce, lo que se le pase. */
const fuentes = (dolarapi: Record<string, any>, cross: any) => (url: string) => {
  if (url.includes('frankfurter')) return cross;
  const moneda = Object.keys(dolarapi).find((m) => url.endsWith('/' + m));
  return ok(moneda ? dolarapi[moneda] : undefined);
};

const EN_VIVO = { oficial: 1600, eur: 1800, brl: 300, clp: 1.6, uyu: 40 };

afterEach(() => vi.unstubAllGlobals());

describe('fetchFxRates', () => {
  it('usa la cotización de venta de la API', async () => {
    mockFetch(fuentes(EN_VIVO, okCross({ GBP: 0.8, MXN: 16 })));
    expect(await fetchFxRates()).toEqual({ USD: 1600, EUR: 1800, BRL: 300, CLP: 1.6, UYU: 40, GBP: 2000, MXN: 100 });
  });

  it('cae al respaldo si la API responde con error', async () => {
    mockFetch(() => caida);
    expect(await fetchFxRates()).toEqual(FX_FALLBACK);
  });

  it('cae al respaldo si la red falla', async () => {
    mockFetch(() => {
      throw new Error('ECONNREFUSED');
    });
    expect(await fetchFxRates()).toEqual(FX_FALLBACK);
  });

  it('descarta una cotización de 0 (rompería el precio de todo el sitio)', async () => {
    mockFetch(() => ok(0));
    expect(await fetchFxRates()).toEqual(FX_FALLBACK);
  });

  it('descarta una cotización negativa o no numérica', async () => {
    mockFetch(() => ok(-5));
    expect((await fetchFxRates()).USD).toBe(FX_FALLBACK.USD);

    mockFetch(() => ok('1600'));
    expect((await fetchFxRates()).USD).toBe(FX_FALLBACK.USD);

    mockFetch(() => ok(undefined));
    expect((await fetchFxRates()).USD).toBe(FX_FALLBACK.USD);
  });

  it('cae al respaldo si el cuerpo no es JSON válido', async () => {
    mockFetch(() => ({
      ok: true,
      json: async () => {
        throw new Error('Unexpected token');
      },
    }));
    expect(await fetchFxRates()).toEqual(FX_FALLBACK);
  });

  it('una moneda caída no arrastra a la otra', async () => {
    mockFetch(fuentes({ ...EN_VIVO, eur: 0 }, okCross({ GBP: 0.8, MXN: 16 })));
    expect(await fetchFxRates()).toMatchObject({ USD: 1600, EUR: FX_FALLBACK.EUR, BRL: 300, UYU: 40 });
  });

  it('siempre devuelve cotizaciones usables como divisor, para todas las monedas', async () => {
    mockFetch(() => ok(0));
    const rates = await fetchFxRates();
    expect(Object.keys(rates).sort()).toEqual(['BRL', 'CLP', 'EUR', 'GBP', 'MXN', 'USD', 'UYU']);
    for (const r of Object.values(rates)) expect(Number.isFinite(100000 / r)).toBe(true);
  });
});

describe('fetchFxRates — libra y peso mexicano (cruce contra el dólar)', () => {
  it('salen del cruce contra el mismo dólar oficial que el resto', async () => {
    mockFetch(fuentes({ oficial: 1500 }, okCross({ GBP: 0.75, MXN: 17.5 })));
    const r = await fetchFxRates();
    expect(r.GBP).toBeCloseTo(2000, 6);
    expect(r.MXN).toBeCloseTo(1500 / 17.5, 6);
  });

  it('si la fuente del cruce se cae, van al respaldo y el resto sigue en vivo', async () => {
    mockFetch(fuentes(EN_VIVO, caida));
    expect(await fetchFxRates()).toEqual({
      USD: 1600, EUR: 1800, BRL: 300, CLP: 1.6, UYU: 40,
      GBP: FX_FALLBACK.GBP, MXN: FX_FALLBACK.MXN,
    });
  });

  it('un cruce roto (0, negativo, texto, ausente) nunca llega al precio', async () => {
    for (const rates of [{ GBP: 0, MXN: -3 }, { GBP: '0.75', MXN: null }, {}, undefined]) {
      mockFetch(fuentes(EN_VIVO, okCross(rates)));
      const r = await fetchFxRates();
      expect(r.GBP).toBe(FX_FALLBACK.GBP);
      expect(r.MXN).toBe(FX_FALLBACK.MXN);
    }
  });

  it('una moneda del cruce rota no arrastra a la otra', async () => {
    mockFetch(fuentes(EN_VIVO, okCross({ GBP: 0.8 })));
    const r = await fetchFxRates();
    expect(r.GBP).toBe(2000);
    expect(r.MXN).toBe(FX_FALLBACK.MXN);
  });

  it('con el dólar caído, el cruce se para sobre el dólar de respaldo', async () => {
    mockFetch(fuentes({ ...EN_VIVO, oficial: 0 }, okCross({ GBP: 0.8, MXN: 16 })));
    const r = await fetchFxRates();
    expect(r.USD).toBe(FX_FALLBACK.USD);
    expect(r.GBP).toBeCloseTo(FX_FALLBACK.USD / 0.8, 6);
  });

  it('cachea el cruce igual que dolarapi (revalidate de 1 h)', async () => {
    const spy = vi.fn(async (url: string) => fuentes(EN_VIVO, okCross({ GBP: 0.8, MXN: 16 }))(String(url)));
    vi.stubGlobal('fetch', spy);
    await fetchFxRates();
    const cross = spy.mock.calls.find(([url]) => String(url).includes('frankfurter')) as any[];
    expect(cross[1]).toEqual({ next: { revalidate: 3600 } });
  });
});

describe('FX_FALLBACK', () => {
  it('tiene respaldo positivo para todas las monedas que se muestran', () => {
    for (const c of CURRENCIES) {
      if (c.code === 'ARS') continue;
      expect(FX_FALLBACK[c.code], c.code).toBeGreaterThan(0);
    }
  });
});

describe('mergeRates — lo que recibe el navegador de /api/fx-rate', () => {
  it('toma las cotizaciones válidas', () => {
    expect(mergeRates({ USD: 1600, GBP: 2100 })).toEqual({ ...FX_FALLBACK, USD: 1600, GBP: 2100 });
  });

  it('una respuesta vieja (solo USD y EUR) deja el resto en el respaldo, no en NaN', () => {
    const r = mergeRates({ USD: 1600, EUR: 1800 });
    expect(r.BRL).toBe(FX_FALLBACK.BRL);
    expect(r.CLP).toBe(FX_FALLBACK.CLP);
  });

  it('descarta valores rotos y respuestas que no son un objeto', () => {
    expect(mergeRates({ USD: 0, EUR: -1, BRL: 'x', GBP: null, MXN: NaN, CLP: Infinity })).toEqual(FX_FALLBACK);
    expect(mergeRates(null)).toEqual(FX_FALLBACK);
    expect(mergeRates('error')).toEqual(FX_FALLBACK);
  });
});

describe('getUsdRate', () => {
  it('cotiza el dólar oficial', async () => {
    mockFetch(() => ok(1600));
    expect(await getUsdRate()).toBe(1600);
  });

  it('cae al respaldo antes que devolver algo que rompa el cobro', async () => {
    mockFetch(() => ok(0));
    expect(await getUsdRate()).toBe(FX_FALLBACK.USD);
  });
});
