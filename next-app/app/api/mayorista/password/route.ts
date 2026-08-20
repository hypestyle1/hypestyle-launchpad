import { NextRequest, NextResponse } from 'next/server';
import { MAYORISTA_COOKIE, verifySessionToken, authenticateMayoristaCustomer } from '@/lib/mayorista-auth';
import { getMayoristaById, setCustomerPassword } from '@/lib/mayorista-account';

// Cambio de contraseña hecho por el propio mayorista, ya logueado.
//
// Pide la clave actual además de la cookie: la sesión dura 30 días, así que sin
// este paso alcanzaría con una compu prestada y abierta para dejar al cliente
// afuera de su propia cuenta.

const MIN_LEN = 8;

export async function POST(req: NextRequest) {
  const customerId = await verifySessionToken(req.cookies.get(MAYORISTA_COOKIE)?.value);
  if (!customerId) return NextResponse.json({ ok: false, message: 'No autorizado' }, { status: 401 });

  const { current, next } = await req.json().catch(() => ({}));
  if (typeof current !== 'string' || typeof next !== 'string') {
    return NextResponse.json({ ok: false, message: 'Faltan datos' }, { status: 400 });
  }
  if (next.length < MIN_LEN) {
    return NextResponse.json({ ok: false, message: `La contraseña necesita al menos ${MIN_LEN} caracteres` }, { status: 400 });
  }
  if (next === current) {
    return NextResponse.json({ ok: false, message: 'Elegí una contraseña distinta a la actual' }, { status: 400 });
  }

  const account = await getMayoristaById(customerId);
  if (!account) return NextResponse.json({ ok: false, message: 'No autorizado' }, { status: 401 });

  const check = await authenticateMayoristaCustomer(account.email, current);
  if ('failure' in check) {
    return NextResponse.json({ ok: false, message: 'La contraseña actual no coincide' }, { status: 403 });
  }
  if ('error' in check) {
    console.error('[mayorista/password] WP error:', check.error);
    return NextResponse.json({ ok: false, message: 'Error de conexión, probá de nuevo' }, { status: 502 });
  }

  const ok = await setCustomerPassword(customerId, next);
  if (!ok) {
    return NextResponse.json({ ok: false, message: 'No pudimos guardar la contraseña. Probá de nuevo.' }, { status: 502 });
  }

  // La sesión sigue viva a propósito: la cookie va firmada contra el customerId,
  // no contra la contraseña, y echar al cliente justo después de que hizo lo
  // correcto solo agrega fricción.
  return NextResponse.json({ ok: true });
}
