import { NextRequest, NextResponse } from 'next/server';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';
const ADMIN_SECRET = process.env.WP_SECRET          || '';

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

function checkAuth(req: NextRequest) {
  const key = req.headers.get('x-admin-key') || '';
  return !ADMIN_SECRET || key === ADMIN_SECRET;
}

// Trae todos los productos publicados (no variaciones) con su perfil de costo asignado.
async function fetchAllProducts() {
  const all: any[] = [];
  for (let page = 1; ; page++) {
    const res = await fetch(
      `${WP_URL}/wp-json/wc/v3/products?per_page=100&page=${page}&status=publish&_cb=${Date.now()}`,
      { headers: { Authorization: wcAuth() }, next: { revalidate: 0 } }
    );
    if (!res.ok) break;
    const data = (await res.json()) as any[];
    if (!data.length) break;
    all.push(...data);
    if (data.length < 100) break;
  }
  return all;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const products = await fetchAllProducts();

  const list = products.map((p) => {
    const profileId = (p.meta_data as any[])?.find((m: any) => m.key === '_hs_cost_profile_id')?.value || '';
    return {
      id:         p.id,
      name:       p.name,
      image:      p.images?.[0]?.src || '',
      categories: (p.categories as any[])?.map((c: any) => c.name) || [],
      price:      parseFloat(p.price || p.regular_price || '0'),
      profileId:  String(profileId),
    };
  });

  return NextResponse.json({ products: list });
}

// Asigna (o quita) un perfil de costo a una lista de productos de una.
export async function PUT(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { productIds, profileId } = await req.json() as { productIds: number[]; profileId: string };
  if (!Array.isArray(productIds) || !productIds.length) {
    return NextResponse.json({ error: 'productIds requerido' }, { status: 400 });
  }

  const results = await Promise.all(productIds.map(async (id) => {
    const res = await fetch(`${WP_URL}/wp-json/wc/v3/products/${id}`, {
      method:  'PUT',
      headers: { Authorization: wcAuth(), 'Content-Type': 'application/json' },
      body:    JSON.stringify({ meta_data: [{ key: '_hs_cost_profile_id', value: profileId || '' }] }),
    });
    return { id, ok: res.ok };
  }));

  const failed = results.filter((r) => !r.ok).map((r) => r.id);
  return NextResponse.json({ ok: failed.length === 0, updated: results.length - failed.length, failed });
}
