// Límite de intentos por ventana para las rutas del portal mayorista (login,
// olvidé mi contraseña, solicitud de alta, creación de pedido). Hasta el
// 13/10/2026 no había ninguno.
//
// En memoria, por instancia: en Vercel cada función puede correr en varias
// instancias y cada una lleva su propio contador, así que el tope real es
// "por instancia", no global. Alcanza para frenar un script o un dedo
// nervioso; para un límite exacto habría que pasarlo a un store compartido
// (KV o la option de WP). Se documenta a propósito.

import { NextRequest, NextResponse } from 'next/server';

export interface RateLimitRule {
  /** Nombre de la ruta: separa los contadores. */
  name: string;
  /** Intentos permitidos por ventana. */
  limit: number;
  windowMs: number;
}

const hits = new Map<string, number[]>();
const MAX_KEYS = 5000;

/** true si este intento entra; false si ya se pasó el límite en la ventana. */
export function rateLimitCheck(rule: RateLimitRule, id: string, now = Date.now()): { ok: boolean; retryAfterSec: number; remaining: number } {
  const key = `${rule.name}:${id}`;
  const since = now - rule.windowMs;
  const recent = (hits.get(key) ?? []).filter(t => t > since);
  if (recent.length >= rule.limit) {
    const retryAfterSec = Math.max(1, Math.ceil((recent[0] + rule.windowMs - now) / 1000));
    hits.set(key, recent);
    return { ok: false, retryAfterSec, remaining: 0 };
  }
  recent.push(now);
  hits.set(key, recent);
  // Que el mapa no crezca sin tope con IPs que pasan una sola vez.
  if (hits.size > MAX_KEYS) {
    for (const [k, ts] of hits) {
      if (!ts.some(t => t > since)) hits.delete(k);
      if (hits.size <= MAX_KEYS / 2) break;
    }
  }
  return { ok: true, retryAfterSec: 0, remaining: rule.limit - recent.length };
}

/** Solo para tests. */
export function rateLimitReset(): void {
  hits.clear();
}

/** IP del cliente detrás de Vercel (x-forwarded-for lleva la real primero). */
export function clientIp(req: Pick<NextRequest, 'headers'>): string {
  const fwd = req.headers.get('x-forwarded-for') ?? '';
  const first = fwd.split(',')[0]?.trim();
  return first || req.headers.get('x-real-ip')?.trim() || 'unknown';
}

/** 429 listo para devolver, o null si el intento entra. */
export function rateLimited(req: Pick<NextRequest, 'headers'>, rule: RateLimitRule, id = clientIp(req), message = 'Demasiados intentos. Esperá un momento y probá de nuevo.'): NextResponse | null {
  const r = rateLimitCheck(rule, id);
  if (r.ok) return null;
  return NextResponse.json({ ok: false, message, retryAfter: r.retryAfterSec }, { status: 429, headers: { 'Retry-After': String(r.retryAfterSec) } });
}

export const RATE_LIMITS = {
  login: { name: 'mayorista-login', limit: 10, windowMs: 15 * 60_000 },
  forgot: { name: 'mayorista-forgot', limit: 5, windowMs: 15 * 60_000 },
  solicitud: { name: 'mayorista-solicitud', limit: 5, windowMs: 60 * 60_000 },
  pedido: { name: 'mayorista-pedido', limit: 20, windowMs: 10 * 60_000 },
  // Registro de CYBER HYPE: el endpoint es público y no pide nada más que un
  // mail, así que es el candidato obvio para inflar la lista con direcciones
  // basura. Tres cortes a la vez: por IP en minutos (un script), por IP en el
  // día (un script paciente) y por dirección (hostigar un mail ajeno). Los
  // números son holgados para una persona real: nadie se anota cinco veces en
  // diez minutos.
  registroIp: { name: 'cyber-registro-ip', limit: 5, windowMs: 10 * 60_000 },
  registroIpDia: { name: 'cyber-registro-ip-dia', limit: 20, windowMs: 24 * 60 * 60_000 },
  registroMail: { name: 'cyber-registro-mail', limit: 3, windowMs: 60 * 60_000 },
  // Alta normal del popup: cada una manda el mail de bienvenida, y ese mail
  // sale del mismo cupo de Brevo que las campañas del evento (19.796 hasta el
  // 21/11). Sin tope, un script podía quemar los créditos de las campañas.
  // Más holgado que el del evento porque acá sí hay tráfico real del sitio.
  altaPopupIp: { name: 'newsletter-alta-ip', limit: 10, windowMs: 60 * 60_000 },
} as const satisfies Record<string, RateLimitRule>;
