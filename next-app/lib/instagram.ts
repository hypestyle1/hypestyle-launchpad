/**
 * Feed de Instagram (@hypestylearg) para la sección de comunidad del home.
 *
 * Se pega contra la Instagram Graph API con un token propio en vez de usar un
 * widget de terceros: nada de scripts externos en el bundle y el token nunca
 * sale del servidor.
 *
 * Token: es el token de system user del Business Manager (el mismo tipo que ya
 * usan los scripts de META/), que NO expira — a diferencia de un token de
 * usuario o de página, que hay que renovar cada 60 días. Necesita el permiso
 * `instagram_basic` además de los que ya tenía; ver Hype/11 - Automatizaciones.
 *
 * Nunca tira: si el token venció, lo revocaron o la API de Meta falla, devuelve
 * null y la sección directamente no se renderiza. Es a propósito — el audit de
 * agosto (hallazgo 5.3) marcó que las fallas de API no deben disfrazarse de
 * otra cosa ni romper la página que las contiene.
 */

const GRAPH_VERSION = 'v21.0';

// El ID de la cuenta de IG Business no es un secreto (sale de la página de FB),
// así que va como default y la env var queda solo para poder cambiarlo sin deploy.
const DEFAULT_IG_USER_ID = '17841407079434471';

// El home es lo último que se renderiza en el build y ya hay antecedentes de
// deploys tumbados por un fetch lento (ver el ETIMEDOUT contra Hostinger). Si
// Meta no contesta en 6s se sigue sin feed.
const FETCH_TIMEOUT_MS = 6000;

export const INSTAGRAM_REVALIDATE_SECONDS = 3600;

export type InstagramPost = {
  id: string;
  permalink: string;
  imageUrl: string;
  caption: string | null;
  isVideo: boolean;
};

type GraphMedia = {
  id?: string;
  permalink?: string;
  media_type?: string;
  media_product_type?: string; // FEED | REELS | STORY | AD
  is_shared_to_feed?: boolean; // solo viene en reels
  media_url?: string;
  thumbnail_url?: string;
  caption?: string;
};

// Cuántos pedir a la API antes de filtrar. Los trial reels se publican de a
// tandas (el 15/09 fueron 19 en veinte minutos), así que con pedir justo los
// que se muestran la tira quedaría vacía o corta.
const FETCH_LIMIT = 50;

/**
 * Solo lo que está en la grilla del perfil. La API devuelve también los
 * trial reels (los que Instagram muestra solo a no seguidores y no aparecen
 * en el perfil) y los reels que se publicaron sin compartir al feed. En los
 * dos casos vienen como REELS con `is_shared_to_feed: false`; las fotos y
 * carruseles no traen el campo.
 */
function isOnProfileGrid(media: GraphMedia): boolean {
  if (media.media_product_type === 'REELS' && media.is_shared_to_feed === false) return false;
  return true;
}

/**
 * La URL de imagen utilizable según el tipo de post:
 * - IMAGE / CAROUSEL_ALBUM: `media_url` (en el carrusel es la primera foto).
 * - VIDEO (incluye reels): `media_url` es el .mp4, la portada está en `thumbnail_url`.
 */
function pickImageUrl(media: GraphMedia): string | null {
  if (media.media_type === 'VIDEO') return media.thumbnail_url ?? null;
  return media.media_url ?? null;
}

/**
 * Corta la espera sin cancelar el fetch: si se pasa un `signal`, Next puede
 * tratar el pedido como no cacheable, y acá el cacheo es justamente el punto.
 * El fetch abandonado igual termina de poblar el Data Cache, así que la próxima
 * request lo encuentra listo.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  promise.catch(() => {}); // que el abandono no quede como unhandled rejection
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/**
 * Últimas publicaciones de la cuenta. Devuelve null cuando no hay nada que
 * mostrar (sin token, API caída, token vencido, respuesta vacía).
 *
 * Cacheado en el servidor con `revalidate` de una hora: no hay una llamada a
 * Meta por visita, y el rate limit de la Graph API ni se toca.
 */
export async function getInstagramPosts(limit = 12): Promise<InstagramPost[] | null> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return null;

  const userId = process.env.INSTAGRAM_USER_ID || DEFAULT_IG_USER_ID;
  const fields = 'id,permalink,media_type,media_product_type,is_shared_to_feed,media_url,thumbnail_url,caption';
  const url =
    `https://graph.facebook.com/${GRAPH_VERSION}/${userId}/media` +
    `?fields=${fields}&limit=${FETCH_LIMIT}&access_token=${encodeURIComponent(token)}`;

  try {
    const res = await withTimeout(
      fetch(url, { next: { revalidate: INSTAGRAM_REVALIDATE_SECONDS } }),
      FETCH_TIMEOUT_MS,
    );
    if (!res) return null;

    if (!res.ok) {
      // 190 = token vencido/revocado, 10 = falta el permiso instagram_basic.
      console.warn(`[instagram] la Graph API devolvió ${res.status}; se omite la sección`);
      return null;
    }

    const json = (await res.json()) as { data?: GraphMedia[] };
    const posts = (json.data ?? [])
      .filter(isOnProfileGrid)
      .map((media): InstagramPost | null => {
        const imageUrl = pickImageUrl(media);
        if (!media.id || !media.permalink || !imageUrl) return null;
        return {
          id: media.id,
          permalink: media.permalink,
          imageUrl,
          caption: media.caption?.trim() || null,
          isVideo: media.media_type === 'VIDEO',
        };
      })
      .filter((p): p is InstagramPost => p !== null)
      .slice(0, limit);

    return posts.length > 0 ? posts : null;
  } catch (err) {
    console.warn('[instagram] no se pudo traer el feed; se omite la sección', err);
    return null;
  }
}
