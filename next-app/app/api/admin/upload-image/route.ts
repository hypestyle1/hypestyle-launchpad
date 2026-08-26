import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';

export const runtime = 'nodejs';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_USER      = process.env.WP_MEDIA_USER || '';
const WP_APP_PASS  = process.env.WP_MEDIA_APP_PASSWORD || '';

// Sube una imagen a la biblioteca de medios de WordPress y devuelve su URL pública.
// Requiere un usuario WP con Application Password (env WP_MEDIA_USER / WP_MEDIA_APP_PASSWORD).
export async function POST(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!WP_USER || !WP_APP_PASS) {
    return NextResponse.json({ error: 'Falta configurar WP_MEDIA_USER y WP_MEDIA_APP_PASSWORD en Vercel.' }, { status: 500 });
  }

  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const filename = (file.name || 'newsletter.png').replace(/[^\w.\-]/g, '_');

  const res = await fetch(`${WP_URL}/wp-json/wp/v2/media`, {
    method: 'POST',
    headers: {
      Authorization:         'Basic ' + Buffer.from(`${WP_USER}:${WP_APP_PASS}`).toString('base64'),
      'Content-Type':        file.type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
    body: buf,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json({ error: data?.message || `WP ${res.status}` }, { status: 502 });
  }
  // Devolver una versión redimensionada (mucho más liviana para el mail) en vez del original.
  // Excepción: los GIF se devuelven enteros para no perder la animación.
  const sizes = data?.media_details?.sizes || {};
  const isGif = (data?.mime_type || file.type) === 'image/gif';
  const url = isGif
    ? data.source_url
    : (sizes.large?.source_url || sizes.medium_large?.source_url || data.source_url);
  return NextResponse.json({ ok: true, url });
}
