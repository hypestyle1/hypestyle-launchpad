'use client';

import { useEffect, useState } from 'react';
import { getPublicReviewSummary, getPublicReviews } from '@/lib/reviews/public';
import type { PublicReview, PublicReviewSummary } from '@/lib/reviews/types';
import { useReveal } from '@/hooks/useReveal';
import SectionHeader from '@/components/SectionHeader';
import StarRating from './StarRating';
import ReviewCard from './ReviewCard';
import { DemoBadge } from './DemoContentNotice';

export default function ReviewsHomeSection() {
  const [summary, setSummary] = useState<PublicReviewSummary | null>(null);
  const [featured, setFeatured] = useState<PublicReview[]>([]);
  const ref = useReveal([summary]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getPublicReviewSummary(),
      getPublicReviews({ perPage: 3, sort: 'top' }),
    ]).then(([s, r]) => {
      if (cancelled) return;
      setSummary(s);
      setFeatured(r.reviews);
    });
    return () => { cancelled = true; };
  }, []);

  // Sin reseñas (real, no-demo) todavía: no mostrar la sección en home.
  if (summary !== null && summary.total === 0) return null;

  return (
    <section className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
      <div className="reveal rd1">
        <SectionHeader title="Lo que dice nuestra comunidad" link="/reviews/" linkLabel="Ver todas">
          {summary && summary.total > 0 && (
            <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <StarRating rating={summary.average ?? 0} size={14} />
              <span className="tabular-nums">{summary.average?.toFixed(1)}</span>
              {summary.isDemo && <DemoBadge />}
            </span>
          )}
        </SectionHeader>
      </div>

      {featured.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {featured.map((r, i) => (
            <div key={r.id} className={`reveal rd${Math.min(i + 2, 8)}`}>
              <ReviewCard review={r} compact />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
