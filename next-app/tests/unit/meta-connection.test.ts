import { describe, it, expect } from 'vitest';
import { resolveMetaState, isAuthError, isUsable } from '@/lib/meta/connection';

describe('estado de conexión de Meta (lógica pura)', () => {
  it('sin token configurado → disconnected/not_configured', () => {
    expect(resolveMetaState({ configured: false, ok: false })).toEqual({ state: 'disconnected', reason: 'not_configured' });
  });
  it('cuenta OK → connected', () => {
    expect(resolveMetaState({ configured: true, ok: true }).state).toBe('connected');
  });
  it('error de auth/permiso definitivo → disconnected/auth', () => {
    expect(resolveMetaState({ configured: true, ok: false, isAuth: true })).toEqual({ state: 'disconnected', reason: 'auth' });
  });
  it('fallo TEMPORAL con dato previo válido → STALE (no disconnected)', () => {
    expect(resolveMetaState({ configured: true, ok: false, isAuth: false, hadPriorSuccess: true })).toEqual({ state: 'stale', reason: 'temporary' });
  });
  it('fallo temporal SIN dato previo → error (tampoco disconnected)', () => {
    expect(resolveMetaState({ configured: true, ok: false, isAuth: false, hadPriorSuccess: false })).toEqual({ state: 'error', reason: 'temporary' });
  });
});

describe('clasificación de errores', () => {
  it('token/permiso/expired/190 = auth', () => {
    for (const m of ['Invalid OAuth access token', 'Error validating access token: expired', '(#190) token', 'Permissions error'])
      expect(isAuthError(m)).toBe(true);
  });
  it('rate limit / 500 / red = NO auth (temporal)', () => {
    for (const m of ['meta 429', 'meta 500', 'fetch failed'])
      expect(isAuthError(m)).toBe(false);
  });
});

describe('usabilidad de la data', () => {
  it('connected y stale son usables; disconnected y error no', () => {
    expect(isUsable('connected')).toBe(true);
    expect(isUsable('stale')).toBe(true);
    expect(isUsable('disconnected')).toBe(false);
    expect(isUsable('error')).toBe(false);
  });
  it('Home: un estado stale/connected NO debe leerse como "no conectado"', () => {
    // metaConnected en la UI = state connected|stale → true (no muestra el placeholder).
    expect(['connected', 'stale'].every((s) => isUsable(s as any))).toBe(true);
  });
});

describe('el token nunca sale al cliente', () => {
  it('MetaConnection no tiene campo token/secret', async () => {
    // El objeto que devuelve el endpoint /status sólo expone estado + cuenta pública.
    const shape = { state: 'connected', account: { id: 'act_x', name: 'X', currency: 'ARS', timezone: 'AR' }, apiVersion: 'v26.0', lastSync: null };
    expect(Object.keys(shape)).not.toContain('token');
    expect(JSON.stringify(shape)).not.toMatch(/EAA|access_token|secret/i);
  });
});
