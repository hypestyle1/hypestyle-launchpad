import { beforeAll, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG, isPrivateAccessActive, isPublicOpen, isValidHandle, normalizeHandle, fmtDayMonth } from '@/lib/private-access/config';

describe('private-access · normalización del usuario de IG', () => {
  it('saca el @, pasa a minúsculas y recorta espacios y puntos finales', () => {
    expect(normalizeHandle(' @ValentinPozzi ')).toBe('valentinpozzi');
    expect(normalizeHandle('@@Fulano.')).toBe('fulano');
    expect(normalizeHandle('fulano')).toBe('fulano');
  });
  it('valida el formato de Instagram', () => {
    expect(isValidHandle('valentin.pozzi_03')).toBe(true);
    expect(isValidHandle('')).toBe(false);
    expect(isValidHandle('con espacio')).toBe(false);
    expect(isValidHandle('a'.repeat(31))).toBe(false);
  });
});

describe('private-access · ventana de preventa', () => {
  const cfg = { ...DEFAULT_CONFIG };
  const at = (iso: string) => new Date(iso).getTime();

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

  it('firma y verifica un token', async () => {
    const now = new Date('2026-10-05T12:00:00-03:00').getTime();
    const token = await session.createSessionToken(42, now);
    const parsed = await session.verifySessionToken(token, now);
    expect(parsed?.memberId).toBe(42);
    expect(parsed?.exp).toBe(new Date(DEFAULT_CONFIG.publicOpenAt).getTime());
  });
  it('rechaza un token manipulado o vencido', async () => {
    const now = new Date('2026-10-05T12:00:00-03:00').getTime();
    const token = await session.createSessionToken(42, now);
    const [id, exp, sig] = token.split('.');
    expect(await session.verifySessionToken(`${Number(id) + 1}.${exp}.${sig}`, now)).toBeNull();
    expect(await session.verifySessionToken(token, new Date('2026-10-12T00:00:00-03:00').getTime())).toBeNull();
    expect(await session.verifySessionToken('basura', now)).toBeNull();
  });
});
