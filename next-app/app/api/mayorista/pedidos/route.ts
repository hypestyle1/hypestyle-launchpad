import { NextRequest, NextResponse } from 'next/server';
import { MAYORISTA_COOKIE, verifySessionToken } from '@/lib/mayorista-auth';
import { pedidoViewFrom } from '@/lib/mayorista-pedidos-view';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = process.env.WC_CONSUMER_KEY || '';
const WC_SEC = process.env.WC_CONSUMER_SECRET || '';

function wcAuth() {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
}

// Pedidos del cliente con el detalle (líneas con talle y color, envío, saldo
// a favor, campaña, seguimiento): ver lib/mayorista-pedidos-view.ts. Si Woo
// no responde: 502, y el portal lo muestra como error, no como "sin pedidos".
export async function GET(req: NextRequest) {
  const customerId = await verifySessionToken(req.cookies.get(MAYORISTA_COOKIE)?.value);
  if (!customerId) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  let res: Response;
  try {
    res = await fetch(
      `${WP_URL}/wp-json/wc/v3/orders?customer=${customerId}&status=any&per_page=50&orderby=date&order=desc&_cb=${Date.now()}`,
      { headers: { Authorization: wcAuth() }, cache: 'no-store' },
    );
  } catch (err) {
    console.error('[mayorista/pedidos]', err);
    return NextResponse.json({ message: 'No se pudieron cargar los pedidos' }, { status: 502 });
  }
  if (!res.ok) return NextResponse.json({ message: 'No se pudieron cargar los pedidos' }, { status: 502 });

  const orders = await res.json() as any[];
  return NextResponse.json({ orders: orders.map(pedidoViewFrom) }, { headers: { 'Cache-Control': 'no-store' } });
}
