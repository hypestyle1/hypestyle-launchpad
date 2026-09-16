// Helpers de texto para las reglas. Plantillas deterministas en hora argentina.

import { AR_OFFSET_MINUTES } from '@/lib/dashboard/periods';

export { fmtARS } from '@/lib/admin-format';

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** "jue 11/09" en hora argentina. */
export function arDayLabel(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '';
  const d = new Date(ms + AR_OFFSET_MINUTES * 60_000);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${DIAS[d.getUTCDay()]} ${dd}/${mm}`;
}

/** "YYYY-MM-DD" del instante en hora argentina. */
export function arDateKey(ms: number): string {
  const d = new Date(ms + AR_OFFSET_MINUTES * 60_000);
  return d.toISOString().slice(0, 10);
}

/** "YYYY-MM-DDTHH:mm:ss" en hora argentina: el formato que Woo espera en `after`. */
export function arLocalISO(ms: number): string {
  return new Date(ms + AR_OFFSET_MINUTES * 60_000).toISOString().slice(0, 19);
}

export function hoursBetween(fromISO: string, now: Date): number {
  const ms = Date.parse(fromISO);
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, (now.getTime() - ms) / 3_600_000);
}

/** "hace 6 h" / "hace 3 días". */
export function fmtAgo(hours: number): string {
  if (hours < 1) return 'hace menos de 1 h';
  if (hours < 48) return `hace ${Math.round(hours)} h`;
  return `hace ${Math.floor(hours / 24)} días`;
}

export function fmtRatio(n: number | null): string {
  return n == null ? '—' : `${n.toFixed(2).replace('.', ',')}×`;
}

export function plural(n: number, uno: string, varios: string): string {
  return n === 1 ? uno : varios;
}
