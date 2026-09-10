'use client';

import { useState } from 'react';
import Link from 'next/link';
import { imgSrc } from '@/lib/img';
import type { PublicReview } from '@/lib/reviews/types';
import StarRating from './StarRating';
import ReviewPhotoLightbox from './ReviewPhotoLightbox';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ReviewCard({ review, compact = false }: { review: PublicReview; compact?: boolean }) {
  // incentivized/isDemo/verified se mantienen en el modelo (PublicReview) pero
  // no se muestran como badge en la card — solo el aviso general de la página/sección.
  const { customerName, rating, text, createdAt, productName, productSlug, productImage, isDemo } = review;
  const photos = review.photos ?? [];
  const [openPhoto, setOpenPhoto] = useState<number | null>(null);

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

      {photos.length > 0 && (
        <div className="flex gap-2">
          {photos.slice(0, 3).map((photo, i) => (
            <button
              key={photo.thumb}
              type="button"
              onClick={() => setOpenPhoto(i)}
              aria-label={`Ver foto ${i + 1} de ${photos.length}`}
              className={`${compact ? 'w-14 h-14' : 'w-20 h-20'} rounded-[6px] bg-bg-alt overflow-hidden flex-shrink-0 border border-border/70 hover:opacity-90 transition-opacity`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.thumb} alt="" loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {productName && (
        <div className="mt-auto pt-3 border-t border-border/70 flex items-center gap-2.5">
          {productImage && (
            <div className="w-9 h-9 rounded-[5px] bg-bg-alt overflow-hidden flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
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

      {openPhoto !== null && (
        <ReviewPhotoLightbox photos={photos} index={openPhoto} onClose={() => setOpenPhoto(null)} />
      )}
    </article>
  );
}
