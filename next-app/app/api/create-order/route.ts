import { NextRequest, NextResponse } from 'next/server';
import { getPromo3x2Status } from '@/lib/promo-3x2-status';
import { compute3x2Discount } from '@/lib/promo-3x2';

const WP_URL    = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = (process.env.WP_SECRET || '').replace(/^﻿/, '').trim();

// El checkout calcula el 3x2 en el cliente y lo manda en discountAmount/discountLabel
// sin validación server-side (igual que ya pasaba con las fechas hardcodeadas). Como
// esta promo ahora depende de un resultado real (Argentina ganó o no), si alguien fuerza
// el 3x2 en el cliente después de una derrota, recortamos esa porción antes de reenviar
// al PHP. No toca cupón ni descuento por transferencia, que viajan en el mismo campo.
async function sanitizeDiscount(payload: any) {
  const label = String(payload?.discountLabel || '');
  if (!label.includes('3x2')) return payload;
  const status = await getPromo3x2Status().catch(() => null);
  if (status?.promoActive) return payload; // triunfo confirmado: el monto es legítimo
  const items = Array.isArray(payload.items) ? payload.items : [];
  const real3x2 = compute3x2Discount(items.map((it: any) => ({ price: it.price, quantity: it.quantity })));
  const otherDiscount = Math.max(0, Number(payload.discountAmount || 0) - real3x2);
  return { ...payload, discountAmount: otherDiscount };
}

export async function POST(req: NextRequest) {
  try {
    const payload = await sanitizeDiscount(await req.json());
    const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hypestyle-Secret': WP_SECRET, 'Authorization': `Bearer ${WP_SECRET}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[create-order proxy]', err);
    return NextResponse.json({ message: 'Error al conectar con WooCommerce' }, { status: 500 });
  }
}
