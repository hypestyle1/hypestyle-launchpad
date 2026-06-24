import { NextResponse } from 'next/server';

const WP = 'https://lightpink-rook-704850.hostingersite.com/wp-json/wc/v3';
const FLASH_SALE_ORDER_LIMIT = 100;
const SALE_AFTER = '2026-06-24T00:00:00';

export async function GET() {
  const key = (process.env.WC_CONSUMER_KEY ?? '').trim();
  const sec = (process.env.WC_CONSUMER_SECRET ?? '').trim();
  const auth = 'Basic ' + Buffer.from(`${key}:${sec}`).toString('base64');

  try {
    const res = await fetch(
      `${WP}/orders?after=${SALE_AFTER}&status=processing,on-hold,completed&per_page=1`,
      { headers: { Authorization: auth }, next: { revalidate: 60 } },
    );
    const total = parseInt(res.headers.get('X-WP-Total') ?? '0', 10);
    const count = Math.min(total, FLASH_SALE_ORDER_LIMIT);
    return NextResponse.json(
      { count, limit: FLASH_SALE_ORDER_LIMIT, full: count >= FLASH_SALE_ORDER_LIMIT },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' } },
    );
  } catch {
    return NextResponse.json({ count: 0, limit: FLASH_SALE_ORDER_LIMIT, full: false });
  }
}
