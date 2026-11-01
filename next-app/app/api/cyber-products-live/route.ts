import { NextResponse } from 'next/server';
import { CYBER_START } from '@/lib/cyber-hype';
import { fetchAllProductsStrict } from '@/lib/products-server';
import { SLUGS_INTERNOS } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

/** Lectura aislada para la landing: no toca la caché compartida del carrito. */
export async function GET() {
  const serverTime = Date.now();
  const active = serverTime >= Date.parse(CYBER_START);
  try {
    const products = active ? (await fetchAllProductsStrict(true)).filter(p => !SLUGS_INTERNOS.has(p.slug)) : [];
    return NextResponse.json({ active, serverTime, products }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'No se pudieron actualizar los precios' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
