import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';

// Acción de aprobación sobre un ContentItem → actualiza el snapshot approvalState
// y genera un evento inmutable en el backend. Aprobar ≠ publicar.

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = process.env.WP_SECRET || '';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const body = await req.json();
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/content/${params.id}/approval`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Hypestyle-Secret': WP_SECRET }, body: JSON.stringify(body),
  });
  if (res.status === 404) return NextResponse.json({ error: 'Backend 04C (PHP 1.26.0) no desplegado.' }, { status: 501 });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ error: data.message || 'WP error' }, { status: res.status });
  return NextResponse.json(data);
}
