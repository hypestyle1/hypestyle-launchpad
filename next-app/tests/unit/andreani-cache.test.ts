import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cotizarAndreani, cotizarAndreaniConEstado, _resetCacheAndreani } from '@/lib/andreani-cotizador';

// El caché existe para que cada cotización no arranque WordPress completo vía
// admin-ajax (hallazgo del 3/11: era el mayor consumidor de CPU del evento).
// Garantías que fijan estos tests: clave exacta (nunca la tarifa de otro
// carrito), TTL de 15 minutos, errores sin cachear, y stale solo ante fallo
// de WP y por un máximo de 2 horas.

const RATES_A = { rates: [{ id: 'sucursal', label: 'Retiro en sucursal', price: 6408 }] };
const RATES_B = { rates: [{ id: 'sucursal', label: 'Retiro en sucursal', price: 9165 }] };

const fetchMock = vi.fn();

beforeEach(() => {
  _resetCacheAndreani();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-03T18:00:00Z'));
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const ok = (payload: unknown) => ({ json: async () => payload });

describe('caché del cotizador Andreani', () => {
  it('MISS y después HIT dentro del TTL: una sola llamada a admin-ajax', async () => {
    fetchMock.mockResolvedValueOnce(ok(RATES_A));
    const primera = await cotizarAndreaniConEstado({ cp: '1425', valor: 54900, peso: 0.5 });
    const segunda = await cotizarAndreaniConEstado({ cp: '1425', valor: 54900, peso: 0.5 });
    expect(primera.estado).toBe('MISS');
    expect(segunda.estado).toBe('HIT');
    expect(segunda.data).toEqual(RATES_A);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('carritos distintos no comparten tarifa: valor distinto = clave distinta', async () => {
    fetchMock.mockResolvedValueOnce(ok(RATES_A)).mockResolvedValueOnce(ok(RATES_B));
    const a = await cotizarAndreani({ cp: '1425', valor: 54900 });
    const b = await cotizarAndreani({ cp: '1425', valor: 134895 });
    expect(a).toEqual(RATES_A);
    expect(b).toEqual(RATES_B);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('CP distinto y peso distinto también separan la clave', async () => {
    fetchMock.mockResolvedValue(ok(RATES_A));
    await cotizarAndreani({ cp: '1425', valor: 54900, peso: 0.5 });
    await cotizarAndreani({ cp: '5000', valor: 54900, peso: 0.5 });
    await cotizarAndreani({ cp: '1425', valor: 54900, peso: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('pasados los 15 minutos vuelve a cotizar en WP', async () => {
    fetchMock.mockResolvedValue(ok(RATES_A));
    await cotizarAndreani({ cp: '1425', valor: 54900 });
    vi.advanceTimersByTime(15 * 60 * 1000 + 1000);
    const { estado } = await cotizarAndreaniConEstado({ cp: '1425', valor: 54900 });
    expect(estado).toBe('MISS');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('una respuesta con error no se cachea', async () => {
    fetchMock.mockResolvedValue(ok({ error: 'tarifario no disponible' }));
    await cotizarAndreani({ cp: '1425', valor: 54900 });
    await cotizarAndreani({ cp: '1425', valor: 54900 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('una respuesta sin rates no se cachea', async () => {
    fetchMock.mockResolvedValue(ok({ rates: [] }));
    await cotizarAndreani({ cp: '1425', valor: 54900 });
    await cotizarAndreani({ cp: '1425', valor: 54900 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('con WP caído sirve la última tarifa buena (STALE) aunque el TTL haya vencido', async () => {
    fetchMock.mockResolvedValueOnce(ok(RATES_A));
    await cotizarAndreani({ cp: '1425', valor: 54900 });
    vi.advanceTimersByTime(30 * 60 * 1000); // TTL vencido, dentro de la ventana stale
    fetchMock.mockRejectedValueOnce(new Error('install.php')); // WP caído: admin-ajax devuelve HTML
    const { data, estado } = await cotizarAndreaniConEstado({ cp: '1425', valor: 54900 });
    expect(estado).toBe('STALE');
    expect(data).toEqual(RATES_A);
  });

  it('el stale tiene techo: a las 2 horas el error se propaga como hoy', async () => {
    fetchMock.mockResolvedValueOnce(ok(RATES_A));
    await cotizarAndreani({ cp: '1425', valor: 54900 });
    vi.advanceTimersByTime(2 * 60 * 60 * 1000 + 1000);
    fetchMock.mockRejectedValueOnce(new Error('install.php'));
    await expect(cotizarAndreani({ cp: '1425', valor: 54900 })).rejects.toThrow('install.php');
  });

  it('sin entrada previa, el error de WP se propaga igual que antes del caché', async () => {
    fetchMock.mockRejectedValueOnce(new Error('timeout'));
    await expect(cotizarAndreani({ cp: '1425', valor: 54900 })).rejects.toThrow('timeout');
  });

  it('CP inválido devuelve el mismo error de siempre y no toca la red', async () => {
    const r = await cotizarAndreani({ cp: '' });
    expect(r).toEqual({ error: 'cp requerido' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
