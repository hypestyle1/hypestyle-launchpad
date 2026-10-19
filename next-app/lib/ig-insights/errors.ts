/**
 * Clasificación de errores de la Graph API (corrección C2 de la auditoría
 * `_claude/propuestas/_content-intelligence-2026-10-17/10-auditoria-preproduccion.md`).
 *
 * El problema que resuelve: `sync.ts` abortaba sólo con 190/10 y todo lo demás
 * caía en el catch genérico, así que un rate limit (4/17/32/613) terminaba
 * escrito como "publicación sin insights". Un hueco por rate limit es
 * indistinguible de un hueco real, y los huecos reales son dato: por eso cada
 * error se clasifica antes de decidir si se corta, se reintenta o se registra.
 *
 * Las cinco situaciones que hay que poder distinguir:
 *   - `metrica`     → la API contestó pero una métrica no existe para este tipo
 *                     de publicación. No es un error de la corrida: el resto de
 *                     las métricas se guardan y la faltante queda en NULL.
 *   - `temporal`    → falla pasajera (5xx, red, códigos 1/2). Se reintenta con
 *                     backoff; si no sale, queda PENDIENTE (no es un hueco).
 *   - `rate-limit`  → Meta cortó por volumen. Corta la corrida: las ventanas de
 *                     rate limit de Meta son de ~1 hora, no se esperan adentro
 *                     de una función de Vercel.
 *   - `permiso`     → falta un permiso del token. Corta.
 *   - `token`       → token vencido/inválido. Corta.
 * Más dos casos que aparecieron en la auditoría del circuito:
 *   - `inexistente` → la publicación ya no existe en Meta (borrada entre el
 *                     listado y la lectura de métricas). Hueco definitivo.
 *   - `desconocido` → cualquier otra cosa. Se registra como hueco con el motivo
 *                     textual; nunca se silencia.
 */

/** Forma mínima que necesita el clasificador (la cumple `IgApiError`). */
type ErrorLike = {
  message?: string;
  code?: number | null;
  httpStatus?: number | null;
};

export type IgFailureKind =
  | 'token'
  | 'permiso'
  | 'rate-limit'
  | 'metrica'
  | 'inexistente'
  | 'temporal'
  | 'desconocido';

export type IgFailure = {
  kind: IgFailureKind;
  code: number | null;
  httpStatus: number | null;
  message: string;
  /** Corta la corrida entera: seguir sólo acumularía huecos falsos. */
  abort: boolean;
  /** Vale reintentar dentro de la misma corrida, con backoff. */
  retry: boolean;
  /** Si el hueco es definitivo (se escribe) o hay que volver (queda pendiente). */
  durable: boolean;
};

// Códigos de la Graph API. Fuente: doc 02 de la propuesta (relevamiento de la
// API) + la tabla de errores de Meta.
const TOKEN_CODES = new Set([190, 102, 463, 467, 464]);
const PERMISO_CODES = new Set([10, 3, 200, 104]);
const RATE_CODES = new Set([4, 17, 32, 613, 80001, 80002, 80003, 80004]);
const TEMPORAL_CODES = new Set([1, 2]);

/** Backoff por defecto para los errores temporales: dos reintentos cortos. */
export const BACKOFF_MS = [500, 1500];

const dice = (msg: string, ...fragmentos: string[]) =>
  fragmentos.some((f) => msg.toLowerCase().includes(f));

export function classifyIgFailure(err: unknown): IgFailure {
  const e = (err ?? {}) as ErrorLike;
  const message = String(e.message ?? err ?? 'error sin mensaje');
  const code = typeof e.code === 'number' ? e.code : null;
  const httpStatus = typeof e.httpStatus === 'number' ? e.httpStatus : null;

  const base = { code, httpStatus, message };

  if (code != null && TOKEN_CODES.has(code)) {
    return { ...base, kind: 'token', abort: true, retry: false, durable: false };
  }
  if (code != null && PERMISO_CODES.has(code)) {
    return { ...base, kind: 'permiso', abort: true, retry: false, durable: false };
  }
  if ((code != null && RATE_CODES.has(code)) || httpStatus === 429) {
    return { ...base, kind: 'rate-limit', abort: true, retry: false, durable: false };
  }
  if (code === 100) {
    // (#100) es ambiguo: métrica/campo no soportado, o objeto inexistente.
    const borrada = dice(message, 'does not exist', 'object with id', 'cannot be loaded');
    return borrada
      ? { ...base, kind: 'inexistente', abort: false, retry: false, durable: true }
      : { ...base, kind: 'metrica', abort: false, retry: false, durable: true };
  }
  if (
    (code != null && TEMPORAL_CODES.has(code)) ||
    (httpStatus != null && httpStatus >= 500) ||
    (code == null && httpStatus == null) || // error de red: fetch tira TypeError
    dice(message, 'temporarily unavailable', 'fetch failed', 'network', 'timeout', 'etimedout')
  ) {
    return { ...base, kind: 'temporal', abort: false, retry: true, durable: false };
  }
  return { ...base, kind: 'desconocido', abort: false, retry: false, durable: true };
}

/** Texto para el reporte de la corrida: siempre dice de qué tipo fue la falla. */
export function describeFailure(f: IgFailure): string {
  const etiquetas: Record<IgFailureKind, string> = {
    token: 'token inválido o vencido',
    permiso: 'falta de permiso del token',
    'rate-limit': 'rate limit de Meta',
    metrica: 'métrica no soportada para este tipo de publicación',
    inexistente: 'la publicación ya no existe en Meta',
    temporal: 'error temporal (se reintentó sin éxito)',
    desconocido: 'error no clasificado',
  };
  const codigo = f.code != null ? ` (#${f.code})` : f.httpStatus != null ? ` (HTTP ${f.httpStatus})` : '';
  return `${etiquetas[f.kind]}${codigo}: ${f.message}`;
}

/** Status HTTP con el que la ruta de sync responde cada clase de falla. */
export function statusForFailure(f: IgFailure): number {
  if (f.kind === 'rate-limit') return 429;
  if (f.kind === 'token' || f.kind === 'permiso') return 502;
  return 502;
}
