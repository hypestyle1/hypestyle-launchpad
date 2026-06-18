import { NextResponse } from 'next/server';
import { syncDiscount, getActiveDiscountStatus, PRODUCT_ID } from '@/lib/goal-discount';

// Estado público del descuento del producto (para el badge / píldora verde).
// 1) syncDiscount aplica/limpia el descuento POR GOL si hay partido en juego.
// 2) getActiveDiscountStatus lee el SALE REAL aplicado en Woo y devuelve el estado
//    (sirve también para una extensión manual del descuento, sin partido).
// Throttle 30s para no golpear Woo en cada visita.

export const revalidate = 0;

let cache: { at: number; data: any } | null = null;
const TTL = 30000;

export async function GET() {
  if (cache && Date.now() - cache.at < TTL) return NextResponse.json(cache.data);
  try {
    await syncDiscount(true);                       // aplica el descuento por gol si corresponde
    const status = await getActiveDiscountStatus();  // estado del sale real (gol o manual)
    const data = { ...status, productId: PRODUCT_ID };
    cache = { at: Date.now(), data };
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ active: false, error: String(e?.message || e) });
  }
}
