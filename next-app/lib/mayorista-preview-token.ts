// Link de preview de una campaña en borrador: el admin genera un token firmado
// (HMAC con ADMIN_SECRET, vence en 2 h) y abre /mayoristas?preview=<token>.
// Con el token válido el portal trata a ESA campaña como vigente aunque esté
// en draft, solo para quien tiene el link. No expone la clave admin en la URL
// y no cambia nada para el resto de los mayoristas ni para los pedidos: el
// pedido sigue cobrando lo que diga la campaña real.

import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = (process.env.ADMIN_SECRET || process.env.WP_SECRET || '').replace(/^﻿/, '').trim();
const TTL_MS = 2 * 60 * 60 * 1000;

function sign(payload: string, secret = SECRET): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function signPreviewToken(campaignId: string, now = Date.now(), secret = SECRET): string {
  if (!secret) throw new Error('ADMIN_SECRET no configurado');
  const payload = `${campaignId}.${now + TTL_MS}`;
  return `${payload}.${sign(payload, secret)}`;
}

/** Devuelve el id de campaña si el token es válido y no venció; si no, null. */
export function verifyPreviewToken(token: string | null | undefined, now = Date.now(), secret = SECRET): string | null {
  if (!secret || !token) return null;
  const parts = token.split('.');
  if (parts.length < 3) return null;
  const sig = parts.pop()!;
  const exp = Number(parts.pop());
  const campaignId = parts.join('.');
  if (!campaignId || !Number.isFinite(exp) || exp < now) return null;
  const expected = sign(`${campaignId}.${exp}`, secret);
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return campaignId;
}
