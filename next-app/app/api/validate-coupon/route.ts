import { NextRequest, NextResponse } from 'next/server';
import { cuponConEnvioGratis } from '@/lib/cupon-envio-gratis';

const WP_URL    = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = (process.env.WP_SECRET || '').replace(/^﻿/, '').trim();

export async function POST(req: NextRequest) {
  try {
    // El mail va porque hay cupones personales (email_restrictions) y con tope
    // por persona (usage_limit_per_user): sin él, el PHP no los puede validar y
    // el checkout aprueba códigos que Woo rechaza al crear el pedido.
    const { code, total, email } = await req.json();
    const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/validate-coupon`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hypestyle-Secret': WP_SECRET,
        'Authorization': `Bearer ${WP_SECRET}`,
      },
      body: JSON.stringify({ code, total, email }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ valid: false, error: err.message || 'Error en el servidor' }, { status: res.status });
    }

    const data = await res.json();
    if (data?.valid) data.free_shipping = await cuponConEnvioGratis(code);
    return NextResponse.json(data);
  } catch (err) {
    console.error('[validate-coupon proxy]', err);
    return NextResponse.json({ valid: false, error: 'Error al conectar con el servidor' }, { status: 500 });
  }
}
