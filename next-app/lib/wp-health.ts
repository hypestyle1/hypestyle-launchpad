// Vigía del backend WordPress (Hostinger).
//
// Tres caídas en 60 días con el mismo síntoma (12/09, 27/10 y 3/11/2026): el
// usuario MySQL pierde los permisos, WP no puede leer wp_options y redirige
// TODO (wp-json, wc/v3, graphql, home) a /wp-admin/install.php. Mientras dura,
// el checkout no puede crear pedidos y el sitio vende cero.
//
// Este módulo sondea /wp-json/ sin seguir redirects, clasifica la respuesta y
// arma la alerta por mail. Lo invoca el cron de Vercel (vercel.json) cada 5
// minutos vía /api/admin/wp-health — Vercel es infraestructura separada de
// Hostinger, así que el vigía no se cae junto con el vigilado.

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').replace(/^﻿/, '').trim();
const SENDER = { name: 'Vigía Hype', email: 'info@hypestyle.com.ar' };

export type SondeoWp = {
  ok: boolean;
  motivo?: string;
  status?: number;
  ms: number;
};

// Clasifica la respuesta HTTP de GET /wp-json/ (pedida con redirect: 'manual').
// La pantalla de instalación es un 30x con Location → /wp-admin/install.php.
export function clasificarRespuesta(status: number, location: string | null): { ok: boolean; motivo?: string } {
  if (status >= 200 && status < 300) return { ok: true };
  if (status >= 300 && status < 400) {
    if ((location || '').includes('install.php')) {
      return {
        ok: false,
        motivo: 'WP en modo instalación (302 → install.php): el usuario MySQL perdió los permisos sobre la base',
      };
    }
    return { ok: false, motivo: `redirect inesperado (${status} → ${location || 'sin Location'})` };
  }
  return { ok: false, motivo: `HTTP ${status}` };
}

export async function sondearWp(timeoutMs = 15000): Promise<SondeoWp> {
  const inicio = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${WP_URL}/wp-json/?vigia=${Date.now()}`, {
      redirect: 'manual',
      cache: 'no-store',
      signal: ctrl.signal,
    });
    const { ok, motivo } = clasificarRespuesta(res.status, res.headers.get('location'));
    return { ok, motivo, status: res.status, ms: Date.now() - inicio };
  } catch (e) {
    const esTimeout = e instanceof Error && e.name === 'AbortError';
    return {
      ok: false,
      motivo: esTimeout ? `sin respuesta en ${timeoutMs / 1000}s` : `error de red: ${e instanceof Error ? e.message : String(e)}`,
      ms: Date.now() - inicio,
    };
  } finally {
    clearTimeout(timer);
  }
}

// Un fallo aislado puede ser un blip de red: se confirma con un segundo sondeo
// antes de alertar, para no despertar a nadie por un timeout suelto.
export async function chequearConConfirmacion(): Promise<{ caido: boolean; sondeos: SondeoWp[] }> {
  const primero = await sondearWp();
  if (primero.ok) return { caido: false, sondeos: [primero] };
  await new Promise((r) => setTimeout(r, 4000));
  const segundo = await sondearWp();
  return { caido: !segundo.ok, sondeos: [primero, segundo] };
}

export function destinatariosAlerta(raw = process.env.WP_HEALTH_ALERT_EMAIL): { email: string }[] {
  const lista = (raw || 'hypestylearg@gmail.com')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  return lista.map((email) => ({ email }));
}

export async function enviarAlertaCaida(sondeos: SondeoWp[]): Promise<boolean> {
  if (!BREVO_API_KEY) {
    console.error('[wp-health] falta BREVO_API_KEY — la alerta no sale');
    return false;
  }
  const hora = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
  const motivo = sondeos[sondeos.length - 1]?.motivo || 'desconocido';
  const esGrants = motivo.includes('install.php');
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:560px;margin:0 auto">
    <h2 style="font-size:15px;text-transform:uppercase;letter-spacing:.08em;border-bottom:2px solid #c00;padding-bottom:8px;margin-bottom:18px">WordPress caído — el checkout no puede crear pedidos</h2>
    <p style="font-size:14px;line-height:1.6"><strong>Motivo detectado:</strong> ${motivo}</p>
    <p style="font-size:14px;line-height:1.6"><strong>Hora:</strong> ${hora} (ART) · confirmado con dos sondeos seguidos.</p>
    ${esGrants ? `<p style="font-size:14px;line-height:1.7;background:#fff3f3;border:1px solid #f0c0c0;padding:12px 14px"><strong>Fix conocido (tarda 1 minuto):</strong><br>
    hPanel → Bases de datos → Gestión → menú ⋮ de la base → <strong>Cambiar permisos → Actualizar</strong>.<br>
    <strong>NUNCA completar el asistente de instalación de WordPress</strong>: la base está intacta, solo se perdieron los permisos.</p>` : ''}
    <p style="font-size:13px;line-height:1.6;color:#555">Mientras siga caído va a llegar un aviso cada 5 minutos. Cuando los avisos paran, volvió.</p>
    <p style="font-size:11px;color:#999;margin-top:28px;border-top:1px solid #eee;padding-top:12px">Vigía Hype — /api/admin/wp-health</p>
  </div>`;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: SENDER,
      to: destinatariosAlerta(),
      subject: `🔴 WP caído (${hora} ART) — checkout sin ventas`,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    console.error('[wp-health] Brevo error:', res.status, await res.text().catch(() => ''));
    return false;
  }
  return true;
}
