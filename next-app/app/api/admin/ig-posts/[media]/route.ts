import { NextRequest, NextResponse } from 'next/server';

import { authorizeAdmin } from '@/lib/admin-auth';
import { fixtureDetail } from '@/lib/ig-insights/fixtures';

/**
 * Ficha de una publicación (post + snapshots). SOLO LECTURA; mismo fallback a
 * datos de prueba que el listado mientras el gate B1 esté pendiente.
 */

export const dynamic = 'force-dynamic';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';

export async function GET(req: NextRequest, { params }: { params: { media: string } }) {
  if (!(await authorizeAdmin(req, 'creadores'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const media = params.media;
  if (!/^\d{5,40}$/.test(media)) {
    return NextResponse.json({ error: 'media inválido' }, { status: 400 });
  }

  try {
    const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/ig-posts/${media}?_cb=${Date.now()}`, {
      headers: { 'X-Hypestyle-Secret': process.env.WP_SECRET || '' },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ ...data, fixture: false });
    }
    if (res.status !== 404) {
      return NextResponse.json({ error: `WP respondió ${res.status}` }, { status: 502 });
    }
  } catch {
    // WP inalcanzable → fixtures, igual que el listado.
  }

  const demo = fixtureDetail(media);
  if (!demo) return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });
  return NextResponse.json({ ...demo, fixture: true });
}
