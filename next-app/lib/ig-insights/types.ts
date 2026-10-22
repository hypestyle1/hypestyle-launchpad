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

/** Snapshot como lo devuelve el mu-plugin (hs_ig_snapshot_to_api). */
export type IgSnapshotRecord = { takenAt: string; ageHours: number | null } & IgSnapshotMetrics;

/**
 * Publicación como la devuelve `GET hypestyle/v1/ig-posts`
 * (hs_ig_post_to_api + la última lectura de métricas en `latest`).
 */
export type IgPostRecord = {
  igMediaId: string;
  permalink: string;
  publishedAt: string;
  mediaType: string;
  mediaProductType: string;
  caption: string | null;
  isSharedToFeed: boolean | null;
  mediaCount: number;
  coverAttachmentId: number | null;
  /** Portada servida desde la biblioteca de WP; null hasta que B2 las descargue. */
  coverUrl: string | null;
  children: Array<{ id: string; mediaType?: string | null }> | null;
  likeCount: number | null;
  commentsCount: number | null;
  category: string;
  coverType: string;
  visualStyle: string;
  objective: string;
  scenario: string;
  hasModels: string;
  aiUsage: string;
  classifiedBy: string;
  classifiedAt: string | null;
  reviewState: string;
  wasBoosted: boolean;
  boostRef: string;
  contentItemId: number | null;
  campaignId: number | null;
  creatorId: number | null;
  productIds: number[];
  learnings: string | null;
  experimentId: number | null;
  updatedAt: string;
  latest: IgSnapshotRecord | null;
};
