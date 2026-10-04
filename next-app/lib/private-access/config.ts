// Private Access — SS27 Part 01.
//
// La config vive en WordPress (option `hs_private_access_config` del
// mu-plugin hypestyle-private-access.php) y se edita desde /admin/private-access.
// Acá están los tipos, el default y las reglas puras de vigencia, que valen
// igual en el servidor y en los tests.
//
// Vigencia = override manual o (habilitado y dentro de la ventana). Se calcula
// en cada request: ningún cron decide si la preventa está abierta. El cron
// solo publica los productos al llegar la hora de apertura.

export type PrivateAccessOverride = 'auto' | 'force_on' | 'force_off';

export interface PrivateAccessConfig {
  enabled: boolean;
  /** Tag de Woo que identifica la colección (sin IDs hardcodeados). */
  collectionTag: string;
  collectionName: string;
  collectionSubtitle: string;
  /** ISO con offset. Argentina es -03:00 todo el año. */
  startAt: string;
  publicOpenAt: string;
  /** Fin del 20% off (la oferta programada de Woo). Informativo para el copy. */
  saleEndsAt: string;
  discountPct: number;
  override: PrivateAccessOverride;
  clearSaleOnOpen?: boolean;
  maxDevices?: number;
  /** Cuándo se publicaron los productos (null = todavía privados). */
  openedAt?: string | null;
  updatedAt?: string | null;
}

export const PRIVATE_ACCESS_PATH = '/private-access';
export const PRIVATE_ACCESS_COOKIE = 'hype_pa';
/** Cookie legible (sin datos) para que el cliente sepa que ya desbloqueó. */
export const PRIVATE_ACCESS_FLAG_COOKIE = 'hype_pa_ok';

export const DEFAULT_CONFIG: PrivateAccessConfig = {
  enabled: false,
  collectionTag: 'ss27-part-01',
  collectionName: 'Spring Summer 27',
  collectionSubtitle: 'Part 01',
  startAt: '2026-10-04T00:00:00-03:00',
  publicOpenAt: '2026-10-11T00:00:00-03:00',
  saleEndsAt: '2026-10-10T23:59:59-03:00',
  discountPct: 20,
  override: 'auto',
  clearSaleOnOpen: true,
  maxDevices: 6,
  openedAt: null,
};

/**
 * Modo mock (solo local): PRIVATE_ACCESS_MOCK=1 en .env.local. La preventa
 * queda siempre activa, `@test` es el único usuario autorizado y el catálogo
 * es el ficticio de lib/private-access/mock.ts. No habla con WordPress.
 * Variable de servidor a propósito: el browser nunca sabe si está en mock.
 */
export function isMockMode(): boolean {
  return process.env.PRIVATE_ACCESS_MOCK === '1';
}

export function isPrivateAccessActive(config: PrivateAccessConfig, now = Date.now()): boolean {
  if (config.override === 'force_off') return false;
  if (config.override === 'force_on') return true;
  if (isMockMode()) return true;
  if (!config.enabled) return false;
  const start = new Date(config.startAt).getTime();
  const open = new Date(config.publicOpenAt).getTime();
  return now >= start && now < open;
}

/** Ya abrió al público: los links privados redirigen a la ficha normal. */
export function isPublicOpen(config: PrivateAccessConfig, now = Date.now()): boolean {
  if (isMockMode()) return false;
  if (config.override === 'force_on') return false;
  return now >= new Date(config.publicOpenAt).getTime();
}

/** Usuario de IG normalizado: sin @, minúsculas, sin espacios ni puntos finales. */
export function normalizeHandle(raw: string): string {
  let h = String(raw ?? '').trim().toLowerCase().replace(/\s+/g, '');
  const link = h.match(/instagram\.com\/([^/?#]+)/);
  if (link) h = link[1];
  return h.replace(/^@+/, '').replace(/\.+$/, '');
}

export const HANDLE_RE = /^[a-z0-9._]{1,30}$/;

export function isValidHandle(handle: string): boolean {
  return HANDLE_RE.test(handle);
}

/** `04.10` → para el copy del banner y la colección. */
export function fmtDayMonth(iso: string): string {
  const d = new Date(iso);
  // Fecha en hora Argentina, sin depender del TZ del server.
  const ar = new Date(d.getTime() - 3 * 3600_000);
  return `${String(ar.getUTCDate()).padStart(2, '0')}.${String(ar.getUTCMonth() + 1).padStart(2, '0')}`;
}
