import type { NextRequest } from 'next/server';

/**
 * IP y user-agent del visitante, desde los headers que setea la plataforma.
 *
 * En Vercel, `x-forwarded-for` y `x-real-ip` los escribe el proxy de Vercel y
 * no se pueden inyectar desde afuera (la plataforma pisa lo que mande el
 * cliente). El primer valor de `x-forwarded-for` es el visitante. En local y
 * en los tests no hay proxy → null, y el pedido queda sin IP como hasta ahora.
 *
 * La auditoría del 17/10 encontró 931 pedidos sin IP registrada: estas
 * funciones existen para que cada pedido del checkout headless guarde desde
 * dónde se creó (meta `_hs_client_ip` / `_hs_client_ua`).
 */

const IPV4_RE = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6_RE = /^[0-9a-f]{0,4}(:[0-9a-f]{0,4}){1,7}$/i;

export function esIpValida(v: string): boolean {
  return IPV4_RE.test(v) || (v.includes(':') && IPV6_RE.test(v));
}

/** Parte pura: elige la primera candidata con forma de IP. */
export function parseClientIp(realIp: string | null, forwardedFor: string | null): string | null {
  const candidatas = [realIp?.trim(), (forwardedFor ?? '').split(',')[0]?.trim()];
  for (const c of candidatas) {
    if (c && esIpValida(c)) return c;
  }
  return null;
}

export function clientIp(req: NextRequest): string | null {
  return parseClientIp(req.headers.get('x-real-ip'), req.headers.get('x-forwarded-for'));
}

/** Truncado: Woo guarda esto en un meta, no hace falta el UA completo de 1KB. */
export function clientUserAgent(req: NextRequest): string | null {
  const ua = (req.headers.get('user-agent') ?? '').trim();
  return ua ? ua.slice(0, 400) : null;
}
