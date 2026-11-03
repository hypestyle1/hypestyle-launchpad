import { NextRequest, NextResponse } from 'next/server';
import { isValidRefCode } from '@/lib/referidos';

// Checkout del amigo: el backend valida TODO (primera compra, autorreferido,
// cupos) y, si pasa, emite el cupón de $8.000 atado a su mail. Idempotente por
// email: repetir la llamada devuelve el mismo cupón.

export const dynamic = 'force-dynamic';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const code = String(body?.code || '').toUpperCase();
  const email = String(body?.email || '').trim().toLowerCase();
  const phone = String(body?.phone || '').trim();
  if (!isValidRefCode(code) || !email.includes('@')) {
    return NextResponse.json({ valid: false, motivo: 'parametros' }, { status: 400 });
  }

  try {
    const r = await fetch(`${WP_URL}/wp-json/hypestyle/v1/referral-credit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, email, phone }),
      cache: 'no-store',
    });
    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  } catch {
    return NextResponse.json({ valid: false, motivo: 'conexion' }, { status: 502 });
  }
}
