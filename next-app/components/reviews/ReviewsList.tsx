'use client';

import { useEffect, useState } from 'react';
import { getPublicReviews } from '@/lib/reviews/public';
import type { PublicReview, PublicReviewSummary, ReviewsSortOrder } from '@/lib/reviews/types';
import ReviewCard from './ReviewCard';
import ReviewsFilters from './ReviewsFilters';

const PER_PAGE = 9;

export default function ReviewsList({ summary }: { summary: PublicReviewSummary }) {
  const [stars, setStars] = useState<number | null>(null);
  const [sort, setSort] = useState<ReviewsSortOrder>('recent');
  const [page, setPage] = useState(1);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);

  // Reset al cambiar filtro/orden.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPage(1);
    getPublicReviews({ page: 1, perPage: PER_PAGE, stars: stars ?? undefined, sort }).then((res) => {
      if (cancelled) return;
      setReviews(res.reviews);
      setPages(res.pagination.pages);
      setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stars, sort]);

  const loadMore = () => {
    const nextPage = page + 1;
    setLoading(true);
    getPublicReviews({ page: nextPage, perPage: PER_PAGE, stars: stars ?? undefined, sort }).then((res) => {
      setReviews((prev) => [...prev, ...res.reviews]);
      setPage(nextPage);
      setPages(res.pagination.pages);
      setLoading(false);
    });
  };

  if (summary.total === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-border rounded-[10px]">
        <p className="text-[14px] font-medium mb-1">Todavía no hay reseñas publicadas</p>
        <p className="text-[13px] text-muted-foreground">Estamos sumando las primeras. Volvé pronto.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ReviewsFilters stars={stars} onStarsChange={setStars} sort={sort} onSortChange={setSort} distribution={summary.distribution} />

      {reviews.length === 0 && !loading ? (
        <div className="text-center py-12 border border-dashed border-border rounded-[10px]">
          <p className="text-[13px] text-muted-foreground">No hay reseñas con ese filtro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
        </div>
      )}

      {page < pages && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="text-[12px] font-semibold uppercase tracking-[0.08em] border border-foreground/30 rounded-[8px] px-6 py-2.5 hover:bg-foreground hover:text-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Cargando…' : 'Ver más'}
          </button>
        </div>
      )}
    </div>
  );
}
