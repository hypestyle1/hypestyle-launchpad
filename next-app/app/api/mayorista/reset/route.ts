import { NextRequest, NextResponse } from 'next/server';
import { verifyResetToken, setCustomerPassword, burnedNonceMeta } from '@/lib/mayorista-account';

// Segundo paso de "olvidé mi contraseña": el cliente llega con el token del
// mail y elige una clave nueva. El token se quema al usarlo (se borra el nonce
// del perfil), así que el link vale una sola vez.

const MIN_LEN = 8;

export async function POST(req: NextRequest) {
  const { token, password } = await req.json().catch(() => ({}));

  if (typeof token !== 'string' || !token) {
    return NextResponse.json({ ok: false, message: 'El link no es válido' }, { status: 400 });
  }
  if (typeof password !== 'string' || password.length < MIN_LEN) {
    return NextResponse.json({ ok: false, message: `La contraseña necesita al menos ${MIN_LEN} caracteres` }, { status: 400 });
  }

  const customerId = await verifyResetToken(token);
  if (!customerId) {
    return NextResponse.json({ ok: false, message: 'El link venció o ya se usó. Pedí uno nuevo desde el login.' }, { status: 400 });
  }

  const ok = await setCustomerPassword(customerId, password, burnedNonceMeta());
  if (!ok) {
    return NextResponse.json({ ok: false, message: 'No pudimos guardar la contraseña. Probá de nuevo.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

// El formulario pregunta primero si el link sigue vivo, para mostrar el error
// antes de que el cliente tipee una contraseña al pedo.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';
  const customerId = await verifyResetToken(token);
  return NextResponse.json({ valid: !!customerId });
}
