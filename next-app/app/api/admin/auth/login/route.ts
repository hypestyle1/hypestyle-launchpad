import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, authenticateAdmin, createAdminSession, PERMISOS } from '@/lib/admin-profiles';

export async function POST(req: NextRequest) {
  const { user, pass } = await req.json().catch(() => ({}));
  if (typeof user !== 'string' || typeof pass !== 'string') {
    return NextResponse.json({ ok: false, message: 'Faltan datos' }, { status: 400 });
  }

  const result = await authenticateAdmin(user, pass);

  if ('failure' in result) {
    if (result.failure === 'not_admin') {
      return NextResponse.json({ ok: false, message: 'Esta cuenta no tiene acceso al panel' }, { status: 403 });
    }
    return NextResponse.json({ ok: false, message: 'Usuario o contraseña incorrectos' }, { status: 401 });
  }
  if ('error' in result) {
    console.error('[admin/auth/login] WP error:', result.error);
    return NextResponse.json({ ok: false, message: 'Error de conexión, probá de nuevo' }, { status: 502 });
  }

  // Firmar antes de responder: si esto falla, el ingreso falla ruidoso y con
  // mensaje propio en vez de un 500 mudo.
  let token: string;
  try {
    token = await createAdminSession(result.profile);
  } catch (e) {
    console.error('[admin/auth/login] no se pudo firmar la sesión — revisar ADMIN_SESSION_SECRET / WP_SECRET:', e);
    return NextResponse.json({ ok: false, message: 'El panel está fuera de servicio' }, { status: 503 });
  }

  const res = NextResponse.json({
    ok: true,
    profile: result.profile,
    secciones: PERMISOS[result.profile.role] ?? [],
  });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return res;
}
