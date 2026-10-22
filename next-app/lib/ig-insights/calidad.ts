/**
 * Control de calidad de las métricas históricas.
 *
 * El problema (medido el 19/10/2026 contra la cuenta real, 24 publicaciones
 * muestreadas): para las publicaciones viejas la Graph API devuelve un `reach`
 * implausible —un reel de 2021 informa alcance 7 con 4.232 views y 163 likes,
 * o sea 2.328% de likes sobre alcance— y `views = 0` en todo el feed anterior
 * a octubre de 2024, cuando esa métrica todavía no existía.
 *
 * Eso no lo cubría ninguna invariante del sistema: "métrica ausente = null,
 * nunca 0" habla de lo que falta, y acá la métrica **está presente y es
 * incorrecta**.
 *
 * Reglas de este módulo:
 *
 *  1. **No se borra ni se corrige nada.** El snapshot original queda intacto en
 *     la base y en la respuesta de la API. Esto es una lectura derivada.
 *  2. **El veredicto es por métrica, no por publicación.** Una lectura puede
 *     tener likes buenos y alcance no confiable; entonces los likes se usan y
 *     los ratios sobre alcance no.
 *  3. **No se decide por fecha.** El corte del 19/10/2024 salió de los datos,
 *     no al revés: las reglas de coherencia de abajo lo reproducen solas. La
 *     fecha queda como dato informativo (`epocaDegradada`) para contrastar,
 *     nunca como criterio de exclusión.
 *  4. **Todo motivo queda escrito.** Cada métrica excluida dice por qué, y el
 *     resumen por universo dice cuántas y por cuál regla.
 *  5. La regla está versionada: si cambian los umbrales, cambia
 *     `REGLA_CALIDAD_VERSION` y las conclusiones viejas se pueden contrastar.
 */

import type { IgPostRecord, IgSnapshotMetrics, IgSnapshotRecord } from './types';

export const REGLA_CALIDAD_VERSION = 1;

/**
 * Techo de views/alcance. Arriba de esto el alcance no es creíble: significaría
 * que cada cuenta alcanzada vio la publicación esa cantidad de veces.
 *
 * Medido: el peor caso creíble es 5,9 (feed) y 5,2 (reels); el mejor caso roto
 * es 10,0 (feed) y 21,7 (reels). Los reels llevan un techo más alto porque un
 * video corto en loop sí acumula repeticiones legítimas.
 */
export const UMBRAL_VIEWS_REACH: Record<string, number> = { FEED: 8, REELS: 12 };

/** Techo de likes/alcance. Medido: peor caso creíble 6,0%; mejor caso roto 11,4%. */
export const UMBRAL_LIKES_REACH = 0.25;

/** Techo de interacciones totales/alcance, como chequeo de coherencia extra. */
export const UMBRAL_INTERACCIONES_REACH = 0.5;

/**
 * Fecha a partir de la cual las lecturas de esta cuenta son coherentes. NO se
 * usa para excluir: sirve para contrastar que la regla y los datos coinciden.
 */
export const CORTE_OBSERVADO = '2024-10-19';

export type EstadoMetrica = 'ok' | 'ausente' | 'no-confiable';

export type CalidadMetrica = { estado: EstadoMetrica; motivo: string | null };

export type CalidadSnapshot = {
  /** Veredicto de la lectura completa. */
  estado: 'ok' | 'parcial' | 'sin-metricas';
  /** Una entrada por métrica del snapshot. */
  metricas: Partial<Record<keyof IgSnapshotMetrics, CalidadMetrica>>;
  /** Motivos únicos, para mostrar y para contar en el resumen. */
  motivos: string[];
  /** true si la publicación es anterior al corte observado (informativo). */
  epocaDegradada: boolean;
  regla: number;
};

const METRICAS_SNAPSHOT: Array<keyof IgSnapshotMetrics> = [
  'views', 'reach', 'likes', 'comments', 'saved', 'shares', 'reposts',
  'totalInteractions', 'profileVisits', 'follows', 'avgWatchTimeMs',
  'videoViewTotalTimeMs',
];

const pct = (v: number) => `${(v * 100).toFixed(1).replace('.', ',')}%`;
const num = (v: number) => v.toFixed(1).replace('.', ',');

/**
 * Evalúa una lectura. Devuelve el estado de cada métrica con su motivo.
 * No modifica nada.
 */
export function evaluarCalidad(
  post: Pick<IgPostRecord, 'mediaProductType' | 'publishedAt'>,
  snap: IgSnapshotRecord | null | undefined,
): CalidadSnapshot {
  const epocaDegradada = String(post.publishedAt ?? '') < CORTE_OBSERVADO;

  if (!snap) {
    return {
      estado: 'sin-metricas',
      metricas: {},
      motivos: [],
      epocaDegradada,
      regla: REGLA_CALIDAD_VERSION,
    };
  }

  const metricas: Partial<Record<keyof IgSnapshotMetrics, CalidadMetrica>> = {};
  for (const k of METRICAS_SNAPSHOT) {
    const v = snap[k];
    metricas[k] = v == null ? { estado: 'ausente', motivo: null } : { estado: 'ok', motivo: null };
  }

  const motivos: string[] = [];
  const marcar = (k: keyof IgSnapshotMetrics, motivo: string) => {
    const actual = metricas[k];
    if (!actual || actual.estado === 'ausente') return; // lo ausente ya es null
    if (actual.estado === 'no-confiable') return; // se queda con el primer motivo
    metricas[k] = { estado: 'no-confiable', motivo };
    if (!motivos.includes(motivo)) motivos.push(motivo);
  };

  const tipo = String(post.mediaProductType ?? '').toUpperCase();
  const { views, reach, likes, totalInteractions } = snap;

  // R1 — sin alcance no hay denominador.
  if (reach != null && reach <= 0) {
    marcar('reach', 'alcance informado en cero');
  }

  // R2 — views en 0 con gente que vio la publicación: la métrica no existía
  // para ese formato en esa época. Y una lectura de esa época tampoco trae un
  // alcance comparable con el de hoy.
  if (tipo !== 'STORY' && views === 0 && ((likes ?? 0) > 0 || (reach ?? 0) > 0)) {
    marcar('views', 'views en cero con interacciones: la métrica no estaba disponible, no es un cero medido');
    marcar('reach', 'lectura de una época sin views: el alcance no es comparable con el de hoy');
  }

  // R3 — repeticiones imposibles por cuenta alcanzada.
  const techo = UMBRAL_VIEWS_REACH[tipo] ?? UMBRAL_VIEWS_REACH.FEED;
  if (views != null && views > 0 && reach != null && reach > 0 && views / reach > techo) {
    marcar(
      'reach',
      `views/alcance = ${num(views / reach)} (máximo plausible ${techo}): el alcance está subinformado`,
    );
  }

  // R4 — reacción imposible sobre cuentas únicas.
  if (likes != null && likes > 0 && reach != null && reach > 0 && likes / reach > UMBRAL_LIKES_REACH) {
    marcar(
      'reach',
      `likes/alcance = ${pct(likes / reach)} (máximo plausible ${pct(UMBRAL_LIKES_REACH)})`,
    );
  }

  // R5 — coherencia con el total de interacciones que informa Meta.
  if (
    totalInteractions != null &&
    totalInteractions > 0 &&
    reach != null &&
    reach > 0 &&
    totalInteractions / reach > UMBRAL_INTERACCIONES_REACH
  ) {
    marcar(
      'reach',
      `interacciones/alcance = ${pct(totalInteractions / reach)} (máximo plausible ${pct(UMBRAL_INTERACCIONES_REACH)})`,
    );
  }

  const hayNoConfiable = Object.values(metricas).some((m) => m?.estado === 'no-confiable');

  return {
    estado: hayNoConfiable ? 'parcial' : 'ok',
    metricas,
    motivos,
    epocaDegradada,
    regla: REGLA_CALIDAD_VERSION,
  };
}

/**
 * La lectura con las métricas NO confiables puestas en null, para que todo lo
 * que calcula aguas abajo devuelva null por sí solo (los ratios ya tratan null
 * como "no se puede calcular"). El snapshot original no se toca.
 */
export function metricasUsables(
  post: Pick<IgPostRecord, 'mediaProductType' | 'publishedAt'>,
  snap: IgSnapshotRecord | null | undefined,
): Partial<IgSnapshotMetrics> {
  if (!snap) return {};
  const calidad = evaluarCalidad(post, snap);
  const out: Partial<IgSnapshotMetrics> = {};
  for (const k of METRICAS_SNAPSHOT) {
    out[k] = calidad.metricas[k]?.estado === 'ok' ? snap[k] : null;
  }
  return out;
}

/** Atajo para las pantallas y el motor: las métricas usables de una publicación. */
export function metricasDe(post: IgPostRecord): Partial<IgSnapshotMetrics> {
  return metricasUsables(post, post.latest);
}

/** ¿Esta publicación sirve para un análisis sobre alcance? */
export function tieneAlcanceConfiable(post: IgPostRecord): boolean {
  return metricasDe(post).reach != null;
}

export type ResumenCalidad = {
  total: number;
  sinMetricas: number;
  /** Con alcance confiable: el universo que entra a los ratios sobre alcance. */
  analizables: number;
  /** Con métricas, pero con el alcance descartado. */
  excluidas: number;
  /** Cuántas publicaciones por motivo. */
  porMotivo: Record<string, number>;
  /** Cuántas de las excluidas son anteriores al corte observado. */
  excluidasAnterioresAlCorte: number;
  /** Cuántas publicaciones anteriores al corte pasaron igual los controles. */
  anterioresAlCorteQuePasan: number;
  regla: number;
  corteObservado: string;
};

/** El universo analizado y el excluido, para mostrarlo siempre. */
export function resumenDeCalidad(posts: IgPostRecord[]): ResumenCalidad {
  const porMotivo: Record<string, number> = {};
  let sinMetricas = 0;
  let analizables = 0;
  let excluidas = 0;
  let excluidasAnterioresAlCorte = 0;
  let anterioresAlCorteQuePasan = 0;

  for (const p of posts) {
    const c = evaluarCalidad(p, p.latest);
    if (c.estado === 'sin-metricas') {
      sinMetricas++;
      continue;
    }
    const alcanceOk = c.metricas.reach?.estado === 'ok';
    if (alcanceOk) {
      analizables++;
      if (c.epocaDegradada) anterioresAlCorteQuePasan++;
    } else {
      excluidas++;
      if (c.epocaDegradada) excluidasAnterioresAlCorte++;
      for (const m of c.motivos) porMotivo[m] = (porMotivo[m] ?? 0) + 1;
    }
  }

  return {
    total: posts.length,
    sinMetricas,
    analizables,
    excluidas,
    porMotivo,
    excluidasAnterioresAlCorte,
    anterioresAlCorteQuePasan,
    regla: REGLA_CALIDAD_VERSION,
    corteObservado: CORTE_OBSERVADO,
  };
}

/** Una línea para el encabezado de cualquier pantalla o salida. */
export function avisoDeCalidad(r: ResumenCalidad): string | null {
  if (r.excluidas === 0 && r.sinMetricas === 0) return null;
  const partes: string[] = [];
  if (r.excluidas > 0) {
    partes.push(
      `${r.excluidas} con métricas históricas no confiables (excluidas de los ratios sobre alcance)`,
    );
  }
  if (r.sinMetricas > 0) partes.push(`${r.sinMetricas} sin insights`);
  return `Universo analizado: ${r.analizables} de ${r.total} publicaciones · ${partes.join(' · ')}.`;
}
