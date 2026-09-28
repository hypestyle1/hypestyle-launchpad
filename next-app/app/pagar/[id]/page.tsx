import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { loadRepago, repagoCookie } from '@/lib/repago';
import PagarClient from './PagarClient';

// Link personal a un pedido: nunca se cachea ni se indexa. El pedido se lee de
// Woo en cada carga.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Completá tu compra — Hypestyle',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function PagarPage({ params, searchParams }: {
  params: { id: string };
  searchParams: { mp?: string };
}) {
  const orderId = /^\d{1,10}$/.test(params.id) ? Number(params.id) : 0;
  // La clave llega por cookie: middleware.ts la sacó de la URL antes de llegar acá.
  const key = orderId ? cookies().get(repagoCookie(orderId))?.value : null;
  const result = await loadRepago(orderId, key);

  const vuelta = searchParams.mp === 'rechazado' || searchParams.mp === 'pendiente' ? searchParams.mp : null;
  return <PagarClient view={result.ok ? result.view : null} vuelta={vuelta} />;
}
