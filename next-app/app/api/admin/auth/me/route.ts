import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, verifyAdminSession, PERMISOS } from '@/lib/admin-profiles';
import { adminSecretMatches } from '@/lib/admin-auth';

// Quién soy: lo usa cada pantalla del panel para saber qué mostrar. Devuelve
// también el caso de la clave compartida, que no tiene identidad pero sí acceso
// completo mientras dure la convivencia.
export async function GET(req: NextRequest) {
  const session = await verifyAdminSession(req.cookies.get(ADMIN_COOKIE)?.value);
  if (session) {
    return NextResponse.json({ ok: true, role: session.role, id: session.id, secciones: PERMISOS[session.role] ?? [] });
  }
  if (adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ ok: true, role: 'owner', id: null, viaSharedKey: true, secciones: PERMISOS.owner });
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}
