import { NextRequest, NextResponse } from 'next/server';
import { isMockMode, isPrivateAccessActive, isValidHandle, normalizeHandle } from '@/lib/private-access/config';
import { cookieOptions, createSessionToken, sessionExpiry } from '@/lib/private-access/session';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

/**
 * POST { handle, name? } → desbloquea el acceso.
 *
 * La validación real contra la whitelist la hace el mu-plugin (server-to-
 * server, con el secreto); el browser solo recibe sí/no y la cookie firmada.
 * Hoy, en modo mock, el único usuario autorizado es `@test`.
 *
 * Denegado siempre responde lo mismo (200 + ok:false), sin distinguir "no
 * existe" de "bloqueado": no se puede enumerar la lista desde acá.
 */
export async function POST(req: NextRequest) {
  if (!isPrivateAccessActive()) {
    return NextResponse.json({ ok: false, reason: 'inactive' }, { status: 200, headers: NO_STORE });
  }

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, reason: 'bad_request' }, { status: 400, headers: NO_STORE }); }

  const handle = normalizeHandle(String(body?.handle ?? ''));
  const name = String(body?.name ?? '').trim().slice(0, 80);
  if (!isValidHandle(handle)) {
    return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 200, headers: NO_STORE });
  }

  let memberId: number | null = null;
  if (isMockMode()) {
    // Tiempo de respuesta parejo entre aprobado y denegado, como va a ser con la base real.
    await new Promise(r => setTimeout(r, 450));
    memberId = handle === 'test' ? 1 : null;
  } else {
    // TODO (mañana): POST {WP}/wp-json/hypestyle/v1/private-access/validate con el secreto.
    return NextResponse.json({ ok: false, reason: 'backend' }, { status: 503, headers: NO_STORE });
  }

  if (memberId === null) {
    return NextResponse.json({ ok: false, reason: 'denied' }, { status: 200, headers: NO_STORE });
  }

  const token = await createSessionToken(memberId);
  const { token: tokenCookie, flag } = cookieOptions(sessionExpiry());
  const res = NextResponse.json({ ok: true, name: name || null }, { headers: NO_STORE });
  res.cookies.set({ ...tokenCookie, value: token });
  res.cookies.set({ ...flag, value: '1' });
  return res;
}
