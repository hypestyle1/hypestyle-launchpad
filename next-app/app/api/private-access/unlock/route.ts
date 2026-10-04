import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { isMockMode, isPrivateAccessActive, isValidHandle, normalizeHandle } from '@/lib/private-access/config';
import { cookieOptions, createSessionToken, sessionExpiry } from '@/lib/private-access/session';
import { getPrivateAccessConfigFresh } from '@/lib/private-access/server';
import { wpPost } from '@/lib/private-access/store';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

/** IP del visitante → hash (nunca viaja la IP cruda a WordPress). */
function ipHash(req: NextRequest): string {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || req.headers.get('x-real-ip') || req.ip || '';
  const key = process.env.PRIVATE_ACCESS_SESSION_SECRET || process.env.WP_SECRET || '';
  return ip && key ? createHmac('sha256', key).update(`ip:${ip}`).digest('hex') : '';
}

/**
 * POST { handle, name? } → desbloquea el acceso.
 *
 * La validación contra la lista la hace el mu-plugin (server-to-server, con el
 * secreto, con rate limit y tope de dispositivos); el browser solo recibe sí o
 * no y la cookie firmada. Denegado siempre responde lo mismo (200 + ok:false),
 * sin distinguir "no existe" de "bloqueado": la lista no se puede enumerar.
 */
export async function POST(req: NextRequest) {
  const { config, error } = await getPrivateAccessConfigFresh();
  if (error && !isMockMode()) {
    return NextResponse.json({ ok: false, reason: 'backend' }, { status: 503, headers: NO_STORE });
  }
  if (!isPrivateAccessActive(config)) {
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
  let paId: string | null = null;
  if (isMockMode()) {
    // Tiempo de respuesta parejo entre aprobado y denegado, como con la base real.
    await new Promise(r => setTimeout(r, 450));
    if (handle === 'test') { memberId = 1; paId = 'mock-test'; }
  } else {
    const r = await wpPost<{ ok: boolean; memberId?: number; paId?: string; reason?: string }>('/validate', {
      handle, name, ipHash: ipHash(req), ua: (req.headers.get('user-agent') || '').slice(0, 200),
    });
    if (r.ok === false) {
      console.error('[private-access/unlock]', r.status, r.error);
      return NextResponse.json({ ok: false, reason: 'backend' }, { status: 503, headers: NO_STORE });
    }
    if (r.data.ok && r.data.memberId) { memberId = r.data.memberId; paId = r.data.paId || null; }
    else if (r.data.reason === 'rate_limited') {
      return NextResponse.json({ ok: false, reason: 'rate_limited' }, { status: 429, headers: NO_STORE });
    }
  }

  if (memberId === null) {
    return NextResponse.json({ ok: false, reason: 'denied' }, { status: 200, headers: NO_STORE });
  }

  const exp = sessionExpiry(config.publicOpenAt);
  const token = await createSessionToken(memberId, exp);
  const { token: tokenCookie, flag } = cookieOptions(exp);
  // paId: id anónimo (hash) para analytics. El usuario de IG nunca va a GA4/Meta.
  const res = NextResponse.json({ ok: true, name: name || null, paId }, { headers: NO_STORE });
  res.cookies.set({ ...tokenCookie, value: token });
  res.cookies.set({ ...flag, value: '1' });
  return res;
}
