import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getCookie } = vi.hoisted(() => ({ getCookie: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: () => ({ get: getCookie }) }));

import { emitirCookie, COOKIE_CYBER, LOCK_START, EARLY_START, PUBLIC_OPEN } from '@/lib/cyber-gate';
import { CYBER_END } from '@/lib/cyber-hype';
import { cyberTakeoverVisible, cyberAuthenticated } from '@/lib/cyber-visibility-server';

const SECRETO = 'test-only-Cyber';

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('EARLY_ACCESS_PASSWORD', SECRETO);
  vi.stubEnv('CYBER_APAGADO', '');
  getCookie.mockReset();
});

afterEach(() => vi.unstubAllEnvs());

describe('visibilidad del takeover separada de la activación comercial', () => {
  it('la previsualización exige cookie válida y termina con la apertura pública', async () => {
    getCookie.mockReturnValue(undefined);
    expect(await cyberAuthenticated(LOCK_START + 1)).toBe(false);
    getCookie.mockReturnValue({ value: 'cookie-falsa' });
    expect(await cyberAuthenticated(LOCK_START + 1)).toBe(false);
    getCookie.mockReturnValue({ value: await emitirCookie(PUBLIC_OPEN, SECRETO) });
    expect(await cyberAuthenticated(LOCK_START + 1)).toBe(true);
    expect(await cyberAuthenticated(PUBLIC_OPEN)).toBe(false);
  });
  it('antes del cierre no adelanta el diseño aunque exista una cookie', async () => {
    const ahora = LOCK_START - 1;
    getCookie.mockReturnValue({ name: COOKIE_CYBER, value: await emitirCookie(PUBLIC_OPEN, SECRETO) });
    expect(await cyberTakeoverVisible(ahora)).toBe(false);
  });

  it('durante el cierre previo a las 19 sólo pasa una cookie firmada válida', async () => {
    const ahora = LOCK_START + 1;
    getCookie.mockReturnValue({ name: COOKIE_CYBER, value: 'true' });
    expect(await cyberTakeoverVisible(ahora)).toBe(false);

    getCookie.mockReturnValue({ name: COOKIE_CYBER, value: await emitirCookie(PUBLIC_OPEN, SECRETO) });
    expect(await cyberTakeoverVisible(ahora)).toBe(true);
  });

  it('a las 19 la fase normal muestra el takeover sin cambiar el gate público', async () => {
    getCookie.mockReturnValue(undefined);
    expect(await cyberTakeoverVisible(EARLY_START)).toBe(true);
  });

  it('después del evento vuelve a ocultarlo', async () => {
    getCookie.mockReturnValue({ name: COOKIE_CYBER, value: await emitirCookie(Date.parse(CYBER_END) + 1000, SECRETO) });
    expect(await cyberTakeoverVisible(Date.parse(CYBER_END))).toBe(false);
  });

  it('el kill switch conserva prioridad', async () => {
    vi.stubEnv('CYBER_APAGADO', '1');
    getCookie.mockReturnValue({ name: COOKIE_CYBER, value: await emitirCookie(PUBLIC_OPEN, SECRETO) });
    expect(await cyberTakeoverVisible(LOCK_START + 1)).toBe(false);
  });
});
