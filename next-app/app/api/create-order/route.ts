import { NextRequest, NextResponse } from 'next/server';
import { getPromo3x2Status } from '@/lib/promo-3x2-status';
import { compute3x2Discount } from '@/lib/promo-3x2';
import { getPromoChampionStatus } from '@/lib/promo-champion-status';
import { computeChampionDiscount } from '@/lib/promo-champion';

const WP_URL    = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = (process.env.WP_SECRET || '').replace(/^﻿/, '').trim();

// El checkout calcula el 3x2 y el 50% off "campeones" en el cliente y los manda en
// discountAmount/discountLabel sin validación server-side (igual que ya pasaba con las
// fechas hardcodeadas del 3x2 original). Como ambas promos dependen de un resultado real
// (Argentina ganó o no), si alguien fuerza cualquiera de las dos en el cliente después de
// que dejó de estar activa, recortamos esa porción antes de reenviar al PHP. No toca
// cupón ni descuento por transferencia, que viajan en el mismo campo.
async function sanitizeDiscount(payload: any) {
  const label = String(payload?.discountLabel || '');
  if (!label.includes('3x2') && !label.includes('CAMPEON50')) return payload;

  const items = Array.isArray(payload.items) ? payload.items : [];
  let discountAmount = Number(payload.discountAmount || 0);

  if (label.includes('CAMPEON50')) {
    const status = await getPromoChampionStatus().catch(() => null);
    if (!status?.promoActive) {
      const realChampion = computeChampionDiscount(items.map((it: any) => ({ id: it.id, price: it.price, quantity: it.quantity })));
      discountAmount = Math.max(0, discountAmount - realChampion);
    }
  }

  if (label.includes('3x2')) {
    const status = await getPromo3x2Status().catch(() => null);
    if (!status?.promoActive) {
      const real3x2 = compute3x2Discount(items.map((it: any) => ({ price: it.price, quantity: it.quantity })));
      discountAmount = Math.max(0, discountAmount - real3x2);
    }
  }

  return { ...payload, discountAmount };
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
