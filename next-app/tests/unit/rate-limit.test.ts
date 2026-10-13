import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimitCheck, rateLimitReset, clientIp, rateLimited, RATE_LIMITS } from '@/lib/rate-limit';

const rule = { name: 'test', limit: 3, windowMs: 60_000 };
const headers = (h: Record<string, string>) => ({ headers: { get: (k: string) => h[k.toLowerCase()] ?? null } } as any);

beforeEach(() => rateLimitReset());

describe('rateLimitCheck', () => {
  it('deja pasar hasta el límite y después frena con Retry-After', () => {
    const t0 = 1_000_000;
    expect(rateLimitCheck(rule, 'a', t0)).toMatchObject({ ok: true, remaining: 2 });
    expect(rateLimitCheck(rule, 'a', t0 + 1000)).toMatchObject({ ok: true, remaining: 1 });
    expect(rateLimitCheck(rule, 'a', t0 + 2000)).toMatchObject({ ok: true, remaining: 0 });
    const blocked = rateLimitCheck(rule, 'a', t0 + 3000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBe(57);
  });
  it('la ventana se libera con el tiempo', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) rateLimitCheck(rule, 'a', t0 + i);
    expect(rateLimitCheck(rule, 'a', t0 + 10).ok).toBe(false);
    expect(rateLimitCheck(rule, 'a', t0 + 60_001).ok).toBe(true);
  });
  it('contadores separados por id y por regla', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) rateLimitCheck(rule, 'a', t0 + i);
    expect(rateLimitCheck(rule, 'b', t0).ok).toBe(true);
    expect(rateLimitCheck({ ...rule, name: 'otra' }, 'a', t0).ok).toBe(true);
  });
});

describe('clientIp / rateLimited', () => {
  it('toma la primera IP de x-forwarded-for, si no x-real-ip, si no unknown', () => {
    expect(clientIp(headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('1.2.3.4');
    expect(clientIp(headers({ 'x-real-ip': '5.6.7.8' }))).toBe('5.6.7.8');
    expect(clientIp(headers({}))).toBe('unknown');
  });
  it('devuelve un 429 con Retry-After cuando se pasa', async () => {
    const req = headers({ 'x-forwarded-for': '9.9.9.9' });
    for (let i = 0; i < RATE_LIMITS.forgot.limit; i++) expect(rateLimited(req, RATE_LIMITS.forgot)).toBeNull();
    const res = rateLimited(req, RATE_LIMITS.forgot)!;
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toMatch(/^\d+$/);
    expect((await res.json()).message).toContain('Demasiados intentos');
  });
});
