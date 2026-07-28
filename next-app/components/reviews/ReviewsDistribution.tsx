import type { PublicReviewSummary } from '@/lib/reviews/types';

export default function ReviewsDistribution({ summary }: { summary: PublicReviewSummary }) {
  const { distribution, total } = summary;
  const stars = [5, 4, 3, 2, 1] as const;

  return (
    <div className="flex flex-col gap-1.5" aria-label="Distribución de calificaciones">
      {stars.map((n) => {
        const count = distribution[n] ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={n} className="flex items-center gap-2.5">
            <span className="text-[11px] text-foreground/60 w-[38px] flex-shrink-0">{n} estr.</span>
            <div className="flex-1 h-[6px] bg-bg-alt rounded-full overflow-hidden">
              <div
                className="h-full bg-foreground rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground w-[28px] text-right flex-shrink-0 tabular-nums">{count}</span>
          </div>
        );
      })}
    </div>
  );
}
