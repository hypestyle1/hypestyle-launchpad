import { NextRequest, NextResponse } from 'next/server';

const WP_URL     = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const HPG_SECRET = (process.env.HPG_SECRET || '').trim();

// Proxy server-side al plugin Purchase Gift (mismo patrón que /api/create-order
// con WP_SECRET: secreto solo del lado del servidor, nunca NEXT_PUBLIC_*). El
// navegador nunca ve HPG_SECRET ni pega directo a WordPress.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${WP_URL}/wp-json/hypestyle-gift/v1/evaluate`, {
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
      // Fail-open: si el plugin no está instalado/activo todavía, o WP está caído,
      // la barra simplemente no se muestra — nunca debe romper el carrito.
      return NextResponse.json({ active: false }, { status: 200 });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error('[gift-progress proxy]', err);
    return NextResponse.json({ active: false }, { status: 200 });
  }
}
