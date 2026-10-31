import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_CYBER, EARLY_START, PUBLIC_OPEN, emitirCookie } from '@/lib/cyber-gate';

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  // Fail closed: sin EARLY_ACCESS_PASSWORD configurada no se abre la puerta. El
  // fallback literal anterior vivía en la fuente pública del repo, así que la
  // clave del gate estaba a la vista de cualquiera.
  const correct = (process.env.EARLY_ACCESS_PASSWORD ?? '').trim();
  if (!correct) return NextResponse.json({ ok: false }, { status: 401 });

  // La clave no vale ANTES de las 19:00. Se comparte por Close Friends y
  // WhatsApp a esa hora, y entre las 00:00 y las 19:00 la tienda tiene que
  // estar cerrada para todos: si alguien la consigue antes —se filtra, la
  // reenvían— no debería poder entrar igual. Después de la apertura pública
  // tampoco hace falta: a esa altura el gate ya dejó de bloquear.
  const ahora = Date.now();
  if (ahora < EARLY_START) {
    return NextResponse.json({ ok: false, motivo: 'todavia-no' }, { status: 403 });
  }

  if (typeof password === 'string' && password.toUpperCase() === correct.toUpperCase()) {
    const res = NextResponse.json({ ok: true });
    // Vence con el evento: no tiene sentido una cookie que sobreviva al Cyber.
    // El vencimiento viaja FIRMADO, así que tampoco se puede estirar a mano.
    const vence = PUBLIC_OPEN + 1000 * 60 * 60 * 24 * 4;
    res.cookies.set(COOKIE_CYBER, await emitirCookie(vence, correct), {
      httpOnly: true,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
      path: '/',
      expires: new Date(vence),
    });
    return res;
  }

  return NextResponse.json({ ok: false }, { status: 401 });
}
