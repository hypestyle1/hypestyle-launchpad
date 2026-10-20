import { NextRequest, NextResponse } from 'next/server';
import { MAYORISTA_COOKIE, verifySessionToken } from '@/lib/mayorista-auth';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';

// Los videos pesan decenas de MB y WP puede tardar en servirlos.
export const maxDuration = 120;

// Proxy de descarga del banco de contenido: las fotos/videos viven en el WP y
// un <a download> cross-origin no fuerza la descarga, así que se sirven desde
// acá con Content-Disposition. Solo medios de wp-content/uploads del WP propio.
export async function GET(req: NextRequest) {
  const customerId = await verifySessionToken(req.cookies.get(MAYORISTA_COOKIE)?.value);
  if (!customerId) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const src = req.nextUrl.searchParams.get('src') || '';
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return NextResponse.json({ message: 'URL inválida' }, { status: 400 });
  }
  if (url.origin !== new URL(WP_URL).origin || !url.pathname.startsWith('/wp-content/uploads/')) {
    return NextResponse.json({ message: 'URL inválida' }, { status: 400 });
  }

  const upstream = await fetch(url.toString());
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ message: 'No se pudo descargar el archivo' }, { status: 502 });
  }

  const basename = decodeURIComponent(url.pathname.split('/').pop() || 'archivo').replace(/[^\w.\-]+/g, '-');
  const headers = new Headers({
    'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${basename}"`,
    'Cache-Control': 'private, max-age=3600',
  });
  const len = upstream.headers.get('content-length');
  if (len) headers.set('Content-Length', len);

  return new Response(upstream.body, { headers });
}
