import Link from 'next/link';
import { imgSrc } from '@/lib/img';
import type { PublicReview } from '@/lib/reviews/types';
import StarRating from './StarRating';
import { DemoBadge } from './DemoContentNotice';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ReviewCard({ review, compact = false }: { review: PublicReview; compact?: boolean }) {
  const { customerName, rating, text, createdAt, productName, productSlug, productImage, verified, incentivized, isDemo } = review;

  return (
    <article className="border border-border rounded-[10px] p-5 bg-white flex flex-col gap-3 h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <StarRating rating={rating} size={14} />
          <p className="text-[13px] font-semibold mt-1.5">{customerName}</p>
        </div>
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatDate(createdAt)}</span>
      </div>

      <p className={`text-[13px] text-foreground/80 leading-relaxed ${compact ? 'line-clamp-3' : ''}`}>{text}</p>

      {(verified || incentivized || isDemo) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {verified && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-green-800 bg-green-50 border border-green-200 rounded-[4px] px-2 py-[3px]">
              Compra verificada
            </span>
          )}
          {incentivized && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground/60 bg-bg-alt border border-border rounded-[4px] px-2 py-[3px]">
              Reseña incentivada
            </span>
          )}
          {isDemo && <DemoBadge />}
        </div>
      )}

      {productName && (
        <div className="mt-auto pt-3 border-t border-border/70 flex items-center gap-2.5">
          {productImage && (
            <div className="w-9 h-9 rounded-[5px] bg-bg-alt overflow-hidden flex-shrink-0">
              <img
                src={imgSrc(productImage)}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
          {productSlug && !isDemo ? (
            <Link href={`/producto/${productSlug}/`} className="text-[12px] text-foreground/60 hover:text-foreground transition-colors truncate">
              {productName}
            </Link>
          ) : (
            <span className="text-[12px] text-foreground/60 truncate">{productName}</span>
          )}
        </div>
      )}
    </article>
  );
}
