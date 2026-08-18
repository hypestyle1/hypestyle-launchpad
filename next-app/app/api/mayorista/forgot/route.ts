import { NextRequest, NextResponse } from 'next/server';
import { findActiveMayoristaByEmail, createResetToken, sendResetLinkEmail } from '@/lib/mayorista-account';

// "Olvidé mi contraseña" del catálogo mayorista.
//
// Siempre responde ok, exista o no la cuenta: si contestara distinto, cualquiera
// podría usar este endpoint para averiguar qué mails son mayoristas nuestros.
// Lo que pasó o dejó de pasar se ve en los logs, no en la respuesta.

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({ email: '' }));
  if (typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ ok: false, message: 'Escribí un mail válido' }, { status: 400 });
  }

  const account = await findActiveMayoristaByEmail(email.trim());
  if (!account) {
    console.warn('[mayorista/forgot] sin cuenta mayorista activa para el mail pedido');
    return NextResponse.json({ ok: true });
  }

  const token = await createResetToken(account.id);
  if (!token) {
    // Mismo origen que el 503 del login: sin MAYORISTA_SESSION_SECRET no se
    // puede firmar nada. Acá se avisa fuerte en el log en vez de fingir que el
    // mail salió, porque si no el cliente espera un mail que nunca llega.
    console.error('[mayorista/forgot] no se pudo firmar el token — revisar MAYORISTA_SESSION_SECRET en Vercel');
    return NextResponse.json({ ok: false, message: 'La recuperación está fuera de servicio. Escribinos y te damos acceso.' }, { status: 503 });
  }

  const sent = await sendResetLinkEmail(account, token);
  if (!sent) {
    return NextResponse.json({ ok: false, message: 'No pudimos enviarte el mail. Escribinos y te damos acceso.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
