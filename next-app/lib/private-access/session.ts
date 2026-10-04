// Sesión de Private Access: cookie httpOnly firmada con HMAC SHA-256 (Web
// Crypto, así vale igual en route handlers, server components y middleware).
// Mismo esquema que lib/mayorista-auth.ts: `memberId.exp.sig`.
//
// Fail closed: sin PRIVATE_ACCESS_SESSION_SECRET no se firma ni se valida
// nada. Nada de fallbacks literales en el repo.

import { PRIVATE_ACCESS_COOKIE, PRIVATE_ACCESS_FLAG_COOKIE, getPrivateAccessConfig } from './config';

const SESSION_SECRET = (process.env.PRIVATE_ACCESS_SESSION_SECRET || '').replace(/^﻿/, '').trim();

export interface PrivateAccessSession {
  memberId: number;
  exp: number;
}

function bufToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return bufToBase64Url(sig);
}

/** Vence cuando abre al público: después de eso la cookie no sirve para nada. */
export function sessionExpiry(now = Date.now()): number {
  const open = new Date(getPrivateAccessConfig().publicOpenAt).getTime();
  const sevenDays = now + 7 * 24 * 3600_000;
  return open > now ? Math.min(open, sevenDays) : sevenDays;
}

export async function createSessionToken(memberId: number, now = Date.now()): Promise<string> {
  if (!SESSION_SECRET) throw new Error('PRIVATE_ACCESS_SESSION_SECRET no configurado');
  const exp = sessionExpiry(now);
  const payload = `${memberId}.${exp}`;
  return `${payload}.${await hmac(payload)}`;
}

export async function verifySessionToken(token: string | undefined | null, now = Date.now()): Promise<PrivateAccessSession | null> {
  if (!SESSION_SECRET || !token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [idStr, expStr, sig] = parts;
  const memberId = Number(idStr);
  const exp = Number(expStr);
  if (!Number.isInteger(memberId) || memberId < 0 || !exp || Number.isNaN(exp) || now > exp) return null;
  const expected = await hmac(`${idStr}.${expStr}`);
  if (expected !== sig) return null;
  return { memberId, exp };
}

/** Opciones de las dos cookies (la firmada y la bandera legible). */
export function cookieOptions(exp: number) {
  const maxAge = Math.max(60, Math.floor((exp - Date.now()) / 1000));
  const base = { path: '/', sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', maxAge };
  return {
    token: { name: PRIVATE_ACCESS_COOKIE, ...base, httpOnly: true },
    flag: { name: PRIVATE_ACCESS_FLAG_COOKIE, ...base, httpOnly: false },
  };
}
