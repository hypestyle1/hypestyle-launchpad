import { NextRequest, NextResponse } from 'next/server';

const WP_URL    = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = (process.env.WP_SECRET || '').replace(/^﻿/, '').trim();
const WC_KEY    = (process.env.WC_CONSUMER_KEY || '').trim();
const WC_SEC    = (process.env.WC_CONSUMER_SECRET || '').trim();

// Lee el flag "free shipping" del cupón (Woo). El validate-coupon del PHP solo
// devuelve %/monto fijo; esto permite cupones de envío gratis (envío = $0, igual
// que el umbral de envío gratis) sin tocar el PHP.
async function couponFreeShipping(code: string): Promise<boolean> {
  if (!WC_KEY || !WC_SEC || !code) return false;
  try {
    const r = await fetch(`${WP_URL}/wp-json/wc/v3/coupons?code=${encodeURIComponent(code)}`, {
      headers: { Authorization: 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64') },
      cache: 'no-store',
    });
    const arr = await r.json();
    const c = Array.isArray(arr) ? arr[0] : null;
    return !!c?.free_shipping;
  } catch { return false; }
}

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
    if (data?.valid) data.free_shipping = await couponFreeShipping(code);
    return NextResponse.json(data);
  } catch (err) {
    console.error('[validate-coupon proxy]', err);
    return NextResponse.json({ valid: false, error: 'Error al conectar con el servidor' }, { status: 500 });
  }
}
