import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';

// Live search de productos Woo — server-side. NUNCA expone las WC keys al browser
// ni carga todo el catálogo: busca por nombre/SKU con paginación real contra
// wc/v3/products. Devuelve IDs Woo reales para itemsSent / productIds.

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = process.env.WC_CONSUMER_KEY || '';
const WC_SEC = process.env.WC_CONSUMER_SECRET || '';
const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const search = (sp.get('search') || sp.get('q') || '').trim();
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1);
  const perPage = Math.min(30, Math.max(1, parseInt(sp.get('perPage') || '12', 10) || 12));
  const include = sp.get('include') || ''; // ids concretos (para hidratar itemsSent guardados)

  const qs = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
    status: 'publish',
    orderby: 'title',
    order: 'asc',
    _fields: 'id,name,sku,type,price,regular_price,images',
  });
  if (search) qs.set('search', search);
  if (include) qs.set('include', include);

  const res = await fetch(`${WP_URL}/wp-json/wc/v3/products?${qs.toString()}&_cb=${Date.now()}`, {
    headers: { Authorization: wcAuth() }, cache: 'no-store',
  });
  if (!res.ok) return NextResponse.json({ products: [], error: 'WC error' }, { status: 502 });
  const data = await res.json().catch(() => []);
  if (!Array.isArray(data)) return NextResponse.json({ products: [] });

  const products = data.map((p: any) => ({
    id: p.id,
    name: (p.name || '').replace(/&#8211;/g, '–').replace(/&amp;/g, '&'),
    sku: p.sku || '',
    type: p.type || 'simple',
    variable: p.type === 'variable',
    price: parseFloat(p.regular_price || p.price || '0') || 0,
    image: Array.isArray(p.images) && p.images[0]?.src ? p.images[0].src : null,
  }));

  return NextResponse.json({ products, page, hasMore: products.length === perPage });
}
