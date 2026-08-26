import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET    = process.env.WP_SECRET          || '';

export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page    = searchParams.get('page') || '1';
  const perPage = searchParams.get('per_page') || '30';

  const res = await fetch(
    `${WP_URL}/wp-json/hypestyle/v1/conversaciones?page=${page}&per_page=${perPage}`,
    { headers: { 'X-Hypestyle-Secret': WP_SECRET }, cache: 'no-store' }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: err.message || 'WP error' }, { status: 502 });
  }

  return NextResponse.json(await res.json());
}
