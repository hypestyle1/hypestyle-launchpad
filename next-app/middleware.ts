import { NextRequest, NextResponse } from 'next/server';
import { MAYORISTA_COOKIE, verifySessionToken } from '@/lib/mayorista-auth';
import { COUNTRY_COOKIE } from '@/lib/geo';

// Hora de early access (close friends) y apertura pública
const EARLY_START = new Date('2026-06-24T19:00:00-03:00').getTime();
const PUBLIC_OPEN  = new Date('2026-06-24T20:00:00-03:00').getTime();

// startsWith suelto matchea de más (ej. "/api/mayorista-lead-notify" quedaba
// atrapado por "/api/mayorista" y nunca llegaba a su propio handler) — estas
// dos exigen que después del prefijo venga "/" o termine ahí.
function isUnder(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + '/');
}

/**
 * Deja el país del visitante en una cookie para que el cliente lo lea sin
 * pedirlo a ningún servicio externo. Vercel ya resuelve la geolocalización en
 * el borde y no cuesta nada; hasta acá el sitio dependía de un fetch a ipapi.co
 * desde el navegador, que los ad-blockers cortan y que tiene límite de uso.
 *
 * Va como cookie y no como header leído en el layout a propósito: leer headers
 * en el layout raíz vuelve dinámico el renderizado de todo el sitio y tiraría
 * abajo el trabajo de SSR y de CLS que ya está hecho.
 *
 * No es httpOnly porque el punto es justamente que la lea el cliente. No hay
 * nada sensible en un código de país que el propio visitante ya conoce.
 */
function withCountry(response: NextResponse, request: NextRequest): NextResponse {
  const country = request.geo?.country || request.headers.get('x-vercel-ip-country') || '';
  // En local no hay geo: se deja la cookie como está para no pisar una prueba
  // manual desde las devtools.
  if (!country) return response;
  if (request.cookies.get(COUNTRY_COOKIE)?.value === country) return response;
  response.cookies.set(COUNTRY_COOKIE, country, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
  });
  return response;
}

export async function middleware(request: NextRequest) {
  return withCountry(await handle(request), request);
}

async function handle(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Área mayorista: gate propio, independiente del early-access del sitio público.
  if (isUnder(pathname, '/mayoristas') || isUnder(pathname, '/api/mayorista')) {
    // Recuperar la contraseña y pedir acceso pasan sin sesión, por definición:
    // el que llega acá es justamente el que todavía no puede entrar.
    if (
      pathname.startsWith('/mayoristas/login') ||
      pathname.startsWith('/mayoristas/reset') ||
      pathname.startsWith('/mayoristas/solicitud') ||
      pathname.startsWith('/api/mayorista/login') ||
      pathname.startsWith('/api/mayorista/forgot') ||
      pathname.startsWith('/api/mayorista/reset') ||
      pathname.startsWith('/api/mayorista/solicitud') ||
      /\.[\w]{2,5}$/.test(pathname)
    ) {
      return NextResponse.next();
    }
    const username = await verifySessionToken(request.cookies.get(MAYORISTA_COOKIE)?.value);
    if (!username) {
      if (isUnder(pathname, '/api/mayorista')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      url.pathname = '/mayoristas/login';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

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
