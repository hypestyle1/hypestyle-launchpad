import { NextRequest, NextResponse } from 'next/server';
import { cuponConEnvioGratis } from '@/lib/cupon-envio-gratis';

const WP_URL    = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = (process.env.WP_SECRET || '').replace(/^﻿/, '').trim();

export async function POST(req: NextRequest) {
  try {
    // El mail va porque hay cupones personales (email_restrictions) y con tope
    // por persona (usage_limit_per_user): sin él, el PHP no los puede validar y
    // el checkout aprueba códigos que Woo rechaza al crear el pedido.
    // `items` = [{ id: <slug del carrito>, qty }]. El PHP resuelve el slug a id
    // de Woo y devuelve la elegibilidad por línea: así el descuento que se
    // muestra es el que Woo va a aplicar, y el front no mantiene una segunda
    // lista de exclusiones (ver lib/cupon-lineas).
    const { code, total, email, items } = await req.json();
    const lineas = Array.isArray(items)
      ? items.slice(0, 60).map((it: { id?: unknown; quantity?: unknown; qty?: unknown }) => ({
          id: String(it?.id ?? ''),
          qty: Math.max(1, Math.floor(Number(it?.quantity ?? it?.qty ?? 1)) || 1),
        })).filter((it) => it.id !== '')
      : [];
    const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/validate-coupon`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hypestyle-Secret': WP_SECRET,
        'Authorization': `Bearer ${WP_SECRET}`,
      },
      body: JSON.stringify(lineas.length ? { code, total, email, items: lineas } : { code, total, email }),
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
