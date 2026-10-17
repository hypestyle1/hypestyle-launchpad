/**
 * Tipos del módulo de Content Intelligence: lectura de la Graph API de Meta
 * y contrato con el mu-plugin `hypestyle-ig-insights.php` (hypestyle/v1).
 *
 * Regla transversal: métrica ausente = null, NUNCA 0. La Graph API devuelve
 * un set vacío cuando no tiene el dato; 0 significa "medido y dio cero".
 */

export type IgMediaType = 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
export type IgMediaProductType = 'FEED' | 'REELS' | 'STORY' | 'AD';

/** Un media tal como lo devuelve la Graph API (los campos que pedimos). */
export type IgApiMedia = {
  id: string;
  permalink?: string;
  /** ISO 8601 con offset, p. ej. '2026-10-13T22:35:01+0000'. */
  timestamp?: string;
  media_type?: IgMediaType | string;
  media_product_type?: IgMediaProductType | string;
  /** Sólo viene en reels; false = trial reel o reel fuera de la grilla. */
  is_shared_to_feed?: boolean;
  caption?: string;
  media_url?: string;
  thumbnail_url?: string;
  like_count?: number;
  comments_count?: number;
  children?: {
    data?: Array<{ id?: string; media_type?: string; media_url?: string; thumbnail_url?: string }>;
  };
};

/** Valores crudos de `/insights`, por nombre de métrica de la API. */
export type IgInsightsValues = Record<string, number>;

/** Item de `POST hypestyle/v1/ig-posts/bulk` — SOLO campos observados. */
export type IgPostInput = {
  igMediaId: string;
  /** 'YYYY-MM-DD HH:MM:SS' en UTC. */
  publishedAt: string;
  mediaType: string;
  mediaProductType: string;
  permalink: string;
  caption: string | null;
  isSharedToFeed: boolean | null;
  mediaCount: number;
  likeCount: number | null;
  commentsCount: number | null;
  children: Array<{ id: string; mediaType: string | null }> | null;
};

export type IgSnapshotMetrics = {
  views: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  saved: number | null;
  shares: number | null;
  reposts: number | null;
  totalInteractions: number | null;
  profileVisits: number | null;
  follows: number | null;
  avgWatchTimeMs: number | null;
  videoViewTotalTimeMs: number | null;
};

/** Item de `POST hypestyle/v1/ig-snapshots/bulk`. */
export type IgSnapshotInput = {
  igMediaId: string;
  /** 'YYYY-MM-DD HH:MM:SS' en UTC. */
  takenAt: string;
  ageHours: number | null;
  metrics: IgSnapshotMetrics;
};
