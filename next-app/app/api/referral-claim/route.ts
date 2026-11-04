import { NextRequest, NextResponse } from 'next/server';
import { isValidRefCode } from '@/lib/referidos';

// El amigo entró por el link: valida el código y trae los datos para el modal
// (nombre del referidor, montos). No emite ningún cupón.

export const dynamic = 'force-dynamic';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const code = String(body?.code || '').toUpperCase();
  if (!isValidRefCode(code)) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const r = await fetch(`${WP_URL}/wp-json/hypestyle/v1/referral-claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      cache: 'no-store',
    });
    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
