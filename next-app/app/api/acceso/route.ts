import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  // Fail closed: sin EARLY_ACCESS_PASSWORD configurada no se abre la puerta. El
  // fallback literal anterior vivía en la fuente pública del repo, así que la
  // clave del gate estaba a la vista de cualquiera.
  const correct = (process.env.EARLY_ACCESS_PASSWORD ?? '').trim();
  if (!correct) return NextResponse.json({ ok: false }, { status: 401 });

  if (typeof password === 'string' && password.toUpperCase() === correct.toUpperCase()) {
    const res = NextResponse.json({ ok: true });
    // Cookie propia del Cyber: la de junio no sirve para saltear este gate.
    res.cookies.set('hype_cyber_access', 'true', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      // Cubre toda la ventana del evento: quien entra a las 19:00 del 1/11 no
      // vuelve a ver el gate (que de todos modos se abre solo a las 20:00).
      maxAge: 60 * 60 * 24 * 5,
    });
    return res;
  }

  return NextResponse.json({ ok: false }, { status: 401 });
}
