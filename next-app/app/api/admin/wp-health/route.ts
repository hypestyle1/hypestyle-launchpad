import { NextRequest, NextResponse } from 'next/server';
import { chequearConConfirmacion, enviarAlertaCaida } from '@/lib/wp-health';

// Vigía del backend WordPress. Cron de Vercel cada 5 minutos (vercel.json).
// Si /wp-json/ no responde 200 en dos sondeos seguidos, manda la alerta por
// mail con el fix conocido. El contexto del porqué vive en lib/wp-health.ts.

export const revalidate = 0;
export const maxDuration = 60;

const SECRET = (process.env.CRON_SECRET || '').trim();

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const provided = sp.get('secret') || req.headers.get('x-cron-secret') || bearer;
  // Fail closed: sin CRON_SECRET configurado el endpoint no queda abierto
  // (abierto permitiría usarnos para spamear la casilla de alertas).
  if (!SECRET || provided !== SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { caido, sondeos } = await chequearConConfirmacion();
  let alertaEnviada = false;
  if (caido) alertaEnviada = await enviarAlertaCaida(sondeos);

  return NextResponse.json({ ok: !caido, caido, alertaEnviada, sondeos });
}
