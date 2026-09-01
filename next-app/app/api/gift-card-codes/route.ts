import { NextRequest, NextResponse } from 'next/server';

// Proxy de lectura de los códigos de gift card de un pedido, para la página de
// confirmación. El PHP autentica por order_key (mismo criterio que /tracking):
// el browser sólo tiene la clave si hizo la compra en esta sesión.

export const dynamic = 'force-dynamic';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';

export async function GET(req: NextRequest) {
  const order = req.nextUrl.searchParams.get('order') || '';
  const key = req.nextUrl.searchParams.get('key') || '';
  if (!/^\d+$/.test(order) || !key) return NextResponse.json({ error: 'Parámetros faltantes' }, { status: 400 });

  try {
    const r = await fetch(
      `${WP_URL}/wp-json/hypestyle/v1/gift-card-codes?order=${order}&key=${encodeURIComponent(key)}`,
      { cache: 'no-store' },
    );
    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  } catch {
    return NextResponse.json({ error: 'Sin conexión con el servidor' }, { status: 502 });
  }
}
