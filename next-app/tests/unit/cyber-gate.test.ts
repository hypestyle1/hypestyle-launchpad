import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOCK_START, EARLY_START, PUBLIC_OPEN, COOKIE_CYBER, cyberBloqueado } from '@/lib/cyber-gate';

const en = (iso: string) => new Date(iso).getTime();

describe('gate de CYBER HYPE — la ventana de bloqueo', () => {
  it('las tres horas son las aprobadas, en hora de Argentina', () => {
    expect(new Date(LOCK_START).toISOString()).toBe('2026-11-01T03:00:00.000Z'); // 00:00 ART
    expect(new Date(EARLY_START).toISOString()).toBe('2026-11-01T22:00:00.000Z'); // 19:00 ART
    expect(new Date(PUBLIC_OPEN).toISOString()).toBe('2026-11-01T23:00:00.000Z'); // 20:00 ART
    expect(LOCK_START).toBeLessThan(EARLY_START);
    expect(EARLY_START).toBeLessThan(PUBLIC_OPEN);
  });

  it('NO bloquea antes de la medianoche: por eso se puede desplegar con horas de anticipación', () => {
    expect(cyberBloqueado(en('2026-10-31T18:00:00-03:00'))).toBe(false);
    expect(cyberBloqueado(en('2026-11-01T23:59:59-03:00') - 86_400_000)).toBe(false);
    // Un segundo antes del cierre, abierto.
    expect(cyberBloqueado(LOCK_START - 1000)).toBe(false);
  });

  it('bloquea desde las 00:00 y hasta las 20:00', () => {
    expect(cyberBloqueado(LOCK_START)).toBe(true);
    expect(cyberBloqueado(en('2026-11-01T09:00:00-03:00'))).toBe(true);
    expect(cyberBloqueado(EARLY_START)).toBe(true);        // con clave se entra
    expect(cyberBloqueado(PUBLIC_OPEN - 1000)).toBe(true);
  });

  it('a las 20:00 abre sola y no vuelve a cerrar', () => {
    expect(cyberBloqueado(PUBLIC_OPEN)).toBe(false);
    expect(cyberBloqueado(en('2026-11-04T23:59:00-03:00'))).toBe(false);
    expect(cyberBloqueado(en('2026-12-01T12:00:00-03:00'))).toBe(false);
  });

  it('usa una cookie propia: la del gate de junio no abre esta puerta', () => {
    expect(COOKIE_CYBER).toBe('hype_cyber_access');
    expect(COOKIE_CYBER).not.toBe('hype_early_access');
    const mw = readFileSync(join(__dirname, '..', '..', 'middleware.ts'), 'utf8');
    expect(mw).not.toMatch(/cookies\.get\('hype_early_access'\)/);
    const api = readFileSync(join(__dirname, '..', '..', 'app', 'api', 'acceso', 'route.ts'), 'utf8');
    expect(api).toMatch(/hype_cyber_access/);
    expect(api).not.toMatch(/set\('hype_early_access'/);
  });

  it('el bloqueo no toca /api: un 302 ahí se comería webhooks y cobros ya hechos', () => {
    const mw = readFileSync(join(__dirname, '..', '..', 'middleware.ts'), 'utf8');
    // La exención tiene que estar ANTES de la decisión de bloquear.
    const iExencion = mw.indexOf("pathname.startsWith('/api/')");
    const iBloqueo = mw.indexOf('url.pathname = \'/acceso\'');
    expect(iExencion).toBeGreaterThan(-1);
    expect(iBloqueo).toBeGreaterThan(iExencion);
  });

  it('la contraseña no está en el código: sale de EARLY_ACCESS_PASSWORD', () => {
    const api = readFileSync(join(__dirname, '..', '..', 'app', 'api', 'acceso', 'route.ts'), 'utf8');
    expect(api).toMatch(/process\.env\.EARLY_ACCESS_PASSWORD/);
    // Fail closed: sin variable configurada no se abre la puerta.
    expect(api).toMatch(/if \(!correct\) return/);
    const page = readFileSync(join(__dirname, '..', '..', 'app', 'acceso', 'page.tsx'), 'utf8');
    expect(page).not.toMatch(/EARLY_ACCESS_PASSWORD/);
  });
});
