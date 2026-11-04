import { NextRequest, NextResponse } from 'next/server';

// Estado del crédito para /credito. El token HMAC lo firma y verifica el
// backend: acá solo se proxya. Sin cuenta, sin sesión.

export const dynamic = 'force-dynamic';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';

export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get('t') || '';
  if (!t || t.length > 600) return NextResponse.json({ error: 'Token faltante' }, { status: 400 });

  try {
    const r = await fetch(
      `${WP_URL}/wp-json/hypestyle/v1/credit-status?t=${encodeURIComponent(t)}`,
      { cache: 'no-store' },
    );
    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  } catch {
    return NextResponse.json({ error: 'Sin conexión con el servidor' }, { status: 502 });
  }
}
