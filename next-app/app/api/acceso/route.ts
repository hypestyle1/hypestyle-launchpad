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
    res.cookies.set('hype_early_access', 'true', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24hs
    });
    return res;
  }

  return NextResponse.json({ ok: false }, { status: 401 });
}
