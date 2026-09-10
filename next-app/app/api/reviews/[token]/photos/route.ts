import { NextRequest, NextResponse } from 'next/server';

// Proxy server-side hacia hypestyle-reviews/v1/reviews/{token}/photos —
// mismo patrón que app/api/reviews/[token]/submit/route.ts, pero multipart:
// el archivo se reenvía tal cual, sin pasar por JSON. El navegador nunca ve
// HS_REVIEWS_SECRET.
//
// El navegador ya redujo la foto a ~1600px (lib/reviews/photos.ts) antes de
// mandarla: las funciones de Vercel cortan el body en 4,5 MB, así que acá se
// rechaza cualquier cosa por encima de 4 MB con un mensaje claro en vez de
// dejar que Vercel devuelva un 413 sin cuerpo.
const WP_URL            = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const HS_REVIEWS_SECRET = process.env.HS_REVIEWS_SECRET  || '';

const TOKEN_RE  = /^[a-f0-9]{64}$/;
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED   = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!TOKEN_RE.test(token)) {
    return NextResponse.json({ code: 'not_found', message: 'No encontramos esta solicitud de reseña.' }, { status: 404 });
  }

  const incoming = await req.formData().catch(() => null);
  const file = incoming?.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ code: 'no_file', message: 'No recibimos ninguna foto.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ code: 'file_too_large', message: 'La foto es demasiado pesada (máximo 4 MB).' }, { status: 413 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ code: 'invalid_image', message: 'Solo aceptamos JPG, PNG, WEBP o GIF.' }, { status: 415 });
  }

  const forward = new FormData();
  forward.append('file', file, file.name || 'photo.jpg');

  const res = await fetch(`${WP_URL}/wp-json/hypestyle-reviews/v1/reviews/${token}/photos`, {
    method: 'POST',
    headers: { 'X-HS-Reviews-Secret': HS_REVIEWS_SECRET },
    body: forward,
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
