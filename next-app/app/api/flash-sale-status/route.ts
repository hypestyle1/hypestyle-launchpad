import { NextResponse } from 'next/server';
import { isFlashSaleActive } from '@/lib/flash-sale';

const WP = 'https://lightpink-rook-704850.hostingersite.com/wp-json/wc/v3';
const FLASH_SALE_ORDER_LIMIT = 100;
const FLASH_SALE_ORDER_OFFSET = 30; // revertir cuando haya 50 órdenes reales
const SALE_AFTER = '2026-06-24T00:00:00';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Fuera de la ventana del sale no hay nada que contar. Sin este corte, la
  // barra (montada en el layout) seguía pegándole a wc/v3/orders cada 30 s por
  // visitante tres meses después del sale: el 12/09/2026 Hostinger registró
  // esta consulta como origen de los 503 durante la inestabilidad de WP.
  if (!isFlashSaleActive()) {
    return NextResponse.json(
      { count: 0, limit: FLASH_SALE_ORDER_LIMIT, full: false, active: false },
      { headers: { 'Cache-Control': 'public, max-age=3600' } },
    );
  }

  const key = (process.env.WC_CONSUMER_KEY ?? '').trim();
  const sec = (process.env.WC_CONSUMER_SECRET ?? '').trim();
  const auth = 'Basic ' + Buffer.from(`${key}:${sec}`).toString('base64');

  try {
    const res = await fetch(
      `${WP}/orders?after=${SALE_AFTER}&status=processing,on-hold,completed&per_page=1`,
      { headers: { Authorization: auth }, cache: 'no-store' },
    );
    const total = parseInt(res.headers.get('X-WP-Total') ?? '0', 10);
    const count = Math.min(total + FLASH_SALE_ORDER_OFFSET, FLASH_SALE_ORDER_LIMIT);
    return NextResponse.json(
      { count, limit: FLASH_SALE_ORDER_LIMIT, full: count >= FLASH_SALE_ORDER_LIMIT },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ count: 0, limit: FLASH_SALE_ORDER_LIMIT, full: false });
  }
}
