import { NextResponse } from 'next/server';
import { fetchFxRates, FX_REVALIDATE_SECONDS } from '@/lib/fx';

// El precio en dólares y en euros que ve el comprador de afuera. LocaleContext
// lo pide una vez al montar; hasta que responde muestra el respaldo de lib/fx,
// así que un corte de dolarapi degrada a un precio viejo pero nunca rompe la
// vitrina.
//
// Cotiza contra la misma fuente y el mismo campo que /api/paypal-order, para
// que lo publicado y lo cobrado no puedan volver a separarse.

export const revalidate = FX_REVALIDATE_SECONDS;

export async function GET() {
  const rates = await fetchFxRates();
  return NextResponse.json(rates, {
    headers: {
      'Cache-Control': `public, s-maxage=${FX_REVALIDATE_SECONDS}, stale-while-revalidate=86400`,
    },
  });
}
