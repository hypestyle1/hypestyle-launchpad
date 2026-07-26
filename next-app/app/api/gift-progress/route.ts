import { NextRequest, NextResponse } from 'next/server';

const WP_URL     = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const HPG_SECRET = (process.env.HPG_SECRET || '').trim();

// Proxy server-side hacia el plugin Hypestyle Purchase Gift (namespace REST
// propio hypestyle-gift/v1, separado del resto de la API headless). El
// navegador nunca pega directo a WordPress ni conoce el secreto — mismo
// patrón que /api/validate-coupon y el resto de las rutas de este proyecto.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${WP_URL}/wp-json/hypestyle-gift/v1/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hpg-Secret': HPG_SECRET,
        'Authorization': `Bearer ${HPG_SECRET}`,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ active: false }, { status: 200 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[gift-progress proxy]', err);
    // Fallar en silencio: la barra de progreso es informativa, nunca debe
    // romper el carrito/checkout si el plugin no responde.
    return NextResponse.json({ active: false }, { status: 200 });
  }
}
