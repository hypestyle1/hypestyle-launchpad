import { NextRequest, NextResponse } from 'next/server';

// Hora de early access (close friends) y apertura pública
const EARLY_START = new Date('2026-06-24T19:00:00-03:00').getTime();
const PUBLIC_OPEN  = new Date('2026-06-24T20:00:00-03:00').getTime();

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Nunca interceptar: /acceso, /api/acceso, archivos estáticos
  if (
    pathname.startsWith('/acceso') ||
    pathname.startsWith('/api/acceso') ||
    pathname.startsWith('/_next') ||
    /\.[\w]{2,5}$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const now = Date.now();

  // Sitio abierto al público (después de las 20hs)
  if (now >= PUBLIC_OPEN) return NextResponse.next();

  // Todavía no arrancó el early access → gate igual
  // (el /acceso page maneja el countdown a las 19hs)

  // Tiene cookie de early access → dejarlo pasar
  if (request.cookies.get('hype_early_access')?.value === 'true') {
    return NextResponse.next();
  }

  // Bloquear → redirigir al gate
  const url = request.nextUrl.clone();
  url.pathname = '/acceso';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
