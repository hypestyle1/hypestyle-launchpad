import type { PublicReviewDistribution, ReviewsSortOrder } from '@/lib/reviews/types';

const SORT_OPTIONS: { value: ReviewsSortOrder; label: string }[] = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'top', label: 'Mejor puntuación' },
  { value: 'low', label: 'Menor puntuación' },
];

export default function ReviewsFilters({
  stars,
  onStarsChange,
  sort,
  onSortChange,
  distribution,
}: {
  stars: number | null;
  onStarsChange: (n: number | null) => void;
  sort: ReviewsSortOrder;
  onSortChange: (s: ReviewsSortOrder) => void;
  distribution: PublicReviewDistribution;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por estrellas">
        <button
          type="button"
          onClick={() => onStarsChange(null)}
          className={`text-[11px] font-semibold uppercase tracking-[0.08em] px-3 py-1.5 rounded-[6px] border transition-colors ${
            stars === null ? 'border-foreground bg-foreground text-white' : 'border-border text-foreground/60 hover:border-foreground/40'
          }`}
        >
          Todas
        </button>
        {[5, 4, 3, 2, 1].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onStarsChange(n)}
            disabled={distribution[n as 1 | 2 | 3 | 4 | 5] === 0}
            className={`text-[11px] font-semibold px-3 py-1.5 rounded-[6px] border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
              stars === n ? 'border-foreground bg-foreground text-white' : 'border-border text-foreground/60 hover:border-foreground/40'
            }`}
          >
            {n}★
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
        Ordenar
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as ReviewsSortOrder)}
          className="text-[12px] border border-border rounded-[6px] px-2 py-1.5 bg-white text-foreground focus:outline-none focus:border-foreground/40"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
