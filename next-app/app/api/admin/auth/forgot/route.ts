import { NextRequest, NextResponse } from 'next/server';
import { crearResetAdmin } from '@/lib/admin-profiles';
import { enviarResetAdmin } from '@/lib/admin-mails';

// "Olvidé mi contraseña" del panel.
// Responde siempre lo mismo exista o no el perfil: si contestara distinto,
// este endpoint serviría para averiguar qué mails tienen acceso al panel.

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}));
  if (typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ ok: false, message: 'Escribí un mail válido' }, { status: 400 });
  }

  const creado = await crearResetAdmin(email.trim().toLowerCase());
  if (!creado) {
    console.warn('[admin/forgot] sin perfil de panel para el mail pedido');
    return NextResponse.json({ ok: true });
  }

  const enviado = await enviarResetAdmin(creado.datos, creado.token);
  if (!enviado) {
    return NextResponse.json({ ok: false, message: 'No pudimos enviarte el mail. Pedile a quien administra que te la cambie.' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
