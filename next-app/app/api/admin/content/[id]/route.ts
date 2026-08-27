import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = process.env.WP_SECRET || '';
const check = (req: NextRequest) => adminSecretMatches(req.headers.get('x-admin-key'));
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!check(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/content/${params.id}?_cb=${Date.now()}`, {
    headers: { 'X-Hypestyle-Secret': WP_SECRET }, cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!check(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const body = await req.json();
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/content/${params.id}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Hypestyle-Secret': WP_SECRET }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  // 409 = conflicto de concurrencia (expectedUpdatedAt no coincide).
  if (!res.ok) return NextResponse.json({ error: data.message || 'WP error', conflict: res.status === 409 }, { status: res.status });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!check(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const hard = req.nextUrl.searchParams.get('hard') === '1' ? '?hard=1' : '';
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/content/${params.id}${hard}`, {
    method: 'DELETE', headers: { 'X-Hypestyle-Secret': WP_SECRET },
  });
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.ok ? 200 : res.status });
}
