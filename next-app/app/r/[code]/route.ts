import { NextRequest, NextResponse } from 'next/server';
import { REF_COOKIE, REF_COOKIE_DIAS, isValidRefCode } from '@/lib/referidos';

// /r/<CODE>: el link que comparte el referidor. Acá NO se emite nada — se
// guarda la reserva en una cookie de 30 días y se manda al home, donde el
// modal de bienvenida (ReferralWelcomeModal) cuenta de qué se trata. El cupón
// real nace recién en el checkout, con el email del amigo.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const limpio = decodeURIComponent(code || '').toUpperCase();
  const res = NextResponse.redirect(new URL('/', req.url));
  if (isValidRefCode(limpio)) {
    res.cookies.set(REF_COOKIE, limpio, {
      maxAge: REF_COOKIE_DIAS * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
      // La lee el cliente (modal y checkout): sin httpOnly a propósito.
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
    });
  }
  return res;
}
