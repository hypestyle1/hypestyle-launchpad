import type { PublicReviewSummary } from '@/lib/reviews/types';
import StarRating from './StarRating';
import ReviewsDistribution from './ReviewsDistribution';
import DemoContentNotice from './DemoContentNotice';

export default function ReviewsSummary({ summary, showDistribution = true }: { summary: PublicReviewSummary; showDistribution?: boolean }) {
  if (summary.total === 0 || summary.average === null) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-muted-foreground">
          Todavía no tenemos reseñas publicadas. Estamos sumando las primeras.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {summary.isDemo && <DemoContentNotice />}
      <div className="flex items-center gap-4">
        <span className="text-[40px] font-bold leading-none tabular-nums">{summary.average.toFixed(1)}</span>
        <div className="flex flex-col gap-1">
          <StarRating rating={summary.average} size={18} />
          <span className="text-[12px] text-muted-foreground">
            {summary.total} {summary.total === 1 ? 'reseña' : 'reseñas'}
            {summary.isDemo ? ' (muestra)' : ''}
          </span>
        </div>
      </div>
      {showDistribution && (
        <div className="max-w-sm">
          <ReviewsDistribution summary={summary} />
        </div>
      )}
    </div>
  );
}
