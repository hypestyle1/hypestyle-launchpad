import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Candado del aviso de seguimiento al cliente.
 *
 * El mu-plugin de WordPress (PHP/hypestyle-tracking-fix.php, hs_maybe_notify_tracking)
 * llama a /api/admin/send-order-emails con `x-admin-key: HYPESTYLE_SECRET`, que es
 * WP_SECRET. Cuando la clave del panel (ADMIN_SECRET) se separó de WP_SECRET, esa
 * llamada empezó a volver 401 y la función devuelve false sin loguear: el cliente
 * dejó de recibir el mail con la guía y nadie se enteró durante dos meses.
 *
 * Verificado contra producción el 25/10/2026:
 *   - WP acepta WP_SECRET en hs/v1/tracking-meta (200) y rechaza ADMIN_SECRET (401)
 *     -> WP manda WP_SECRET;
 *   - hypestyle.com.ar/api/admin/send-order-emails devuelve 401 con WP_SECRET
 *     y pasa con ADMIN_SECRET;
 *   - el último _tracking_notified es del 25/08/2026.
 *
 * Si alguien vuelve a cerrar este endpoint sólo a ADMIN_SECRET, estos tests fallan.
 */

const CLAVE_PANEL = 'clave-del-panel-0123456789';
const CLAVE_WP    = 'clave-de-wordpress-ABCDEFGHI';

async function cargar() {
  vi.resetModules();
  return import('@/lib/admin-auth');
}

const req = (key: string | null) =>
  ({ headers: { get: (h: string) => (h === 'x-admin-key' ? key : null) } }) as never;

beforeEach(() => {
  vi.stubEnv('ADMIN_SECRET', CLAVE_PANEL);
  vi.stubEnv('WP_SECRET', CLAVE_WP);
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('la clave de WordPress vale como credencial de máquina', () => {
  it('la clave del panel sigue valiendo', async () => {
    const { isAdminOrMachineRequest, isAdminRequest } = await cargar();
    expect(isAdminRequest(req(CLAVE_PANEL))).toBe(true);
    expect(isAdminOrMachineRequest(req(CLAVE_PANEL))).toBe(true);
  });

  it('la clave de WordPress pasa para las llamadas de máquina', async () => {
    const { isAdminOrMachineRequest, machineSecretMatches } = await cargar();
    expect(machineSecretMatches(CLAVE_WP)).toBe(true);
    expect(isAdminOrMachineRequest(req(CLAVE_WP))).toBe(true);
  });

  it('la clave de WordPress NO abre las pantallas del panel', async () => {
    const { isAdminRequest } = await cargar();
    expect(isAdminRequest(req(CLAVE_WP))).toBe(false);
  });

  it('cualquier otra cosa no pasa', async () => {
    const { isAdminOrMachineRequest, machineSecretMatches } = await cargar();
    for (const basura of ['', 'hs2026', CLAVE_WP + 'x', CLAVE_PANEL.slice(0, -1), null]) {
      expect(isAdminOrMachineRequest(req(basura as string | null))).toBe(false);
    }
    expect(machineSecretMatches(undefined)).toBe(false);
  });

  it('sin WP_SECRET configurado no autoriza a nadie (fail closed)', async () => {
    vi.stubEnv('WP_SECRET', '');
    const { machineSecretMatches, isAdminOrMachineRequest } = await cargar();
    expect(machineSecretMatches('')).toBe(false);
    expect(isAdminOrMachineRequest(req(''))).toBe(false);
    expect(isAdminOrMachineRequest(req(CLAVE_PANEL))).toBe(true);
  });
});
