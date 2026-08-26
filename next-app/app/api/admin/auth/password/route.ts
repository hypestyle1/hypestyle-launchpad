import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, verifyAdminSession, authenticateAdmin, emailDePerfil, cambiarPasswordAdmin } from '@/lib/admin-profiles';

// Cambio de contraseña del propio perfil, ya estando adentro.
// Pide la actual además de la cookie: la sesión dura 12 horas y sin ese paso
// alcanzaría una compu prestada y abierta para dejar a alguien afuera.

const MIN = 8;

export async function POST(req: NextRequest) {
  const session = await verifyAdminSession(req.cookies.get(ADMIN_COOKIE)?.value);
  if (!session) return NextResponse.json({ ok: false, message: 'No autorizado' }, { status: 401 });

  const { actual, nueva } = await req.json().catch(() => ({}));
  if (typeof actual !== 'string' || typeof nueva !== 'string') {
    return NextResponse.json({ ok: false, message: 'Faltan datos' }, { status: 400 });
  }
  if (nueva.length < MIN) {
    return NextResponse.json({ ok: false, message: `La contraseña necesita al menos ${MIN} caracteres` }, { status: 400 });
  }
  if (nueva === actual) {
    return NextResponse.json({ ok: false, message: 'Elegí una contraseña distinta a la actual' }, { status: 400 });
  }

  const email = await emailDePerfil(session.id);
  if (!email) return NextResponse.json({ ok: false, message: 'No autorizado' }, { status: 401 });

  const check = await authenticateAdmin(email, actual);
  if ('failure' in check) {
    return NextResponse.json({ ok: false, message: 'La contraseña actual no coincide' }, { status: 403 });
  }
  if ('error' in check) {
    return NextResponse.json({ ok: false, message: 'Error de conexión, probá de nuevo' }, { status: 502 });
  }

  const ok = await cambiarPasswordAdmin(email, nueva);
  if (!ok) return NextResponse.json({ ok: false, message: 'No pudimos guardar la contraseña' }, { status: 502 });

  // La sesión sigue viva: la cookie va firmada contra el id, no contra la
  // contraseña, y echar a alguien justo después de hacer lo correcto sobra.
  return NextResponse.json({ ok: true });
}
