import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 0;

const WP_URL      = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_USER     = process.env.WP_MEDIA_USER || '';
const WP_APP_PASS = process.env.WP_MEDIA_APP_PASSWORD || '';
const SECRET      = (process.env.PROMO_TEST_SECRET || '').trim();

// Le permite a cualquiera con el secret cambiar la foto de FinalSection/ChampionTakeover
// subiendo una imagen desde el celu (ver app/subir-foto-final), sin tocar código ni
// depender de un deploy. La foto vive en la Biblioteca de medios de WordPress (mismo
// mecanismo que /api/admin/upload-image), siempre con el mismo prefijo de título para
// poder encontrar "la más reciente" sin guardar un puntero aparte.
const TITLE_PREFIX = 'hype-final-hero';

export async function GET() {
  try {
    const res = await fetch(
      `${WP_URL}/wp-json/wp/v2/media?search=${TITLE_PREFIX}&orderby=date&order=desc&per_page=1`,
      { cache: 'no-store' },
    );
    if (!res.ok) return NextResponse.json({ url: null });
    const data = await res.json();
    const url = Array.isArray(data) && data[0]?.source_url ? data[0].source_url : null;
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ url: null });
  }
}

export async function POST(req: NextRequest) {
  if (!SECRET) return NextResponse.json({ error: 'PROMO_TEST_SECRET no configurado' }, { status: 500 });
  if (!WP_USER || !WP_APP_PASS) {
    return NextResponse.json({ error: 'Falta configurar WP_MEDIA_USER y WP_MEDIA_APP_PASSWORD en Vercel.' }, { status: 500 });
  }

  const form = await req.formData();
  const secret = String(form.get('secret') || '');
  if (secret !== SECRET) return NextResponse.json({ error: 'Clave incorrecta' }, { status: 403 });

  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Falta la foto' }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = (file.name || '').split('.').pop() || 'jpg';
  const filename = `${TITLE_PREFIX}-${Date.now()}.${ext}`;

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

  return NextResponse.json({ ok: true, url: data.source_url });
}
