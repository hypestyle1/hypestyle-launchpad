/** Formateo es-AR para las vistas de Content Intelligence. */

const nfInt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

/** 24507 → '24.507'; null → '—' (dato no disponible, nunca un 0 inventado). */
export function fmtInt(v: number | null | undefined): string {
  return v == null ? '—' : nfInt.format(v);
}

/** 0.0432 → '4,3%'; null → '—'. */
export function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return (v * 100).toFixed(digits).replace('.', ',') + '%';
}

/** 2.14 → '2,1×'; null → '—'. */
export function fmtFactor(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return v.toFixed(1).replace('.', ',') + '×';
}

/** '2026-10-13 22:35:01' (UTC) → '13 oct' / '13 oct 25' si es de otro año. */
export function fmtFecha(publishedAt: string | null | undefined): string {
  if (!publishedAt) return '—';
  const d = new Date(publishedAt.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return '—';
  const sameYear = d.getUTCFullYear() === new Date().getUTCFullYear();
  return d.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: '2-digit' }),
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

/** 7638 ms → '7,6 s'. */
export function fmtSegundos(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—';
  return (ms / 1000).toFixed(1).replace('.', ',') + ' s';
}
