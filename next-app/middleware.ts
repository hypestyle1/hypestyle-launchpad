import { NextRequest, NextResponse } from 'next/server';
import { MAYORISTA_COOKIE, verifySessionToken } from '@/lib/mayorista-auth';
import { COUNTRY_COOKIE } from '@/lib/geo';
import { ORDER_KEY_RE, REPAGO_COOKIE_MAX_AGE, repagoCookie } from '@/lib/repago-link';
import { HYPE72_GATE_COOKIE } from '@/lib/hype72';

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

/**
 * /pagar/<id>?key=<order_key>: la clave se pasa a una cookie httpOnly y se
 * redirige a la misma URL sin query, antes de renderizar nada. Así la clave
 * nunca queda en una URL que vean el pixel, GA4 o Clarity (que mandan
 * `location.href` por su cuenta). Acá no se valida contra Woo: eso lo hace la
 * página con el valor de la cookie.
 */
function pagarKeyExchange(request: NextRequest): NextResponse | null {
  const match = /^\/pagar\/(\d{1,10})\/?$/.exec(request.nextUrl.pathname);
  if (!match || !request.nextUrl.searchParams.has('key')) return null;
  const key = request.nextUrl.searchParams.get('key') || '';
  const url = request.nextUrl.clone();
  url.searchParams.delete('key');
  const response = NextResponse.redirect(url, 307);
  if (ORDER_KEY_RE.test(key)) {
    response.cookies.set(repagoCookie(match[1]), key, {
      path: '/',
      httpOnly: true,
      secure: request.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      maxAge: REPAGO_COOKIE_MAX_AGE,
    });
  }
  return response;
}

/**
 * /hype72?key=<EARLY_ACCESS_PASSWORD>: mismo canje que /pagar — la clave pasa a
 * la cookie del gate y se redirige a la URL limpia, así no queda en una URL que
 * vean el pixel, GA4 o Clarity. Es la forma de revisar la landing antes de la
 * apertura con un solo link, sin inventar otra pantalla de contraseña.
 *
 * No valida nada contra una lista de usuarios: la clave es la que ya existe
 * (`EARLY_ACCESS_PASSWORD`, la misma de /api/acceso) y la comparación se hace
 * acá para no mandar al visitante a una pantalla más. Fail closed: sin la
 * variable cargada no se entrega la cookie. Quien no tenga la clave ve el 404
 * que devuelve la propia página (app/hype72/page.tsx).
 */
function hype72KeyExchange(request: NextRequest): NextResponse | null {
  if (!isUnder(request.nextUrl.pathname, '/hype72')) return null;
  if (!request.nextUrl.searchParams.has('key')) return null;
  const key = (request.nextUrl.searchParams.get('key') || '').trim();
  const correct = (process.env.EARLY_ACCESS_PASSWORD ?? '').trim();
  const url = request.nextUrl.clone();
  url.searchParams.delete('key');
  const response = NextResponse.redirect(url, 307);
  if (correct && key.toUpperCase() === correct.toUpperCase()) {
    response.cookies.set(HYPE72_GATE_COOKIE, 'true', {
      path: '/',
      httpOnly: true,
      secure: request.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 h, igual que /api/acceso
    });
  }
  return response;
}

async function handle(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const pagar = pagarKeyExchange(request);
  if (pagar) return pagar;

  const hype72 = hype72KeyExchange(request);
  if (hype72) return hype72;

  // Área mayorista: gate propio, independiente del early-access del sitio público.
  if (isUnder(pathname, '/mayoristas') || isUnder(pathname, '/api/mayorista')) {
    // Recuperar la contraseña y pedir acceso pasan sin sesión, por definición:
    // el que llega acá es justamente el que todavía no puede entrar.
    if (
      pathname.startsWith('/mayoristas/login') ||
      pathname.startsWith('/mayoristas/reset') ||
      pathname.startsWith('/mayoristas/solicitud') ||
      // Página pública "Cómo funciona": la lee quien todavía no tiene cuenta.
      pathname.startsWith('/mayoristas/como-funciona') ||
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
