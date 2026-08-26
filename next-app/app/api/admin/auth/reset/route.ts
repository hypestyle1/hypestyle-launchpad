import { NextRequest, NextResponse } from 'next/server';
import { verificarResetAdmin, cambiarPasswordAdmin } from '@/lib/admin-profiles';

// Segundo paso del "olvidé mi contraseña" del panel. El link se quema al
// usarlo: al cambiar la clave, WordPress borra el nonce (ver el mu-plugin).

const MIN = 8;

export async function GET(req: NextRequest) {
  const datos = await verificarResetAdmin(req.nextUrl.searchParams.get('token') || '');
  return NextResponse.json({ valid: !!datos, email: datos?.email ?? null });
}

export async function POST(req: NextRequest) {
  const { token, password } = await req.json().catch(() => ({}));
  if (typeof token !== 'string' || !token) {
    return NextResponse.json({ ok: false, message: 'El link no es válido' }, { status: 400 });
  }
  if (typeof password !== 'string' || password.length < MIN) {
    return NextResponse.json({ ok: false, message: `La contraseña necesita al menos ${MIN} caracteres` }, { status: 400 });
  }

  const datos = await verificarResetAdmin(token);
  if (!datos) {
    return NextResponse.json({ ok: false, message: 'El link venció o ya se usó. Pedí uno nuevo desde el ingreso.' }, { status: 400 });
  }

  const ok = await cambiarPasswordAdmin(datos.email, password);
  if (!ok) return NextResponse.json({ ok: false, message: 'No pudimos guardar la contraseña' }, { status: 502 });
  return NextResponse.json({ ok: true });
}
