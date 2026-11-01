import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/acceso/route';
import { middleware } from '@/middleware';
import { COOKIE_CYBER, LOCK_START, EARLY_START, PUBLIC_OPEN, emitirCookie, cookieValida } from '@/lib/cyber-gate';

const secret = 'test-only-Cyber';
const login = (password: unknown = secret) => POST(new NextRequest('https://hypestyle.com.ar/api/acceso', {
  method: 'POST', body: JSON.stringify({ password }),
}));
const visit = (path: string, cookie?: string) => middleware(new NextRequest(`https://hypestyle.com.ar${path}`, {
  headers: cookie ? { cookie: `${COOKIE_CYBER}=${cookie}` } : {},
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(EARLY_START - 1);
  vi.stubEnv('EARLY_ACCESS_PASSWORD', secret);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe('/api/acceso y middleware reales', () => {
  it('antes de las 19:00 una clave incorrecta es 401, sin cookie', async () => {
    const res = await login('incorrecta');
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false });
    expect(res.headers.has('set-cookie')).toBe(false);
  });
  it.each([LOCK_START, EARLY_START - 1, EARLY_START, PUBLIC_OPEN - 1])('la clave permite entrar durante todo el cierre (%s)', async now => {
    vi.setSystemTime(now);
    const res = await login(secret.toLowerCase());
    expect(res.status).toBe(200);
    const cookie = res.cookies.get(COOKIE_CYBER)!;
    expect(await cookieValida(cookie.value, secret)).toBe(true);
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
    expect((await visit('/', cookie.value)).headers.get('x-middleware-next')).toBe('1');
  });
  it('una cookie autentica permite navegar antes de las 19:00', async () => {
    const cookie = await emitirCookie(PUBLIC_OPEN + 1000, secret);
    for (const path of ['/', '/shop', '/producto/remera', '/carrito', '/checkout']) {
      expect((await visit(path, cookie)).headers.get('x-middleware-next')).toBe('1');
    }
  });
  it.each([LOCK_START, EARLY_START - 1, EARLY_START, PUBLIC_OPEN - 1])('el publico sigue bloqueado sin cookie (%s)', async now => {
    vi.setSystemTime(now);
    for (const path of ['/', '/shop', '/producto/remera', '/carrito', '/checkout']) {
      const res = await visit(path);
      expect(res.headers.get('location')).toBe('https://hypestyle.com.ar/acceso');
      expect(res.headers.get('cache-control')).toContain('no-store');
    }
  });
  it('la misma cookie persiste al navegar y cruzar las 19:00', async () => {
    vi.setSystemTime(LOCK_START);
    const res = await login();
    const cookie = res.cookies.get(COOKIE_CYBER)!;
    expect(Number(cookie.expires)).toBeGreaterThan(PUBLIC_OPEN);
    for (const now of [LOCK_START + 1000, EARLY_START - 1, EARLY_START, PUBLIC_OPEN - 1]) {
      vi.setSystemTime(now);
      expect((await visit('/checkout', cookie.value)).headers.get('x-middleware-next')).toBe('1');
    }
  });
  it('clave incorrecta a las 19:00 es 401, no horario', async () => {
    vi.setSystemTime(EARLY_START);
    const res = await login('incorrecta');
    expect(res.status).toBe(401);
    expect(res.headers.has('set-cookie')).toBe(false);
  });
  it('sin variable falla cerrado y distingue configuracion de contraseña', async () => {
    vi.stubEnv('EARLY_ACCESS_PASSWORD', ' ');
    expect((await login()).status).toBe(503);
    vi.setSystemTime(EARLY_START);
    expect((await login()).status).toBe(503);
    expect((await visit('/')).status).toBe(307);
  });
  it.each([null, 42])('body invalido no produce un 500 (%s)', async password => {
    expect((await login(password)).status).toBe(400);
  });
  it('JSON roto no produce un 500', async () => {
    expect((await POST(new NextRequest('https://hypestyle.com.ar/api/acceso', { method: 'POST', body: '{' }))).status).toBe(400);
  });
  it('entre 19 y 20 sin cookie o con cookie falsa sigue cerrado', async () => {
    vi.setSystemTime(PUBLIC_OPEN - 1);
    expect((await visit('/')).status).toBe(307);
    expect((await visit('/', 'true')).status).toBe(307);
  });
  it('a las 20 abre al publico sin contraseña ni cookie', async () => {
    vi.setSystemTime(PUBLIC_OPEN);
    vi.stubEnv('EARLY_ACCESS_PASSWORD', '');
    expect((await visit('/')).headers.get('x-middleware-next')).toBe('1');
  });
  it.each(['/api/acceso', '/api/paypal-capture', '/api/confirm-paid', '/api/webhooks/gocuotas', '/api/checkout', '/acceso'])('no intercepta %s antes de las 19', async path => {
    expect((await visit(path)).headers.get('x-middleware-next')).toBe('1');
  });
  it('una rotacion de clave invalida la cookie anterior', async () => {
    vi.setSystemTime(EARLY_START);
    const res = await login();
    vi.stubEnv('EARLY_ACCESS_PASSWORD', 'rotated-test-only');
    expect((await visit('/', res.cookies.get(COOKIE_CYBER)!.value)).status).toBe(307);
  });
});
