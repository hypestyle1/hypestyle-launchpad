import { DEMO_REVIEWS } from '@/data/reviews-demo';
import type {
  GetPublicReviewsOptions,
  PublicReview,
  PublicReviewDistribution,
  PublicReviewSummary,
  PublicReviewsResult,
} from './types';

/**
 * Única fuente de datos para la tienda pública (página /reviews, drawer,
 * sección de home). Todo componente público debe pasar por acá — nunca
 * importar data/reviews-demo.ts directamente ni mantener otro array.
 *
 * Modo demo (NEXT_PUBLIC_REVIEWS_DEMO_MODE=true): sirve DEMO_REVIEWS en
 * memoria, sin red. Apagado por defecto — si la variable no está seteada,
 * queda en modo real (producción segura por default).
 *
 * Modo real: pega contra /api/public-reviews (proxy server-side de
 * GET /wp-json/hypestyle/v1/public-reviews). Ese endpoint de WordPress
 * todavía no existe — hasta que se implemente, el proxy devuelve un
 * resultado vacío de forma controlada (nunca inventa promedio ni cantidad).
 */
export function isReviewsDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_REVIEWS_DEMO_MODE === 'true';
}

const EMPTY_DISTRIBUTION: PublicReviewDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

function computeSummary(reviews: PublicReview[], isDemo: boolean): PublicReviewSummary {
  if (reviews.length === 0) {
    return { average: null, total: 0, distribution: { ...EMPTY_DISTRIBUTION }, isDemo };
  }
  const distribution: PublicReviewDistribution = { ...EMPTY_DISTRIBUTION };
  let sum = 0;
  for (const r of reviews) {
    const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[star] += 1;
    sum += r.rating;
  }
  return {
    average: Math.round((sum / reviews.length) * 10) / 10,
    total: reviews.length,
    distribution,
    isDemo,
  };
}

function sortReviews(reviews: PublicReview[], sort: GetPublicReviewsOptions['sort']): PublicReview[] {
  const copy = [...reviews];
  if (sort === 'top') return copy.sort((a, b) => b.rating - a.rating || b.createdAt.localeCompare(a.createdAt));
  if (sort === 'low') return copy.sort((a, b) => a.rating - b.rating || b.createdAt.localeCompare(a.createdAt));
  return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // 'recent' (default)
}

function getDemoReviews(options: GetPublicReviewsOptions = {}): PublicReviewsResult {
  const { page = 1, perPage = 9, stars, sort = 'recent' } = options;
  let filtered = DEMO_REVIEWS;
  if (stars) filtered = filtered.filter((r) => Math.round(r.rating) === stars);
  const sorted = sortReviews(filtered, sort);
  const total = sorted.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  const reviews = sorted.slice(start, start + perPage);
  return { reviews, pagination: { page, pages, total } };
}

const EMPTY_RESULT: PublicReviewsResult = { reviews: [], pagination: { page: 1, pages: 0, total: 0 } };

async function getRealReviews(options: GetPublicReviewsOptions = {}): Promise<PublicReviewsResult> {
  const { page = 1, perPage = 9, stars, sort = 'recent' } = options;
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage), sort });
  if (stars) params.set('stars', String(stars));
  try {
    const res = await fetch(`/api/public-reviews?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) return EMPTY_RESULT;
    const data = await res.json();
    if (!data || !Array.isArray(data.reviews)) return EMPTY_RESULT;
    return {
      reviews: data.reviews,
      pagination: data.pagination ?? { page: 1, pages: data.reviews.length ? 1 : 0, total: data.reviews.length },
    };
  } catch {
    return EMPTY_RESULT;
  }
}

async function getRealSummary(): Promise<PublicReviewSummary> {
  try {
    const res = await fetch('/api/public-reviews?per_page=1', { cache: 'no-store' });
    if (!res.ok) return { average: null, total: 0, distribution: { ...EMPTY_DISTRIBUTION }, isDemo: false };
    const data = await res.json();
    const s = data?.summary;
    if (!s) return { average: null, total: 0, distribution: { ...EMPTY_DISTRIBUTION }, isDemo: false };
    return {
      average: typeof s.average === 'number' ? s.average : null,
      total: typeof s.total === 'number' ? s.total : 0,
      distribution: { ...EMPTY_DISTRIBUTION, ...(s.distribution ?? {}) },
      isDemo: false,
    };
  } catch {
    return { average: null, total: 0, distribution: { ...EMPTY_DISTRIBUTION }, isDemo: false };
  }
}

export async function getPublicReviews(options: GetPublicReviewsOptions = {}): Promise<PublicReviewsResult> {
  if (isReviewsDemoMode()) return getDemoReviews(options);
  return getRealReviews(options);
}

export async function getPublicReviewSummary(): Promise<PublicReviewSummary> {
  if (isReviewsDemoMode()) return computeSummary(DEMO_REVIEWS, true);
  return getRealSummary();
}
