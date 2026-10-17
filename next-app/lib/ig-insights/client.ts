/**
 * Cliente de SOLO LECTURA de la Graph API para Content Intelligence.
 *
 * Mismo criterio que `lib/instagram.ts` (el feed del home): el token vive en
 * `INSTAGRAM_ACCESS_TOKEN` del lado del servidor y nunca llega al navegador.
 * Este cliente no escribe nada en Meta; lo que trae se persiste después en el
 * mu-plugin `hypestyle-ig-insights.php` vía `hypestyle/v1`.
 *
 * A diferencia del feed —que ante cualquier falla devuelve null y la sección
 * no se renderiza—, acá los errores SE TIRAN: el sync tiene que saber que una
 * corrida falló para no guardar datos a medias ni confundir "sin dato" con 0.
 */

import type { IgApiMedia, IgInsightsValues, IgMediaProductType } from './types';

// La versión va por env para poder subirla sin tocar código cuando Meta
// deprecie la actual (como pasó con impressions → views).
const GRAPH_VERSION = process.env.IG_INSIGHTS_GRAPH_VERSION || 'v23.0';
const DEFAULT_IG_USER_ID = '17841407079434471';

/** Campos del listado de media. `children` trae las fotos de cada carrusel. */
export const MEDIA_FIELDS = [
  'id',
  'permalink',
  'timestamp',
  'media_type',
  'media_product_type',
  'is_shared_to_feed',
  'caption',
  'media_url',
  'thumbnail_url',
  'like_count',
  'comments_count',
  'children{id,media_type,media_url,thumbnail_url}',
].join(',');

/**
 * Métricas de `/insights` por tipo de publicación.
 *
 * `base` está VERIFICADA contra la cuenta real (17/10/2026, carrusel y reel
 * respondieron con valores). `optional` es lo que Meta documenta pero no
 * probamos (reposts es de dic-2025; los totales de reels figuran "in
 * development"): si la API rechaza la lista completa con (#100), se reintenta
 * sólo con `base` — así una métrica nueva nunca tumba el sync.
 *
 * likes y comments NO van por insights: salen de los campos `like_count` /
 * `comments_count` del media, que son en tiempo real y están verificados.
 */
export const INSIGHT_METRICS: Record<
  Exclude<IgMediaProductType, 'AD'>,
  { base: string[]; optional: string[] }
> = {
  FEED: {
    base: ['views', 'reach', 'saved', 'shares', 'total_interactions', 'profile_visits', 'follows'],
    optional: ['reposts'],
  },
  REELS: {
    base: ['views', 'reach', 'saved', 'shares', 'total_interactions', 'ig_reels_avg_watch_time'],
    optional: ['reposts', 'ig_reels_video_view_total_time', 'profile_visits', 'follows'],
  },
  STORY: {
    base: ['views', 'reach', 'replies', 'shares', 'total_interactions'],
    optional: ['profile_visits', 'follows'],
  },
};

export class IgApiError extends Error {
  constructor(
    message: string,
    /** Código de error de la Graph API (100 = campo/métrica no soportada, 190 = token, 10 = permiso). */
    readonly code: number | null,
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = 'IgApiError';
  }
}

type FetchLike = typeof fetch;

function requireToken(): string {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) throw new Error('INSTAGRAM_ACCESS_TOKEN no está configurado');
  return token;
}

async function graphGet(
  path: string,
  params: Record<string, string>,
  fetchImpl: FetchLike,
): Promise<Record<string, unknown>> {
  const qs = new URLSearchParams({ ...params, access_token: requireToken() });
  const res = await fetchImpl(`https://graph.facebook.com/${GRAPH_VERSION}${path}?${qs}`, {
    cache: 'no-store',
  });
  const json = (await res.json().catch(() => null)) as {
    error?: { message?: string; code?: number };
  } | null;
  if (!res.ok || json?.error) {
    throw new IgApiError(
      json?.error?.message || `Graph API respondió ${res.status}`,
      json?.error?.code ?? null,
      res.status,
    );
  }
  if (!json) throw new IgApiError('Respuesta vacía de la Graph API', null, res.status);
  return json as Record<string, unknown>;
}

/**
 * Una página del historial de publicaciones, de la más nueva a la más vieja.
 * `after` (cursor de la respuesta anterior) pagina hacia atrás en el tiempo;
 * `since`/`until` (YYYY-MM-DD) acotan por fecha de publicación.
 */
export async function fetchMediaPage(
  opts: {
    after?: string;
    since?: string;
    until?: string;
    limit?: number;
    fetchImpl?: FetchLike;
  } = {},
): Promise<{ items: IgApiMedia[]; after: string | null }> {
  const userId = process.env.INSTAGRAM_USER_ID || DEFAULT_IG_USER_ID;
  const params: Record<string, string> = {
    fields: MEDIA_FIELDS,
    limit: String(Math.min(Math.max(opts.limit ?? 50, 1), 100)),
  };
  if (opts.after) params.after = opts.after;
  if (opts.since) params.since = opts.since;
  if (opts.until) params.until = opts.until;

  const json = await graphGet(`/${userId}/media`, params, opts.fetchImpl ?? fetch);
  const data = (json.data as IgApiMedia[] | undefined) ?? [];
  const paging = json.paging as { next?: string; cursors?: { after?: string } } | undefined;

  return {
    items: data.filter((m): m is IgApiMedia => Boolean(m?.id)),
    // El cursor sólo sirve si la API dice que hay página siguiente.
    after: paging?.next && paging.cursors?.after ? paging.cursors.after : null,
  };
}

/**
 * Insights lifetime de una publicación. Devuelve un mapa métrica → valor con
 * SOLO lo que la API contestó: lo ausente no aparece (y aguas abajo queda
 * en null, nunca en 0). Para STORY tener en cuenta que las métricas viven 24 h.
 */
export async function fetchMediaInsights(
  mediaId: string,
  productType: string,
  fetchImpl: FetchLike = fetch,
): Promise<IgInsightsValues> {
  const spec = INSIGHT_METRICS[productType as keyof typeof INSIGHT_METRICS];
  if (!spec) return {}; // AD u otro tipo sin insights orgánicos

  try {
    return await requestInsights(mediaId, [...spec.base, ...spec.optional], fetchImpl);
  } catch (err) {
    // (#100): alguna métrica optional no existe para esta cuenta/versión.
    if (err instanceof IgApiError && err.code === 100 && spec.optional.length > 0) {
      return requestInsights(mediaId, spec.base, fetchImpl);
    }
    throw err;
  }
}

async function requestInsights(
  mediaId: string,
  metrics: string[],
  fetchImpl: FetchLike,
): Promise<IgInsightsValues> {
  const json = await graphGet(`/${mediaId}/insights`, { metric: metrics.join(',') }, fetchImpl);
  const data = (json.data as Array<{ name?: string; values?: Array<{ value?: unknown }> }>) ?? [];

  const out: IgInsightsValues = {};
  for (const row of data) {
    const value = row.values?.[0]?.value;
    if (row.name && typeof value === 'number' && Number.isFinite(value)) {
      out[row.name] = value;
    }
  }
  return out;
}
