/**
 * Normalización: de las respuestas crudas de la Graph API al contrato del
 * mu-plugin (`ig-posts/bulk` y `ig-snapshots/bulk`). Funciones puras,
 * cubiertas por tests/unit/ig-insights.test.ts.
 */

import type { IgApiMedia, IgInsightsValues, IgPostInput, IgSnapshotInput } from './types';

/** '2026-10-13T22:35:01+0000' → '2026-10-13 22:35:01' (UTC), o null si no parsea. */
export function toMysqlUtc(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

/** Entero ≥ 0, o null. Ausente/raro NUNCA se convierte en 0. */
function asCount(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return null;
  return Math.round(v);
}

/**
 * Media de la API → item del bulk de publicaciones (sólo observados).
 * Devuelve null si al media le falta lo esencial (id, fecha o tipo): mejor
 * saltearlo y que quede reportado como hueco, antes que guardar una fila coja.
 */
export function mediaToPostInput(media: IgApiMedia): IgPostInput | null {
  const publishedAt = toMysqlUtc(media.timestamp);
  if (!media.id || !publishedAt || !media.media_type || !media.media_product_type) return null;

  const children =
    media.children?.data
      ?.filter((c): c is { id: string; media_type?: string } => Boolean(c?.id))
      .map((c) => ({ id: c.id, mediaType: c.media_type ?? null })) ?? null;

  return {
    igMediaId: media.id,
    publishedAt,
    mediaType: media.media_type,
    mediaProductType: media.media_product_type,
    permalink: media.permalink ?? '',
    caption: media.caption ?? null,
    // El campo sólo viene en reels: ausente es "no aplica", no "no compartido".
    isSharedToFeed: typeof media.is_shared_to_feed === 'boolean' ? media.is_shared_to_feed : null,
    mediaCount: children && children.length > 0 ? children.length : 1,
    likeCount: asCount(media.like_count),
    commentsCount: asCount(media.comments_count),
    children: children && children.length > 0 ? children : null,
  };
}

/**
 * Media + insights → snapshot para el bulk. Los insights de la Graph API son
 * acumulados lifetime: la curva temporal la construye el sync guardando una
 * de estas filas por corrida.
 *
 * likes/comments salen del media (tiempo real); el resto, de `/insights`.
 */
export function toSnapshotInput(
  media: IgApiMedia,
  insights: IgInsightsValues,
  takenAt: Date,
): IgSnapshotInput {
  const publishedMs = media.timestamp ? new Date(media.timestamp).getTime() : NaN;
  const ageHours = Number.isNaN(publishedMs)
    ? null
    : Math.max(0, Math.floor((takenAt.getTime() - publishedMs) / 3_600_000));

  return {
    igMediaId: media.id,
    takenAt: toMysqlUtc(takenAt.toISOString()) as string,
    ageHours,
    metrics: {
      views: asCount(insights.views),
      reach: asCount(insights.reach),
      likes: asCount(media.like_count),
      comments: asCount(media.comments_count),
      saved: asCount(insights.saved),
      shares: asCount(insights.shares),
      reposts: asCount(insights.reposts),
      totalInteractions: asCount(insights.total_interactions),
      profileVisits: asCount(insights.profile_visits),
      follows: asCount(insights.follows),
      avgWatchTimeMs: asCount(insights.ig_reels_avg_watch_time),
      videoViewTotalTimeMs: asCount(insights.ig_reels_video_view_total_time),
    },
  };
}
