import { NextRequest, NextResponse } from 'next/server';
import { MAYORISTA_COOKIE, createSessionToken, findMayoristaUser } from '@/lib/mayorista-auth';

export async function POST(req: NextRequest) {
  const { user, pass } = await req.json();
  if (typeof user !== 'string' || typeof pass !== 'string') {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const found = findMayoristaUser(user, pass);
  if (!found) {
    return NextResponse.json({ ok: false, message: 'Usuario o contraseña incorrectos' }, { status: 401 });
  }

  const token = await createSessionToken(found.user);
  const res = NextResponse.json({ ok: true, label: found.label || found.user });
  res.cookies.set(MAYORISTA_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
