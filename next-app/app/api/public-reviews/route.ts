import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

// Proxy público (sin secretos) hacia GET /wp-json/hypestyle/v1/public-reviews
// — reseñas aprobadas, publicables, sin datos personales/internos (ver
// docs/reviews-api.md, sección de reseñas públicas). Si WordPress no responde
// bien, el proxy devuelve un resultado vacío controlado (nunca inventa promedio
// ni cantidad) en vez de propagar un error al frontend.
const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';

/**
 * Las reseñas cambian pocas veces por día y este endpoint se pedía en cada
 * ficha, en el drawer, en la home y en /reviews: una consulta a WordPress (y a
 * MySQL) por vista. Ahora se cachea 5 minutos por combinación de parámetros.
 * Incidente MariaDB/Hostinger 4/11/2026: bajar la concurrencia contra MySQL.
 */
const CACHE_SECONDS = 300;

const EMPTY_RESPONSE = {
  summary: { average: null, total: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } },
  reviews: [],
  pagination: { page: 1, pages: 0, total: 0 },
};

class WpUnavailableError extends Error {}

/**
 * Lanza si WordPress falla (5xx, timeout, JSON roto): unstable_cache no guarda
 * los errores, así una caída de WP no deja la ficha sin reseñas durante 5
 * minutos. Un 404 (endpoint desactivado) sí es una respuesta definitiva y se
 * cachea como vacío.
 */
const fetchPublicReviews = unstable_cache(
  async (qs: string) => {
    const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/public-reviews?${qs}`, { cache: 'no-store' });
    if (res.status === 404) return EMPTY_RESPONSE;
    if (!res.ok) throw new WpUnavailableError(`WP ${res.status}`);
    const data = await res.json().catch(() => null);
    if (!data || !Array.isArray(data.reviews)) throw new WpUnavailableError('respuesta inválida');
    return data;
  },
  ['public-reviews-v1'],
  { revalidate: CACHE_SECONDS },
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const qs = new URLSearchParams();
  for (const key of ['page', 'per_page', 'stars', 'sort']) {
    const v = searchParams.get(key);
    if (v) qs.set(key, v);
  }
  qs.sort(); // misma clave de caché sin importar el orden de los parámetros

  try {
    const data = await fetchPublicReviews(qs.toString());
    return NextResponse.json(data, {
      status: 200,
      headers: { 'Cache-Control': `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=600` },
    });
  } catch {
    // Vacío controlado y SIN caché: el próximo request vuelve a intentar.
    return NextResponse.json(EMPTY_RESPONSE, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }
}
