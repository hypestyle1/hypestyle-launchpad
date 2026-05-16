import { NextRequest, NextResponse } from 'next/server';

const WP_URL    = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = (process.env.WP_SECRET || '').replace(/^﻿/, '').trim();

export async function POST(req: NextRequest) {
  try {
    const { code, total } = await req.json();
    const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/validate-coupon`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hypestyle-Secret': WP_SECRET,
        'Authorization': `Bearer ${WP_SECRET}`,
      },
      body: JSON.stringify({ code, total }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ valid: false, error: err.message || 'Error en el servidor' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[validate-coupon proxy]', err);
    return NextResponse.json({ valid: false, error: 'Error al conectar con el servidor' }, { status: 500 });
  }
}
