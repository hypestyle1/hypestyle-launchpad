import { NextResponse } from 'next/server';
import { syncDiscount, getActiveDiscountStatus, PRODUCT_ID } from '@/lib/goal-discount';
import { getArgentinaFixture, hasKey } from '@/lib/argentina-fixture';

// Estado público del descuento del producto (para el badge / píldora verde).
// syncDiscount(write=true) SOLO corre cuando el partido está en vivo.
// Para partido terminado o sin partido: solo lee el estado real de Woo.
// Esto permite que un descuento manual en WC persista sin que syncDiscount lo pise.
// Throttle 30s para no golpear Woo en cada visita.

export const revalidate = 0;

let cache: { at: number; data: any } | null = null;
const TTL = 30000;

export async function GET() {
  if (cache && Date.now() - cache.at < TTL) return NextResponse.json(cache.data);
  try {
    // Solo escribir en WC si hay partido en vivo; de lo contrario solo leer.
    const fx = hasKey() ? await getArgentinaFixture().catch(() => null) : null;
    if (fx?.live) {
      await syncDiscount(true);
    }
    const status = await getActiveDiscountStatus();
    const data = { ...status, productId: PRODUCT_ID };
    cache = { at: Date.now(), data };
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ active: false, error: String(e?.message || e) });
  }
}
