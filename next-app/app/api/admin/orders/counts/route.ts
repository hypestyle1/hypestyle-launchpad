import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { fetchProcessingOrders, splitProcessing } from '@/lib/orders-fulfillment';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

async function statusTotal(status: string, after: string): Promise<number> {
  const res = await fetch(
    `${WP_URL}/wp-json/wc/v3/orders?status=${status}&per_page=1&after=${after}&_cb=${Date.now()}`,
    { headers: { Authorization: wcAuth() }, next: { revalidate: 0 } }
  );
  return parseInt(res.headers.get('X-WP-Total') || '0');
}

export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const after = req.nextUrl.searchParams.get('after') || '2026-05-10T00:00:00';

  // La partición por rótulo/guía vive en lib/orders-fulfillment (la comparte el
  // Founder Brief). Si WC falla, los conteos quedan en cero como antes.
  const [processing, pendientes, enviados] = await Promise.all([
    fetchProcessingOrders(after).catch(() => []),
    statusTotal('pending', after),
    statusTotal('enviado', after),
  ]);
  const proc = splitProcessing(processing);

  return NextResponse.json({
    porEmpaquetar:     proc.sinEmpaquetar, // pagado, sin rótulo → hay que empaquetarlo en Andreani
    empaquetados:      proc.empaquetados,  // tiene rótulo, falta que Andreani le asigne guía (pagar en su portal)
    enviadosSinMarcar: proc.enviados,      // ya tiene guía real pero sigue en estado "procesando"
    pendientes,                            // sin pagar
    despachados:       enviados,           // pedidos marcados manualmente como estado "enviado"
  });
}
