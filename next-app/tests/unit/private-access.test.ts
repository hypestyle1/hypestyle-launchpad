import { beforeAll, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG, isPrivateAccessActive, isPublicOpen, isValidHandle, normalizeHandle, fmtDayMonth } from '@/lib/private-access/config';

describe('private-access · normalización del usuario de IG', () => {
  it('saca el @, pasa a minúsculas y recorta espacios y puntos finales', () => {
    expect(normalizeHandle(' @ValentinPozzi ')).toBe('valentinpozzi');
    expect(normalizeHandle('@@Fulano.')).toBe('fulano');
    expect(normalizeHandle('fulano')).toBe('fulano');
    expect(normalizeHandle('instagram.com/Hypestyle?hl=es')).toBe('hypestyle');
  });
  it('valida el formato de Instagram', () => {
    expect(isValidHandle('valentin.pozzi_03')).toBe(true);
    expect(isValidHandle('')).toBe(false);
    expect(isValidHandle('con espacio')).toBe(false);
    expect(isValidHandle('a'.repeat(31))).toBe(false);
  });
});

describe('private-access · ventana de preventa', () => {
  const cfg = { ...DEFAULT_CONFIG, enabled: true };
  const at = (iso: string) => new Date(iso).getTime();

  it('el default viene apagado (fail-closed si WordPress no responde)', () => {
    expect(DEFAULT_CONFIG.enabled).toBe(false);
    expect(isPrivateAccessActive(DEFAULT_CONFIG, at('2026-10-06T12:00:00-03:00'))).toBe(false);
  });
  it('antes del inicio no está activa', () => {
    expect(isPrivateAccessActive(cfg, at('2026-10-03T12:00:00-03:00'))).toBe(false);
  });
  it('dentro de la ventana está activa', () => {
    expect(isPrivateAccessActive(cfg, at('2026-10-04T00:00:01-03:00'))).toBe(true);
    expect(isPrivateAccessActive(cfg, at('2026-10-10T23:59:00-03:00'))).toBe(true);
  });
  it('desde la apertura pública deja de estar activa y isPublicOpen pasa a true', () => {
    const t = at('2026-10-11T00:00:00-03:00');
    expect(isPrivateAccessActive(cfg, t)).toBe(false);
    expect(isPublicOpen(cfg, t)).toBe(true);
  });
  it('el override manual manda sobre la fecha', () => {
    expect(isPrivateAccessActive({ ...cfg, override: 'force_off' }, at('2026-10-06T12:00:00-03:00'))).toBe(false);
    expect(isPrivateAccessActive({ ...cfg, override: 'force_on' }, at('2026-09-01T12:00:00-03:00'))).toBe(true);
    expect(isPublicOpen({ ...cfg, override: 'force_on' }, at('2026-10-12T00:00:00-03:00'))).toBe(false);
  });
  it('formatea día.mes en hora Argentina', () => {
    expect(fmtDayMonth('2026-10-10T23:59:59-03:00')).toBe('10.10');
    expect(fmtDayMonth('2026-10-11T00:00:00-03:00')).toBe('11.10');
  });
});

describe('private-access · sesión firmada', () => {
  let session: typeof import('@/lib/private-access/session');

  beforeAll(async () => {
    vi.stubEnv('PRIVATE_ACCESS_SESSION_SECRET', 'secreto-de-prueba-no-usar');
    vi.resetModules();
    session = await import('@/lib/private-access/session');
  });

  it('vence en la apertura pública, con tope de 7 días', () => {
    const open = DEFAULT_CONFIG.publicOpenAt;
    expect(session.sessionExpiry(open, at('2026-10-09T12:00:00-03:00'))).toBe(at(open));
    expect(session.sessionExpiry(open, at('2026-10-01T12:00:00-03:00'))).toBe(at('2026-10-08T12:00:00-03:00'));
  });
  it('firma y verifica un token', async () => {
    const now = at('2026-10-05T12:00:00-03:00');
    const exp = session.sessionExpiry(DEFAULT_CONFIG.publicOpenAt, now);
    const token = await session.createSessionToken(42, exp);
    const parsed = await session.verifySessionToken(token, now);
    expect(parsed?.memberId).toBe(42);
    expect(parsed?.exp).toBe(at(DEFAULT_CONFIG.publicOpenAt));
  });
  it('rechaza un token manipulado o vencido', async () => {
    const now = at('2026-10-05T12:00:00-03:00');
    const token = await session.createSessionToken(42, session.sessionExpiry(DEFAULT_CONFIG.publicOpenAt, now));
    const [id, exp, sig] = token.split('.');
    expect(await session.verifySessionToken(`${Number(id) + 1}.${exp}.${sig}`, now)).toBeNull();
    expect(await session.verifySessionToken(`${id}.${Number(exp) + 1000}.${sig}`, now)).toBeNull();
    expect(await session.verifySessionToken(token, at('2026-10-12T00:00:00-03:00'))).toBeNull();
    expect(await session.verifySessionToken('basura', now)).toBeNull();
  });
});

function at(iso: string) { return new Date(iso).getTime(); }

describe('private-access · marca del pedido (create-order)', () => {
  let order: typeof import('@/lib/private-access/order');
  let session: typeof import('@/lib/private-access/session');

  beforeAll(async () => {
    vi.stubEnv('PRIVATE_ACCESS_SESSION_SECRET', 'secreto-de-prueba-no-usar');
    vi.resetModules();
    session = await import('@/lib/private-access/session');
    order = await import('@/lib/private-access/order');
  });

  it('sin cookie descarta lo que mande el navegador', async () => {
    const out = await order.withPrivateAccess({ items: [1], privateAccess: { memberId: 999 } }, undefined);
    expect(out).toEqual({ items: [1] });
  });
  it('con cookie falsificada también lo descarta', async () => {
    const out = await order.withPrivateAccess({ items: [1], privateAccess: { memberId: 999 } }, '999.9999999999999.firmafalsa');
    expect('privateAccess' in out).toBe(false);
  });
  it('con cookie válida marca con el memberId de la cookie, no el del body', async () => {
    const token = await session.createSessionToken(7, Date.now() + 3600_000);
    const out = await order.withPrivateAccess({ items: [1], privateAccess: { memberId: 999 } }, token);
    expect(out).toEqual({ items: [1], privateAccess: { memberId: 7 } });
  });
});
