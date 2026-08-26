// Rangos de fecha del Dashboard. Todo el panel usa el MISMO período: se resuelve
// una vez acá y se pasa a las métricas y al chart. No se calculan rangos sueltos
// por componente.
//
// Timezone: la tienda opera en Argentina (America/Argentina/Buenos_Aires), que es
// UTC−03 fijo (sin horario de verano desde 2009). Se trabaja con ese offset fijo
// en vez de arrastrar una librería de tz. Las fechas de WooCommerce se comparan
// siempre en su forma GMT convertida a hora argentina, para no mezclar husos.

export const AR_OFFSET_MINUTES = -180; // UTC−03

export type PresetId =
  | 'today' | 'yesterday' | 'last7' | 'last30'
  | 'thisMonth' | 'prevMonth' | 'thisYear' | 'custom';

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: 'today',     label: 'Hoy' },
  { id: 'yesterday', label: 'Ayer' },
  { id: 'last7',     label: 'Últimos 7 días' },
  { id: 'last30',    label: 'Últimos 30 días' },
  { id: 'thisMonth', label: 'Este mes' },
  { id: 'prevMonth', label: 'Mes anterior' },
  { id: 'thisYear',  label: 'Este año' },
  { id: 'custom',    label: 'Personalizado' },
];

export type Granularity = 'hour' | 'day' | 'week';

export interface Range {
  /** Inicio inclusivo, instante UTC (ISO). */
  startUTC: string;
  /** Fin exclusivo, instante UTC (ISO). */
  endUTC: string;
}

/** ms de un instante UTC dado, para un "muro de reloj" en hora argentina. */
function arWallToUTC(y: number, m: number, d: number, hh = 0, mm = 0, ss = 0): Date {
  // La hora de pared AR = UTC + AR_OFFSET. Para obtener el UTC correspondiente
  // restamos el offset: UTC = wall − offset. offset es −180, así que UTC = wall + 180min.
  const asIfUTC = Date.UTC(y, m, d, hh, mm, ss);
  return new Date(asIfUTC - AR_OFFSET_MINUTES * 60_000);
}

/** Componentes de fecha (año/mes/día/hora) de un instante, en hora argentina. */
export function toARParts(utc: Date): { y: number; m: number; d: number; hh: number } {
  const shifted = new Date(utc.getTime() + AR_OFFSET_MINUTES * 60_000);
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth(), d: shifted.getUTCDate(), hh: shifted.getUTCHours() };
}

/**
 * Resuelve un preset a un rango [startUTC, endUTC). `now` se inyecta (no se usa
 * Date.now() interno) para poder testear determinísticamente.
 */
export function resolvePreset(preset: PresetId, now: Date, custom?: { start?: string; end?: string }): Range {
  const t = toARParts(now);

  const dayStart = (y: number, m: number, d: number) => arWallToUTC(y, m, d, 0, 0, 0);
  const dayEnd   = (y: number, m: number, d: number) => arWallToUTC(y, m, d, 23, 59, 59); // se ajusta abajo a exclusivo

  const startOfToday = dayStart(t.y, t.m, t.d);
  const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 3600_000);

  switch (preset) {
    case 'today':
      return { startUTC: startOfToday.toISOString(), endUTC: startOfTomorrow.toISOString() };
    case 'yesterday': {
      const startY = new Date(startOfToday.getTime() - 24 * 3600_000);
      return { startUTC: startY.toISOString(), endUTC: startOfToday.toISOString() };
    }
    case 'last7': {
      const s = new Date(startOfToday.getTime() - 6 * 24 * 3600_000);
      return { startUTC: s.toISOString(), endUTC: startOfTomorrow.toISOString() };
    }
    case 'last30': {
      const s = new Date(startOfToday.getTime() - 29 * 24 * 3600_000);
      return { startUTC: s.toISOString(), endUTC: startOfTomorrow.toISOString() };
    }
    case 'thisMonth': {
      const s = dayStart(t.y, t.m, 1);
      const nextMonth = arWallToUTC(t.m === 11 ? t.y + 1 : t.y, t.m === 11 ? 0 : t.m + 1, 1);
      return { startUTC: s.toISOString(), endUTC: nextMonth.toISOString() };
    }
    case 'prevMonth': {
      const py = t.m === 0 ? t.y - 1 : t.y;
      const pm = t.m === 0 ? 11 : t.m - 1;
      const s = arWallToUTC(py, pm, 1);
      const thisMonthStart = arWallToUTC(t.y, t.m, 1);
      return { startUTC: s.toISOString(), endUTC: thisMonthStart.toISOString() };
    }
    case 'thisYear': {
      const s = arWallToUTC(t.y, 0, 1);
      const nextYear = arWallToUTC(t.y + 1, 0, 1);
      return { startUTC: s.toISOString(), endUTC: nextYear.toISOString() };
    }
    case 'custom': {
      // custom.start / custom.end son fechas AR (YYYY-MM-DD) inclusivas.
      const [sy, sm, sd] = (custom?.start || '').split('-').map(Number);
      const [ey, em, ed] = (custom?.end || '').split('-').map(Number);
      const s = sy ? arWallToUTC(sy, sm - 1, sd) : startOfToday;
      const e = ey ? new Date(arWallToUTC(ey, em - 1, ed).getTime() + 24 * 3600_000) : startOfTomorrow;
      return { startUTC: s.toISOString(), endUTC: e.toISOString() };
    }
  }
}

/** Período inmediatamente anterior, del mismo largo, para comparar. */
export function previousRange(range: Range): Range {
  const start = new Date(range.startUTC).getTime();
  const end = new Date(range.endUTC).getTime();
  const len = end - start;
  return {
    startUTC: new Date(start - len).toISOString(),
    endUTC: new Date(start).toISOString(),
  };
}

/** Granularidad del chart según el largo del rango. */
export function granularityFor(range: Range): Granularity {
  const days = (new Date(range.endUTC).getTime() - new Date(range.startUTC).getTime()) / (24 * 3600_000);
  if (days <= 1.5) return 'hour';
  if (days <= 45) return 'day';
  return 'week';
}

/** Clave de bucket (en hora AR) para un instante, según granularidad. */
export function bucketKey(utcISO: string, g: Granularity): string {
  const p = toARParts(new Date(utcISO));
  const pad = (n: number) => String(n).padStart(2, '0');
  if (g === 'hour') return `${p.y}-${pad(p.m + 1)}-${pad(p.d)}T${pad(p.hh)}`;
  if (g === 'day')  return `${p.y}-${pad(p.m + 1)}-${pad(p.d)}`;
  // week: lunes de la semana AR
  const base = new Date(arWallToUTC(p.y, p.m, p.d).getTime());
  const dow = (base.getUTCDay() + 6) % 7; // 0 = lunes
  const monday = new Date(base.getTime() - dow * 24 * 3600_000);
  const mp = toARParts(monday);
  return `${mp.y}-${pad(mp.m + 1)}-${pad(mp.d)}`;
}

/** Genera todos los buckets vacíos de un rango, en orden, para no dejar huecos en el chart. */
export function emptyBuckets(range: Range, g: Granularity): string[] {
  const out: string[] = [];
  const start = new Date(range.startUTC).getTime();
  const end = new Date(range.endUTC).getTime();
  const step = g === 'hour' ? 3600_000 : 24 * 3600_000;
  const seen = new Set<string>();
  for (let t = start; t < end; t += step) {
    const k = bucketKey(new Date(t).toISOString(), g);
    if (!seen.has(k)) { seen.add(k); out.push(k); }
  }
  return out;
}
