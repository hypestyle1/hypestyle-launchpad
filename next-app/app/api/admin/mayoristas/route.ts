import { NextRequest, NextResponse } from 'next/server';
import { statusFromMeta } from '@/lib/mayorista-account';

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
  if (!ADMIN_SECRET || key !== ADMIN_SECRET) {
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
    let lastOrderAt: string | null = null;
    try {
      const ordRes = await wcFetch(`orders?customer=${c.id}&status=any&per_page=100&orderby=date&order=desc&_fields=id,status,total,date_created`);
      if (ordRes.ok) {
        const orders = (await ordRes.json() as any[]).filter(o => !EXCLUDED_STATUSES.has(o.status));
        orderCount = orders.length;
        totalSpent = orders.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0);
        lastOrderAt = orders[0]?.date_created ?? null;
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
      // 'active' se conserva para no romper nada que ya lo lea; 'status' es el
      // que distingue una solicitud pendiente de un acceso revocado — antes
      // ambas caían en el mismo 'false'.
      active: metaVal(meta, 'es_mayorista') === 'yes',
      status: statusFromMeta(metaVal(meta, 'es_mayorista')),
      cuit: metaVal(meta, 'mayorista_cuit'),
      instagram: metaVal(meta, 'mayorista_instagram'),
      localFisico: metaVal(meta, 'mayorista_local_fisico') === 'yes',
      modalidad: metaVal(meta, 'mayorista_modalidad'),
      solicitadoEl: metaVal(meta, 'mayorista_solicitud_fecha') || null,
      createdAt: c.date_created,
      orderCount,
      totalSpent,
      lastOrderAt,
      lastLogin: metaVal(meta, 'mayorista_last_login') || null,
      loginCount: Number(metaVal(meta, 'mayorista_login_count')) || 0,
    };
  }));

  withStats.sort((a, b) => b.totalSpent - a.totalSpent);

  return NextResponse.json({ mayoristas: withStats });
}
