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
import { mediaToPostInput, toSnapshotInput } from './normalize';
import type { IgApiMedia, IgPostInput, IgSnapshotInput } from './types';

export type SyncBatch = {
  /** Upserts de publicaciones (campos observados). */
  posts: IgPostInput[];
  /** Lecturas de métricas de esta corrida. */
  snapshots: IgSnapshotInput[];
  /** Qué se salteó y por qué — el reporte de huecos del backfill. */
  skipped: Array<{ id: string; reason: string }>;
  /** Cursor para seguir paginando hacia atrás, o null si no hay más. */
  nextAfter: string | null;
};

type FetchLike = typeof fetch;

const HOUR_MS = 3_600_000;

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

/**
 * Normaliza una tanda de media y le lee insights a los que correspondan.
 *
 * Un post problemático no tumba la corrida: queda en `skipped` con el motivo.
 * La excepción son los errores de token/permiso (190 / 10): esos se tiran,
 * porque seguir sólo acumularía huecos que parecerían "posts sin datos".
 */
export async function collectBatch(
  mediaList: IgApiMedia[],
  opts: {
    now: Date;
    /** Si un media amerita leer insights (además del upsert del post). */
    wantInsights: (media: IgApiMedia) => boolean;
    throttleMs: number;
    fetchImpl?: FetchLike;
  },
): Promise<Omit<SyncBatch, 'nextAfter'>> {
  const posts: IgPostInput[] = [];
  const snapshots: IgSnapshotInput[] = [];
  const skipped: Array<{ id: string; reason: string }> = [];

  for (const media of mediaList) {
    const post = mediaToPostInput(media);
    if (!post) {
      skipped.push({ id: media.id ?? '?', reason: 'media incompleto (sin fecha o tipo)' });
      continue;
    }
    posts.push(post);

    if (!opts.wantInsights(media)) continue;

    try {
      const insights = await fetchMediaInsights(
        media.id,
        media.media_product_type ?? '',
        opts.fetchImpl ?? fetch,
      );
      snapshots.push(toSnapshotInput(media, insights, opts.now));
    } catch (err) {
      if (err instanceof IgApiError && (err.code === 190 || err.code === 10)) throw err;
      const detail = err instanceof Error ? err.message : String(err);
      skipped.push({ id: media.id, reason: `insights: ${detail}` });
    }
    await sleep(opts.throttleMs);
  }

  return { posts, snapshots, skipped };
}

/**
 * Corrida "recent": una página de los últimos posts. Upsertea TODOS (mantiene
 * like_count/comments_count frescos sin llamadas extra) y lee insights sólo
 * de los que están en ventana según `shouldRefresh`.
 */
export async function runRecentSync(
  opts: { daily?: boolean; limit?: number; now?: Date; throttleMs?: number; fetchImpl?: FetchLike } = {},
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
  });

  return { ...batch, nextAfter: null };
}

/**
 * Una página del backfill histórico, reanudable por cursor. Lee insights de
 * FEED y REELS; las stories viejas se saltean (sus métricas murieron a las
 * 24 h — limitación de Meta, queda reportado como hueco).
 */
export async function runBackfillPage(
  opts: { after?: string; limit?: number; now?: Date; throttleMs?: number; fetchImpl?: FetchLike } = {},
): Promise<SyncBatch> {
  const now = opts.now ?? new Date();

  const page = await fetchMediaPage({
    after: opts.after,
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
  });

  for (const media of page.items) {
    if (media.media_product_type === 'STORY') {
      const age = ageHoursOf(media, now);
      if (age != null && age > 24) {
        batch.skipped.push({ id: media.id, reason: 'story vencida: Meta no conserva sus métricas' });
      }
    }
  }

  return { ...batch, nextAfter: page.after };
}
