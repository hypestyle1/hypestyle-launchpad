import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches, adminHeaders } from '@/lib/admin-auth';
import { getCostMap } from '@/lib/dashboard/cost-map';
import { AR_OFFSET_MINUTES } from '@/lib/dashboard/periods';

export const dynamic = 'force-dynamic';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const HS_REVIEWS_SECRET = (process.env.HS_REVIEWS_SECRET || '').trim();

// "hace 48h" en hora argentina, formato que espera el plugin de reseñas (Y-m-d H:i:s).
function arDateStr(msAgo: number): string {
  const d = new Date(Date.now() - msAgo + AR_OFFSET_MINUTES * 60_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

async function reviewsTotal(qs: string): Promise<number | null> {
  try {
    const res = await fetch(`${WP_URL}/wp-json/hypestyle-reviews/v1/review-requests?${qs}&per_page=1`, {
      headers: { 'X-HS-Reviews-Secret': HS_REVIEWS_SECRET },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.total === 'number' ? data.total : null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const origin = req.nextUrl.origin;

  const [counts, costMap, reviewsPending, reviewsPending48h] = await Promise.all([
    // Reutiliza el endpoint de conteos existente (no duplica la lógica de meta).
    fetch(`${origin}/api/admin/orders/counts`, { headers: adminHeaders(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null),
    getCostMap().catch(() => null),
    reviewsTotal('status=sent'),
    reviewsTotal(`status=sent&sent_to=${encodeURIComponent(arDateStr(48 * 3600_000))}`),
  ]);

  // Reseñas: una sola métrica (no dos redundantes). Si todas las pendientes
  // llevan +48h, se dice en el sub en vez de duplicar la card.
  const pend = reviewsPending;
  const over48 = reviewsPending48h;
  const reviewsSub =
    pend && over48 != null
      ? over48 >= pend ? 'todas hace +48h' : `${over48} hace +48h`
      : undefined;

  // ── Requiere atención = accionable ahora. ──
  const attention = [
    {
      key: 'por-empaquetar',
      label: 'Pedidos por preparar',
      value: counts?.porEmpaquetar ?? null,
      href: '/admin/pedidos?filter=por-empaquetar',
      tone: (counts?.porEmpaquetar ?? 0) > 0 ? 'warning' : 'neutral',
    },
    {
      key: 'productos-sin-costo',
      label: 'Productos sin costo',
      sub: 'afecta el cálculo de profit',
      value: costMap?.productsWithoutCost ?? null,
      href: '/admin/costos?onlyUnassigned=1',
      tone: (costMap?.productsWithoutCost ?? 0) > 0 ? 'warning' : 'neutral',
    },
  ];

  // ── Recuperación / oportunidades = no es urgencia operativa, pero hay valor. ──
  const opportunities = [
    {
      key: 'sin-pagar',
      // Carritos abandonados + pendientes reales: no se puede separar hoy con Woo,
      // así que va como oportunidad de recuperación, no como alarma operativa.
      label: 'Pedidos sin pagar',
      sub: 'incluye carritos abandonados',
      value: counts?.pendientes ?? null,
      href: '/admin/pedidos?filter=sin-pagar',
      tone: 'neutral',
    },
    {
      key: 'resenas',
      label: 'Reseñas sin responder',
      sub: reviewsSub,
      value: pend,
      href: '/admin/reviews?status=sent',
      tone: 'neutral',
    },
  ];

  return NextResponse.json({ attention, opportunities });
}
