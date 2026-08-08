import { Suspense } from 'react';
import ReviewClient from './ReviewClient';

// Página de uso puntual (link directo por mail o por pedido), sin valor en
// búsqueda. follow para no cortar el flujo de link equity hacia el resto.
// El noindex solo lo lee Google si la ruta NO está en Disallow (robots.txt).
export const metadata = {
  title: 'Dejá tu reseña — Hypestyle',
  robots: { index: false, follow: true },
};

export default function ReviewPage({ params }: { params: { token: string } }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-sm text-gray-400">Cargando...</p></div>}>
      <ReviewClient token={params.token} />
    </Suspense>
  );
}
