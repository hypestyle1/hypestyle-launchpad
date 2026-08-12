import type { PublicReview, PublicReviewSummary } from './types';

/**
 * Reseñas para el render del servidor.
 *
 * lib/reviews/public.ts pide a `/api/public-reviews` con URL relativa, que solo
 * resuelve en el browser. Este módulo pega directo al mismo endpoint de
 * WordPress que ese proxy, para poder traer las reseñas durante el build.
 *
 * Por qué: ReviewsHomeSection hacía `if (!summary) return null` y traía los
 * datos en un useEffect. La sección aparecía recién a los 6–9s e insertaba
 * ~715px arriba de #new-in-fw26, empujando todo lo que estaba en pantalla —
 * era lo último que quedaba del CLS del home (~0,09).
 */

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const EMPTY_DISTRIBUTION = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

export interface HomeReviewsData {
  summary: PublicReviewSummary;
  featured: PublicReview[];
}

/**
 * Devuelve null si no se pudo traer, o si está el modo demo (ahí manda el
 * cliente, que lee de data/reviews-demo). Con null, ReviewsHomeSection se
 * comporta como antes: pide por su cuenta. Nunca inventa promedio ni cantidad.
 */
export async function fetchHomeReviews(count: number): Promise<HomeReviewsData | null> {
  if (process.env.NEXT_PUBLIC_REVIEWS_DEMO_MODE === 'true') return null;

  try {
    const res = await fetch(
      `${WP_URL}/wp-json/hypestyle/v1/public-reviews?per_page=${count}&sort=top`,
      // Las reseñas cambian poco; 5 minutos alcanza y no castiga el build.
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    if (!data || !Array.isArray(data.reviews)) return null;

    const s = data.summary ?? {};
    return {
      summary: {
        average: typeof s.average === 'number' ? s.average : null,
        total: typeof s.total === 'number' ? s.total : 0,
        distribution: { ...EMPTY_DISTRIBUTION, ...(s.distribution ?? {}) },
        isDemo: false,
      },
      featured: data.reviews as PublicReview[],
    };
  } catch {
    return null;
  }
}
