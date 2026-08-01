'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getPublicReviewSummary } from '@/lib/reviews/public';
import type { PublicReviewSummary } from '@/lib/reviews/types';
import ReviewsSummary from '@/components/reviews/ReviewsSummary';
import ReviewsList from '@/components/reviews/ReviewsList';

export default function ReviewsPage() {
  const [summary, setSummary] = useState<PublicReviewSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPublicReviewSummary().then((s) => { if (!cancelled) setSummary(s); });
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">

        {/* Encabezado */}
        <section className="bg-bg-dark text-primary-foreground text-center py-24 px-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/40 mb-4">Reseñas</p>
          <h1 className="text-[32px] md:text-[48px] font-bold uppercase leading-none mb-4">Lo que dice nuestra comunidad</h1>
          <p className="text-[13px] md:text-[14px] text-primary-foreground/50 max-w-md mx-auto mb-8">
            Calidad, talles, packaging y envíos, contado por quienes ya compraron.
          </p>
          <Link
            href="/resena"
            className="inline-block bg-primary-foreground text-bg-dark text-[12px] font-semibold uppercase tracking-[0.08em] rounded-[6px] px-6 py-3 hover:opacity-90 transition-opacity"
          >
            Dejá tu reseña
          </Link>
        </section>

        {/* Resumen */}
        <section className="max-w-[720px] mx-auto px-4 py-12 md:py-16">
          {summary ? (
            <ReviewsSummary summary={summary} />
          ) : (
            <p className="text-[13px] text-muted-foreground">Cargando…</p>
          )}
        </section>

        {/* Listado */}
        <section className="max-w-[1400px] mx-auto px-4 pb-16 md:pb-20">
          {summary && <ReviewsList summary={summary} />}
        </section>

      </main>
      <Footer />
    </>
  );
}
