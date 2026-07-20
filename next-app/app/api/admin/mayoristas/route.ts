import { NextRequest, NextResponse } from 'next/server';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';
const ADMIN_SECRET = process.env.WP_SECRET           || '';

function wcAuth() {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
}

async function wcFetch(path: string) {
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/${path}`, {
    headers: { Authorization: wcAuth() },
    cache: 'no-store',
  });
  return res;
}

function metaVal(meta: any[], key: string): string {
  return meta?.find((m: any) => m.key === key)?.value ?? '';
}

export async function GET(req: NextRequest) {
  const key = req.headers.get('x-admin-key') || '';
  if (ADMIN_SECRET && key !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // WC REST no filtra customers por meta_data — traemos todos (paginado) y
  // nos quedamos con los que pasaron alguna vez por el alta mayorista.
  const all: any[] = [];
  for (let page = 1; page <= 20; page++) {
    const res = await wcFetch(`customers?per_page=100&page=${page}&_fields=id,email,first_name,last_name,billing,date_created,meta_data`);
    if (!res.ok) break;
    const batch = await res.json() as any[];
    all.push(...batch);
    if (batch.length < 100) break;
  }

  const mayoristas = all.filter(c => (c.meta_data ?? []).some((m: any) => m.key === 'es_mayorista'));

  const EXCLUDED_STATUSES = new Set(['cancelled', 'failed', 'refunded', 'trash']);

  const withStats = await Promise.all(mayoristas.map(async (c) => {
    const meta = c.meta_data ?? [];
    let orderCount = 0;
    let totalSpent = 0;
    try {
      const ordRes = await wcFetch(`orders?customer=${c.id}&status=any&per_page=100&_fields=id,status,total`);
      if (ordRes.ok) {
        const orders = (await ordRes.json() as any[]).filter(o => !EXCLUDED_STATUSES.has(o.status));
        orderCount = orders.length;
        totalSpent = orders.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0);
      }
    } catch {}

    return {
      id: c.id,
      email: c.email,
      name: `${c.first_name} ${c.last_name}`.trim(),
      company: c.billing?.company || '',
      phone: c.billing?.phone || '',
      city: c.billing?.city || '',
      minOrderOverride: metaVal(meta, 'mayorista_min_order') || null,
      active: metaVal(meta, 'es_mayorista') === 'yes',
      createdAt: c.date_created,
      orderCount,
      totalSpent,
    };
  }));

  withStats.sort((a, b) => b.totalSpent - a.totalSpent);

  return NextResponse.json({ mayoristas: withStats });
}
