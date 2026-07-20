import { NextRequest, NextResponse } from 'next/server';
import { MAYORISTA_COOKIE, createSessionToken, authenticateMayoristaCustomer } from '@/lib/mayorista-auth';

export async function POST(req: NextRequest) {
  const { user, pass } = await req.json();
  if (typeof user !== 'string' || typeof pass !== 'string') {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const result = await authenticateMayoristaCustomer(user, pass);
  if (!result) {
    return NextResponse.json({ ok: false, message: 'Usuario o contraseña incorrectos' }, { status: 401 });
  }
  if ('error' in result) {
    console.error('[mayorista/login] WP error:', result.error);
    return NextResponse.json({ ok: false, message: 'Error de conexión, probá de nuevo' }, { status: 502 });
  }

  const token = await createSessionToken(result.customerId);
  const res = NextResponse.json({ ok: true, label: result.label });
  res.cookies.set(MAYORISTA_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
