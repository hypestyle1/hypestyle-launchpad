import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';

// Content OS — list + create. Proxy server-side al CPT hs_content (WP), auth admin
// reutilizada. Persistencia server-side (multiusuario), nunca localStorage.

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = process.env.WP_SECRET || '';
const check = (req: NextRequest) => adminSecretMatches(req.headers.get('x-admin-key'));
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!check(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const qs = req.nextUrl.searchParams.toString();
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/content?${qs}&_cb=${Date.now()}`, {
    headers: { 'X-Hypestyle-Secret': WP_SECRET }, cache: 'no-store',
  });
  if (res.status === 404) return NextResponse.json({ items: [], total: 0, notDeployed: true });
  if (!res.ok) return NextResponse.json({ error: 'WP error' }, { status: 502 });
  return NextResponse.json(await res.json());
}

export async function POST(req: NextRequest) {
  if (!check(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const body = await req.json();
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/content`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Hypestyle-Secret': WP_SECRET }, body: JSON.stringify(body),
  });
  if (res.status === 404) return NextResponse.json({ error: 'Backend de Content OS (PHP 1.24.0) no desplegado.' }, { status: 501 });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ error: data.message || 'WP error' }, { status: res.status });
  return NextResponse.json(data, { status: 201 });
}
