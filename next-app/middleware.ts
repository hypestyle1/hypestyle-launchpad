import { NextRequest, NextResponse } from 'next/server';
import { MAYORISTA_COOKIE, verifySessionToken } from '@/lib/mayorista-auth';
import { COUNTRY_COOKIE } from '@/lib/geo';
import { ORDER_KEY_RE, REPAGO_COOKIE_MAX_AGE, repagoCookie } from '@/lib/repago-link';

/* CYBER HYPE — ventana de bloqueo de la tienda (hora de Argentina).
 *
 * Antes acá sólo había `PUBLIC_OPEN` y la regla era "bloqueá todo lo anterior
 * a esa hora". Con una fecha pasada el gate quedaba permanentemente abierto
 * —que es como estuvo desde junio— y con una fecha futura la tienda se cerraba
 * en el instante del deploy. Por eso ahora hay un INICIO: sólo se bloquea
 * dentro de la ventana, así esto se puede desplegar con horas de anticipación
 * sin cerrar nada antes de tiempo.
 *
 *   00:00  LOCK_START   la tienda pública se cierra
 *   19:00  EARLY_START  se comparte la contraseña (Mejores Amigos / WhatsApp)
 *   20:00  PUBLIC_OPEN  apertura para todos, sin contraseña
 *
 * Durante todo el cierre se puede entrar con la contraseña. Las 19:00 son
 * solamente la difusión de la clave; no cambian la autorización.
 */
// Las tres horas y la cookie viven en lib/cyber-gate.ts, que también usa
// /acceso: así la pantalla cuenta hacia la hora en la que de verdad abre.
import { COOKIE_CYBER, LOCK_START, PUBLIC_OPEN, cookieValida } from '@/lib/cyber-gate';

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

async function handle(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const pagar = pagarKeyExchange(request);
  if (pagar) return pagar;

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

  /* Nunca interceptar.
   *
   * `/api` entero queda afuera a propósito: el gate es para la vidriera, no
   * para la trastienda. Si se bloqueara, un 302 a /acceso se comería los
   * webhooks de GOcuotas y PayPal, los callbacks de cobro (`confirm-paid`,
   * `paypal-capture`), los avisos de envío y los crons — o sea, se caerían
   * pedidos YA pagados, que es mucho peor que una visita de más. Las rutas de
   * /api que necesitan permiso ya tienen el suyo (secreto, sesión o firma). */
  if (
    pathname.startsWith('/acceso') ||
    pathname.startsWith('/api/') ||
    pathname === '/api' ||
    pathname.startsWith('/_next') ||
    /\.[\w]{2,5}$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const now = Date.now();

  // Fuera de la ventana de bloqueo: antes de las 00:00 y después de las 20:00
  // el sitio se comporta como siempre. Esto es lo que permite desplegar hoy
  // sin cerrar la tienda hasta la medianoche.
  if (now < LOCK_START || now >= PUBLIC_OPEN) return NextResponse.next();

  // Dentro de la ventana: pasa sólo quien ya puso la contraseña del Cyber.
  // La cookie va FIRMADA: un `true` pelado lo escribe cualquiera desde las
  // devtools. Si falta el secreto, fail closed — no entra nadie.
  const clave = (process.env.EARLY_ACCESS_PASSWORD ?? '').trim();
  if (await cookieValida(request.cookies.get(COOKIE_CYBER)?.value, clave, now)) {
    return NextResponse.next();
  }

  // Bloquear → redirigir al gate
  const url = request.nextUrl.clone();
  url.pathname = '/acceso';
  const response = NextResponse.redirect(url);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
