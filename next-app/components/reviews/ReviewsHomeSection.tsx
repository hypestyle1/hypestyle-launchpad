'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPublicReviewSummary, getPublicReviews } from '@/lib/reviews/public';
import type { PublicReview, PublicReviewSummary } from '@/lib/reviews/types';
import { useReveal } from '@/hooks/useReveal';
import StarRating from './StarRating';
import ReviewCard from './ReviewCard';

const FEATURED_COUNT = 4;

export default function ReviewsHomeSection() {
  const [summary, setSummary] = useState<PublicReviewSummary | null>(null);
  const [featured, setFeatured] = useState<PublicReview[]>([]);
  const ref = useReveal([summary]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getPublicReviewSummary(),
      getPublicReviews({ perPage: FEATURED_COUNT, sort: 'top' }),
    ]).then(([s, r]) => {
      if (cancelled) return;
      setSummary(s);
      setFeatured(r.reviews);
    });
    return () => { cancelled = true; };
  }, []);

  // Sin datos todavía (real, no-demo): no se muestra la sección — nada de números inventados.
  if (!summary || summary.total === 0 || featured.length === 0) return null;

  return (
    <section className="max-w-[1400px] mx-auto px-4 py-14 md:py-20" ref={ref}>
      <div className="reveal rd1 flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-9">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Comunidad</p>
          <h2 className="text-[26px] md:text-[36px] font-bold uppercase tracking-tight leading-none mb-3">
            Lo que dice nuestra comunidad
          </h2>
          <p className="text-[13px] text-muted-foreground max-w-md">
            Calidad, talles, packaging y envíos, contado por quienes ya compraron.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[30px] font-bold leading-none tabular-nums">{summary.average!.toFixed(1)}</span>
          <div className="flex flex-col gap-1">
            <StarRating rating={summary.average!} size={16} />
            <span className="text-[12px] text-muted-foreground">
              {summary.total} {summary.total === 1 ? 'reseña' : 'reseñas'}{summary.isDemo ? ' (muestra)' : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="reveal rd2 flex gap-4 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-1 -mx-4 px-4 md:mx-0 md:px-0">
        {featured.map((r) => (
          <div key={r.id} className="flex-none w-[78%] sm:w-[300px] snap-start">
            <ReviewCard review={r} compact />
          </div>
        ))}
      </div>

      <div className="reveal rd3 flex justify-center mt-9">
        <Link
          href="/reviews/"
          className="inline-block text-[12px] font-bold uppercase tracking-[0.1em] border border-foreground/30 rounded-[10px] px-8 py-3.5 hover:bg-foreground hover:text-white transition-colors"
        >
          Ver todas las reseñas
        </Link>
      </div>
    </section>
  );
}
