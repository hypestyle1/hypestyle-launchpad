import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchFxRates, getUsdRate, FX_FALLBACK } from '@/lib/fx';

/**
 * La cotización alimenta el precio que se le muestra al comprador de afuera y
 * el que le cobra PayPal. Lo que importa acá es que una respuesta rota de
 * dolarapi NUNCA se propague como precio: un 0 daría division by zero y un
 * Infinity en toda la vitrina.
 */

const mockFetch = (impl: (url: string) => any) => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => impl(String(url))));
};

const ok = (venta: any) => ({ ok: true, json: async () => ({ venta }) });

afterEach(() => vi.unstubAllGlobals());

describe('fetchFxRates', () => {
  it('usa la cotización de venta de la API', async () => {
    mockFetch((url) => (url.includes('/eur') ? ok(1800) : ok(1600)));
    expect(await fetchFxRates()).toEqual({ USD: 1600, EUR: 1800 });
  });

  it('cae al respaldo si la API responde con error', async () => {
    mockFetch(() => ({ ok: false, json: async () => ({}) }));
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
    mockFetch((url) => (url.includes('/eur') ? ok(0) : ok(1600)));
    expect(await fetchFxRates()).toEqual({ USD: 1600, EUR: FX_FALLBACK.EUR });
  });

  it('siempre devuelve cotizaciones usables como divisor', async () => {
    mockFetch(() => ok(0));
    const { USD, EUR } = await fetchFxRates();
    expect(Number.isFinite(100000 / USD)).toBe(true);
    expect(Number.isFinite(100000 / EUR)).toBe(true);
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
