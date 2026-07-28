import type { Metadata } from 'next';

const DESCRIPTION = 'Lo que dice nuestra comunidad sobre Hypestyle: calidad, talles, packaging y envíos, contado por quienes ya compraron.';

export const metadata: Metadata = {
  title: 'Reseñas — Hype.',
  description: DESCRIPTION,
  alternates: { canonical: 'https://hypestyle.com.ar/reviews' },
  openGraph: {
    title: 'Reseñas — HYPESTYLE',
    description: DESCRIPTION,
    url: 'https://hypestyle.com.ar/reviews',
    siteName: 'HYPESTYLE',
    locale: 'es_AR',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'HYPESTYLE — Reseñas' }],
  },
};

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
