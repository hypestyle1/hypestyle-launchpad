import { Suspense } from 'react';
import ReviewClient from './ReviewClient';

export const metadata = { title: 'Dejá tu reseña — Hypestyle' };

export default function ReviewPage({ params }: { params: { token: string } }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-sm text-gray-400">Cargando...</p></div>}>
      <ReviewClient token={params.token} />
    </Suspense>
  );
}
