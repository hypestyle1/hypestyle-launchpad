/**
 * Orquestación del sync y del backfill de Content Intelligence (PR-2/PR-3).
 *
 * Lee de Meta con el cliente (`client.ts`) y arma los lotes que entiende el
 * mu-plugin `hypestyle-ig-insights.php`. Acá NO se escribe nada en ningún
 * lado: la escritura vive en `wp-store.ts` y sólo la usa la ruta de sync en
 * modo write (apagado por env hasta el gate B2).
 *
 * Estrategia de frescura (doc 03 de la propuesta): la Graph API devuelve
 * acumulados lifetime, así que la curva de un post se construye guardando una
 * lectura por corrida. Corrida horaria → posts de <72 h (marcas ~2h/24h/72h);
 * con `daily` → también los de <30 días (marcas 7d/30d).
 */

import { fetchMediaInsights, fetchMediaPage, IgApiError } from './client';
import { BACKOFF_MS, classifyIgFailure, describeFailure, type IgFailureKind } from './errors';
import { mediaToPostInput, toSnapshotInput } from './normalize';
import type { IgApiMedia, IgPostInput, IgSnapshotInput } from './types';

/** Motivo por el que una publicación no aportó métricas en esta corrida. */
export type SyncGap = {
  id: string;
  reason: string;
  kind: IgFailureKind | 'media-incompleto' | 'story-vencida' | 'presupuesto';
};

export type SyncBatch = {
  /** Upserts de publicaciones (campos observados). */
  posts: IgPostInput[];
  /** Lecturas de métricas de esta corrida. */
  snapshots: IgSnapshotInput[];
  /**
   * Huecos DEFINITIVOS: la publicación se guarda y su falta de métricas es
   * dato real (story vencida, métrica inexistente, media borrado).
   */
  skipped: SyncGap[];
  /**
   * Lo que NO se leyó y hay que volver a buscar: errores temporales y
   * publicaciones que quedaron fuera del presupuesto de tiempo. Estas
   * publicaciones NO se escriben, para que un corte no deje una fila que
   * parezca "publicación sin insights".
   */
  pendientes: SyncGap[];
  /** Cursor para seguir paginando hacia atrás, o null si no hay más. */
  nextAfter: string | null;
  /** true sólo si la página se consumió entera y sin pendientes. */
  complete: boolean;
  /**
   * Cómo retomar si `complete` es false. `after` repite la misma página;
   * `until` (unix seconds) arranca en la última publicación resuelta, que es
   * el camino recomendado porque no depende de que el cursor siga vivo.
   */
  resume: { after: string | null; until: string | null };
  stats: { insightCalls: number; unsupported: string[]; elapsedMs: number };
};

type FetchLike = typeof fetch;

const HOUR_MS = 3_600_000;

/**
 * Costo estimado de leer una publicación: throttle + latencia de Meta. Se usa
 * para decidir si todavía entra dentro del presupuesto de la corrida. Medido
 * en el backfill dry del 17/10 (~400 ms de latencia por llamada).
 */
const COSTO_POR_POST_MS = 1_200;

/** Edad en horas al momento `now`, o null si el media no trae fecha. */
export function ageHoursOf(media: IgApiMedia, now: Date): number | null {
  if (!media.timestamp) return null;
  const published = new Date(media.timestamp).getTime();
  if (Number.isNaN(published)) return null;
  return Math.max(0, (now.getTime() - published) / HOUR_MS);
}

/**
 * Si corresponde leer insights de este media en una corrida "recent".
 * Las stories entran mientras viven (sus métricas duran 24 h).
 */
export function shouldRefresh(media: IgApiMedia, now: Date, daily: boolean): boolean {
  if (media.media_product_type === 'AD') return false;
  const age = ageHoursOf(media, now);
  if (age == null) return false;
  if (media.media_product_type === 'STORY') return age <= 24;
  if (age <= 72) return true;
  return daily && age <= 30 * 24;
}

const sleep = (ms: number) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

export type CollectResult = Omit<SyncBatch, 'nextAfter' | 'complete' | 'resume'> & {
  /** true si se cortó por presupuesto de tiempo antes de terminar la tanda. */
  stoppedEarly: boolean;
  /** Unix seconds de la publicación más vieja resuelta (para retomar con `until`). */
  oldestResolved: number | null;
};

/**
 * Normaliza una tanda de media y le lee insights a los que correspondan.
 *
 * Reglas (correcciones C1 y C2 de la auditoría):
 *
 *  1. El upsert de una publicación que ESPERA métricas se encola recién
 *     después de resolver su lectura. Así un corte por tiempo no deja filas
 *     que parezcan "publicación sin insights" sin haberlo intentado nunca.
 *  2. Token, permiso y rate limit cortan la corrida (se tira el error). Seguir
 *     después de un rate limit sólo convierte el resto de la página en huecos
 *     falsos.
 *  3. Los errores temporales se reintentan con backoff y, si no salen, quedan
 *     en `pendientes` — nada se escribe por ellos.
 *  4. Lo que es hueco de verdad (métrica inexistente, media borrado) va a
 *     `skipped` y la publicación se guarda igual: la ausencia es dato.
 */
export async function collectBatch(
  mediaList: IgApiMedia[],
  opts: {
    now: Date;
    /** Si un media amerita leer insights (además del upsert del post). */
    wantInsights: (media: IgApiMedia) => boolean;
    throttleMs: number;
    fetchImpl?: FetchLike;
    /** Instante (ms epoch) en el que hay que haber terminado de leer de Meta. */
    deadlineAt?: number;
    /** Esperas entre reintentos de un error temporal. */
    backoffMs?: number[];
  },
): Promise<CollectResult> {
  const posts: IgPostInput[] = [];
  const snapshots: IgSnapshotInput[] = [];
  const skipped: SyncGap[] = [];
  const pendientes: SyncGap[] = [];
  const backoff = opts.backoffMs ?? BACKOFF_MS;
  const unsupported = new Set<string>();

  const comenzo = Date.now();
  let insightCalls = 0;
  let stoppedEarly = false;
  let oldestResolved: number | null = null;

  const resuelto = (media: IgApiMedia) => {
    const t = media.timestamp ? new Date(media.timestamp).getTime() : NaN;
    if (Number.isNaN(t)) return;
    const seconds = Math.floor(t / 1000);
    if (oldestResolved == null || seconds < oldestResolved) oldestResolved = seconds;
  };

  for (const media of mediaList) {
    const post = mediaToPostInput(media);
    if (!post) {
      skipped.push({
        id: media.id ?? '?',
        reason: 'media incompleto (sin fecha o tipo)',
        kind: 'media-incompleto',
      });
      continue;
    }

    // Publicación de la que no se esperan métricas en esta corrida: el upsert
    // va solo (mantiene like_count/comments_count frescos sin llamadas extra).
    if (!opts.wantInsights(media)) {
      posts.push(post);
      resuelto(media);
      continue;
    }

    if (opts.deadlineAt != null && Date.now() + COSTO_POR_POST_MS > opts.deadlineAt) {
      stoppedEarly = true;
      pendientes.push({
        id: media.id,
        reason: 'no se leyó: se agotó el presupuesto de tiempo de la corrida',
        kind: 'presupuesto',
      });
      continue;
    }

    let intento = 0;
    for (;;) {
      try {
        const r = await fetchMediaInsights(
          media.id,
          media.media_product_type ?? '',
          opts.fetchImpl ?? fetch,
        );
        insightCalls += r.calls;
        for (const m of r.unsupported) unsupported.add(m);
        posts.push(post);
        snapshots.push(toSnapshotInput(media, r.values, opts.now));
        resuelto(media);
        break;
      } catch (err) {
        insightCalls++;
        const falla = classifyIgFailure(err);
        if (falla.abort) throw err instanceof IgApiError ? err : new Error(describeFailure(falla));
        if (falla.retry && intento < backoff.length) {
          await sleep(backoff[intento]);
          intento++;
          continue;
        }
        const gap: SyncGap = { id: media.id, reason: describeFailure(falla), kind: falla.kind };
        if (falla.durable) {
          // Hueco real: la publicación se guarda, su falta de métricas es dato.
          if (falla.kind !== 'inexistente') posts.push(post);
          skipped.push(gap);
          resuelto(media);
        } else {
          pendientes.push(gap);
        }
        break;
      }
    }

    await sleep(opts.throttleMs);
    if (opts.deadlineAt != null && Date.now() >= opts.deadlineAt) {
      stoppedEarly = true;
    }
  }

  return {
    posts,
    snapshots,
    skipped,
    pendientes,
    stoppedEarly,
    oldestResolved,
    stats: {
      insightCalls,
      unsupported: [...unsupported].sort(),
      elapsedMs: Date.now() - comenzo,
    },
  };
}

/**
 * Corrida "recent": una página de los últimos posts. Upsertea TODOS (mantiene
 * like_count/comments_count frescos sin llamadas extra) y lee insights sólo
 * de los que están en ventana según `shouldRefresh`.
 */
export async function runRecentSync(
  opts: {
    daily?: boolean;
    limit?: number;
    now?: Date;
    throttleMs?: number;
    fetchImpl?: FetchLike;
    deadlineAt?: number;
    backoffMs?: number[];
  } = {},
): Promise<SyncBatch> {
  const now = opts.now ?? new Date();
  const daily = opts.daily ?? false;

  const page = await fetchMediaPage({
    limit: opts.limit ?? 25,
    fetchImpl: opts.fetchImpl,
  });

  const batch = await collectBatch(page.items, {
    now,
    wantInsights: (m) => shouldRefresh(m, now, daily),
    throttleMs: opts.throttleMs ?? 350,
    fetchImpl: opts.fetchImpl,
    deadlineAt: opts.deadlineAt,
    backoffMs: opts.backoffMs,
  });

  return terminar(batch, { nextAfter: null, usedAfter: null });
}

/** Arma el SyncBatch final: completitud y forma de retomar. */
function terminar(
  batch: CollectResult,
  page: { nextAfter: string | null; usedAfter: string | null },
): SyncBatch {
  const complete = batch.pendientes.length === 0 && !batch.stoppedEarly;
  const { stoppedEarly: _s, oldestResolved, ...resto } = batch;
  return {
    ...resto,
    nextAfter: complete ? page.nextAfter : null,
    complete,
    resume: complete
      ? { after: page.nextAfter, until: null }
      : { after: page.usedAfter, until: oldestResolved == null ? null : String(oldestResolved) },
  };
}

/** Redondea hacia abajo a la hora en punto. */
function alaHora(d: Date): Date {
  return new Date(Math.floor(d.getTime() / HOUR_MS) * HOUR_MS);
}

/**
 * Una página del backfill histórico, reanudable. Lee insights de FEED y REELS;
 * las stories viejas se saltean (sus métricas murieron a las 24 h —
 * limitación de Meta, queda reportado como hueco).
 *
 * `taken_at` se redondea a la hora en punto a propósito: la clave única
 * (ig_media_id, taken_at) del mu-plugin convierte así en idempotente el
 * reintento de una página que se cortó, en lugar de dejar dos lecturas casi
 * idénticas de un acumulado lifetime separadas por minutos.
 */
export async function runBackfillPage(
  opts: {
    after?: string;
    /** Unix seconds o YYYY-MM-DD: arranca en publicaciones <= esa fecha. */
    until?: string;
    limit?: number;
    now?: Date;
    throttleMs?: number;
    fetchImpl?: FetchLike;
    deadlineAt?: number;
    backoffMs?: number[];
  } = {},
): Promise<SyncBatch> {
  const now = alaHora(opts.now ?? new Date());

  const page = await fetchMediaPage({
    after: opts.after,
    until: opts.until,
    limit: opts.limit ?? 25,
    fetchImpl: opts.fetchImpl,
  });

  const batch = await collectBatch(page.items, {
    now,
    wantInsights: (m) => {
      if (m.media_product_type !== 'FEED' && m.media_product_type !== 'REELS') return false;
      return true;
    },
    // Backfill más lento que el sync: son cientos de llamadas una única vez.
    throttleMs: opts.throttleMs ?? 600,
    fetchImpl: opts.fetchImpl,
    deadlineAt: opts.deadlineAt,
    backoffMs: opts.backoffMs,
  });

  for (const media of page.items) {
    if (media.media_product_type === 'STORY') {
      const age = ageHoursOf(media, now);
      if (age != null && age > 24) {
        batch.skipped.push({
          id: media.id,
          reason: 'story vencida: Meta no conserva sus métricas',
          kind: 'story-vencida',
        });
      }
    }
  }

  return terminar(batch, { nextAfter: page.after, usedAfter: opts.after ?? null });
}
