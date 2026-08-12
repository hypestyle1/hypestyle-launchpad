'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPublicReviewSummary, getPublicReviews } from '@/lib/reviews/public';
import type { PublicReview, PublicReviewSummary } from '@/lib/reviews/types';
import type { HomeReviewsData } from '@/lib/reviews/server';
import { useReveal } from '@/hooks/useReveal';
import { useDragScroll } from '@/hooks/useDragScroll';
import StarRating from './StarRating';
import ReviewCard from './ReviewCard';

// Eran 4 y quedaba a mitad de camino entre grilla y carrusel: 4 tarjetas de
// 300px entran enteras en el contenedor de 1400px, así que en desktop el
// contenedor de scroll no scrolleaba nada y se veía como una fila suelta
// alineada a la izquierda con un hueco al costado. Con 8 el carrusel desborda
// y se comporta igual en mobile que en desktop.
const FEATURED_COUNT = 8;

/**
 * `initial` lo trae el servidor (ver app/page.tsx y lib/reviews/server.ts).
 * Con eso la sección ya sale renderizada en el HTML: antes se montaba vacía,
 * pedía los datos en un useEffect y a los 6–9s insertaba ~715px arriba de
 * #new-in-fw26, empujando todo lo que estuviera en pantalla. Era lo último que
 * quedaba del CLS del home.
 *
 * Si `initial` no viene (falló el fetch del server, o modo demo), se comporta
 * como antes y pide por su cuenta.
 */
export default function ReviewsHomeSection({ initial }: { initial?: HomeReviewsData | null }) {
  const [summary, setSummary] = useState<PublicReviewSummary | null>(initial?.summary ?? null);
  const [featured, setFeatured] = useState<PublicReview[]>(initial?.featured ?? []);
  const ref = useReveal([summary]);
  const dragRef = useDragScroll();

  useEffect(() => {
    // Ya vino del servidor: no se vuelve a pedir, así no hay un segundo render
    // que pueda cambiar el alto.
    if (initial) return;
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
  }, [initial]);

  // Todavía cargando: no mostrar nada (evita parpadeo del estado vacío).
  if (!summary) return null;

  const hasReviews = summary.total > 0 && featured.length > 0;

  return (
    <section className="max-w-[1400px] mx-auto px-4 py-14 md:py-20" ref={ref}>
      <div className="reveal rd1 flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-9">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Comunidad</p>
          <h2 className="text-[26px] md:text-[36px] font-bold uppercase tracking-tight leading-none mb-3">
            Lo que dice nuestra comunidad
          </h2>
          <p className="text-[13px] text-muted-foreground max-w-md">
            {hasReviews
              ? 'Calidad, talles, packaging y envíos, contado por quienes ya compraron.'
              : 'Todavía no tenemos reseñas publicadas. Comprá, dejá tu reseña y llevate un 10% OFF para tu próxima compra.'}
          </p>
        </div>
        {hasReviews && (
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-[30px] font-bold leading-none tabular-nums">{summary.average!.toFixed(1)}</span>
            <div className="flex flex-col gap-1">
              <StarRating rating={summary.average!} size={16} />
              <span className="text-[12px] text-muted-foreground">
                {summary.total} {summary.total === 1 ? 'reseña' : 'reseñas'}
              </span>
            </div>
          </div>
        )}
      </div>

      {!hasReviews && (
        <div className="reveal rd2 flex flex-wrap justify-center gap-3">
          <Link
            href="/productos/"
            className="inline-block bg-bg-dark text-primary-foreground text-[12px] font-bold uppercase tracking-[0.1em] px-8 py-3.5 rounded-[10px] hover:opacity-85 transition-opacity"
          >
            Ver productos
          </Link>
          <Link
            href="/resena"
            className="inline-block border border-foreground/30 text-[12px] font-bold uppercase tracking-[0.1em] px-8 py-3.5 rounded-[10px] hover:bg-foreground hover:text-white transition-colors"
          >
            Dejá tu reseña
          </Link>
        </div>
      )}

      {/* items-stretch + h-full en la card: si no, con textos de distinto largo
          cada tarjeta terminaba con una altura y el borde inferior quedaba
          escalonado a lo largo del carrusel. */}
      {hasReviews && (
      <div
        ref={dragRef}
        className="reveal rd2 flex items-stretch gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory cursor-grab select-none pb-1 -mx-4 px-4 md:mx-0 md:px-0"
      >
        {featured.map((r) => (
          <div key={r.id} className="flex-none w-[78%] sm:w-[300px] snap-start">
            <ReviewCard review={r} compact />
          </div>
        ))}
      </div>
      )}

      {hasReviews && (
      <div className="reveal rd3 flex flex-wrap justify-center gap-3 mt-9">
        <Link
          href="/reviews/"
          className="inline-block text-[12px] font-bold uppercase tracking-[0.1em] border border-foreground/30 rounded-[10px] px-8 py-3.5 hover:bg-foreground hover:text-white transition-colors"
        >
          Ver todas las reseñas
        </Link>
        <Link
          href="/resena"
          className="inline-block bg-bg-dark text-primary-foreground text-[12px] font-bold uppercase tracking-[0.1em] rounded-[10px] px-8 py-3.5 hover:opacity-85 transition-opacity"
        >
          Dejá tu reseña
        </Link>
      </div>
      )}
    </section>
  );
}
