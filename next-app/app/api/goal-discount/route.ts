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
    // expiresAt normalizado a UTC para el contador del cliente.
    const expiresAt = status.expiresAt
      ? new Date(/Z$/.test(status.expiresAt) ? status.expiresAt : status.expiresAt + 'Z').toISOString()
      : null;
    // "Últimas X" (chamuyo): baja con el tiempo hasta ~0 al vencer, nunca más que el real.
    let unitsLeft = status.remaining;
    if (status.active && expiresAt) {
      const end = new Date(expiresAt).getTime();
      const start = end - 24 * 3600 * 1000;
      const fracLeft = Math.max(0, Math.min(1, (end - Date.now()) / (end - start)));
      const timeLeft = Math.ceil((status.cap || 20) * fracLeft);
      unitsLeft = Math.max(0, Math.min(status.remaining, timeLeft));
    }
    const data = { ...status, expiresAt, unitsLeft, productId: PRODUCT_ID };
    cache = { at: Date.now(), data };
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ active: false, error: String(e?.message || e) });
  }
}
