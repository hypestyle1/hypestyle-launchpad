import { NextResponse } from 'next/server';
import { syncDiscount, PRODUCT_ID } from '@/lib/goal-discount';

// Estado público del descuento por gol (para el badge del producto).
// Sincroniza (aplica/limpia + tope 20u) y devuelve el estado. Throttle 30s
// para no golpear Woo en cada visita.

export const revalidate = 0;

let cache: { at: number; data: any } | null = null;
const TTL = 30000;

export async function GET() {
  if (cache && Date.now() - cache.at < TTL) return NextResponse.json(cache.data);
  try {
    const status = await syncDiscount(true);
    const data = { ...status, productId: PRODUCT_ID };
    cache = { at: Date.now(), data };
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ active: false, error: String(e?.message || e) });
  }
}
