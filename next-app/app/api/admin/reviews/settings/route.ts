import { NextRequest, NextResponse } from 'next/server';

const WP_URL            = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const ADMIN_SECRET      = process.env.WP_SECRET          || '';
const HS_REVIEWS_SECRET = process.env.HS_REVIEWS_SECRET  || '';

export async function GET(req: NextRequest) {
  const key = req.headers.get('x-admin-key') || '';
  if (!ADMIN_SECRET || key !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const res = await fetch(`${WP_URL}/wp-json/hypestyle-reviews/v1/settings`, {
    headers: { 'X-HS-Reviews-Secret': HS_REVIEWS_SECRET },
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-admin-key') || '';
  if (!ADMIN_SECRET || key !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  const res = await fetch(`${WP_URL}/wp-json/hypestyle-reviews/v1/settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-HS-Reviews-Secret': HS_REVIEWS_SECRET,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ error: data.message || `WP ${res.status}` }, { status: res.status });
  return NextResponse.json(data);
}
