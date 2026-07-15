import { NextRequest, NextResponse } from 'next/server';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET    = process.env.WP_SECRET          || '';
const ADMIN_SECRET = process.env.WP_SECRET          || '';

export async function GET(req: NextRequest, { params }: { params: { contacto: string } }) {
  const key = req.headers.get('x-admin-key') || '';
  if (ADMIN_SECRET && key !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { contacto } = params;
  const { searchParams } = new URL(req.url);
  const canal = searchParams.get('canal') || '';

  const qs = canal ? `?canal=${encodeURIComponent(canal)}` : '';
  const res = await fetch(
    `${WP_URL}/wp-json/hypestyle/v1/conversaciones/${encodeURIComponent(contacto)}${qs}`,
    { headers: { 'X-Hypestyle-Secret': WP_SECRET }, cache: 'no-store' }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: err.message || 'WP error' }, { status: 502 });
  }

  return NextResponse.json(await res.json());
}
