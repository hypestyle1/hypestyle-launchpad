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
 * development").
 *
 * Ante un (#100) NO se cae a `base` entera: se descarta solamente la métrica
 * que la API rechazó (ver `fetchMediaInsights`). La versión anterior tiraba
 * todo el grupo `optional` junto y por eso los reels del backfill de prueba
 * quedaron sin `reposts`, `profile_visits` ni `follows`: los arrastraba
 * `ig_reels_video_view_total_time`, que no existe para la cuenta.
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
 * Métricas que esta cuenta rechazó, por tipo de publicación. Se aprende en la
 * primera publicación de cada tipo y no se vuelve a pedir en la misma corrida:
 * sin esto, descartar métrica por métrica costaría varias llamadas extra por
 * reel en todo el backfill.
 */
const noSoportadas = new Map<string, Set<string>>();

/** Para los tests y para forzar un reaprendizaje entre corridas. */
export function resetMetricSupport(): void {
  noSoportadas.clear();
}

export function unsupportedMetrics(productType: string): string[] {
  return [...(noSoportadas.get(productType) ?? [])].sort();
}

function recordarNoSoportadas(productType: string, metricas: string[]): void {
  const set = noSoportadas.get(productType) ?? new Set<string>();
  for (const m of metricas) set.add(m);
  noSoportadas.set(productType, set);
}

/**
 * Qué métricas de las pedidas nombra el mensaje de error.
 *
 * Meta a veces dice cuál falló ("ig_reels_video_view_total_time is not valid
 * for this media type") y a veces contesta con la lista de valores válidos
 * ("metric must be one of the following values: …"). En el segundo caso el
 * mensaje contiene los nombres BUENOS, así que ahí no se extrae nada: se cae a
 * probar de a una.
 */
export function metricasNombradasEnError(message: string, pedidas: string[]): string[] {
  const msg = String(message).toLowerCase();
  if (msg.includes('must be one of') || msg.includes('one of the following')) return [];
  return pedidas.filter((m) => msg.includes(m.toLowerCase()));
}

/** Tope de llamadas a /insights por publicación (evita cascadas de sondeo). */
const MAX_INSIGHT_CALLS = 6;

export type IgInsightsResult = {
  /** Sólo lo que la API contestó con un número. Lo ausente queda en null aguas abajo. */
  values: IgInsightsValues;
  /** Métricas que la API rechazó para este tipo de publicación. */
  unsupported: string[];
  /** Todo lo que se pidió: `requested - values - unsupported` = pedido y sin dato. */
  requested: string[];
  /** Llamadas a /insights que costó esta publicación. */
  calls: number;
};

/**
 * Insights lifetime de una publicación.
 *
 * Garantía (corrección M1): una métrica no soportada NO invalida a las demás.
 * El camino es: pedir todo lo que se cree soportado → si la API rechaza con
 * (#100), descartar sólo la métrica nombrada y repetir → si no nombra ninguna,
 * asegurar `base` y después sondear las `optional` de a una. Cualquier otro
 * error se propaga: lo clasifica `sync.ts` con `classifyIgFailure`.
 *
 * Para STORY tener en cuenta que las métricas viven 24 h.
 */
export async function fetchMediaInsights(
  mediaId: string,
  productType: string,
  fetchImpl: FetchLike = fetch,
): Promise<IgInsightsResult> {
  const spec = INSIGHT_METRICS[productType as keyof typeof INSIGHT_METRICS];
  // AD u otro tipo sin insights orgánicos.
  if (!spec) return { values: {}, unsupported: [], requested: [], calls: 0 };

  const conocidas = noSoportadas.get(productType) ?? new Set<string>();
  const requested = [...spec.base, ...spec.optional];
  let pedidas = requested.filter((m) => !conocidas.has(m));
  let calls = 0;

  while (pedidas.length > 0 && calls < MAX_INSIGHT_CALLS) {
    try {
      const values = await requestInsights(mediaId, pedidas, fetchImpl);
      calls++;
      return { values, unsupported: unsupportedMetrics(productType), requested, calls };
    } catch (err) {
      calls++;
      if (!(err instanceof IgApiError) || err.code !== 100) throw err;
      const culpables = metricasNombradasEnError(err.message, pedidas);
      if (culpables.length === 0) break; // la API no dijo cuál: a sondear
      recordarNoSoportadas(productType, culpables);
      pedidas = pedidas.filter((m) => !culpables.includes(m));
    }
  }

  // Sondeo: primero `base` (verificada contra la cuenta real), después cada
  // `optional` por separado para no perder las que sí existen.
  const values: IgInsightsValues = {};
  const base = spec.base.filter((m) => !(noSoportadas.get(productType)?.has(m) ?? false));
  if (base.length > 0 && calls < MAX_INSIGHT_CALLS) {
    calls++;
    Object.assign(values, await requestInsights(mediaId, base, fetchImpl));
  }
  for (const metrica of spec.optional) {
    if (calls >= MAX_INSIGHT_CALLS) break;
    if (noSoportadas.get(productType)?.has(metrica)) continue;
    try {
      calls++;
      Object.assign(values, await requestInsights(mediaId, [metrica], fetchImpl));
    } catch (err) {
      if (err instanceof IgApiError && err.code === 100) {
        recordarNoSoportadas(productType, [metrica]);
        continue;
      }
      throw err; // token, permiso o rate limit: que lo vea el sync
    }
  }

  return { values, unsupported: unsupportedMetrics(productType), requested, calls };
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
