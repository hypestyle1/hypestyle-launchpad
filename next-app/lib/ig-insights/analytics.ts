/**
 * Estadística honesta para Content Intelligence (doc 03 de la propuesta):
 * medianas y percentiles por segmento —nunca promedios que un viral rompe—,
 * tamaño de muestra siempre visible, atípicos por 1,5×IQR y comparación de
 * períodos. Funciones puras, cubiertas por tests/unit/ig-analytics.test.ts.
 */

/** Debajo de esto un segmento no se compara: se muestra como "muestra chica". */
export const MIN_SAMPLE = 8;

/** Cuantil por interpolación lineal (p en 0..1). null si no hay datos. */
export function quantile(values: number[], p: number): number | null {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  const pos = (xs.length - 1) * Math.min(Math.max(p, 0), 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return xs[lo] + (xs[hi] - xs[lo]) * (pos - lo);
}

export const median = (values: number[]): number | null => quantile(values, 0.5);

export type SegmentSummary = {
  key: string;
  n: number;
  median: number | null;
  p25: number | null;
  p75: number | null;
  /** n < MIN_SAMPLE: se muestra, pero no sirve para sacar conclusiones. */
  smallSample: boolean;
};

/** Resumen de un grupo de valores (los null/NaN no cuentan para n). */
export function summarize(key: string, values: Array<number | null | undefined>): SegmentSummary {
  const xs = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  return {
    key,
    n: xs.length,
    median: median(xs),
    p25: quantile(xs, 0.25),
    p75: quantile(xs, 0.75),
    smallSample: xs.length < MIN_SAMPLE,
  };
}

/**
 * Items → resúmenes por segmento, ordenados por mediana descendente (los de
 * muestra chica al final, para que no encabecen un ranking que no sostienen).
 */
export function groupStats<T>(
  items: T[],
  keyOf: (item: T) => string | null,
  valueOf: (item: T) => number | null,
): SegmentSummary[] {
  const groups = new Map<string, Array<number | null>>();
  for (const item of items) {
    const key = keyOf(item);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(valueOf(item));
  }
  return [...groups.entries()]
    .map(([key, values]) => summarize(key, values))
    .sort((a, b) => {
      if (a.smallSample !== b.smallSample) return a.smallSample ? 1 : -1;
      return (b.median ?? -Infinity) - (a.median ?? -Infinity);
    });
}

/** Límites de atípicos por 1,5×IQR, o null con menos de MIN_SAMPLE datos. */
export function outlierBounds(values: number[]): { low: number; high: number } | null {
  const xs = values.filter((v) => Number.isFinite(v));
  if (xs.length < MIN_SAMPLE) return null;
  const p25 = quantile(xs, 0.25)!;
  const p75 = quantile(xs, 0.75)!;
  const iqr = p75 - p25;
  return { low: p25 - 1.5 * iqr, high: p75 + 1.5 * iqr };
}

/** Cuántas veces la mediana de su segmento hizo este post (1 = igual). */
export function factorVsMedian(value: number | null, med: number | null): number | null {
  if (value == null || med == null || med <= 0) return null;
  return value / med;
}

/** Variación relativa entre períodos, con el shape que espera DeltaBadge. */
export function periodDelta(
  current: number | null,
  previous: number | null,
): { absolute: number; pct: number | null } | null {
  if (current == null || previous == null) return null;
  return { absolute: current - previous, pct: previous !== 0 ? (current - previous) / previous : null };
}

/** true si `publishedAt` ('YYYY-MM-DD HH:MM:SS' UTC) cae en [desde, hasta). */
export function inRange(publishedAt: string, desde: Date, hasta: Date): boolean {
  const t = new Date(publishedAt.replace(' ', 'T') + 'Z').getTime();
  if (Number.isNaN(t)) return false;
  return t >= desde.getTime() && t < hasta.getTime();
}

/** El período anterior de la misma duración, pegado al actual. */
export function previousRange(desde: Date, hasta: Date): { desde: Date; hasta: Date } {
  const span = hasta.getTime() - desde.getTime();
  return { desde: new Date(desde.getTime() - span), hasta: desde };
}
