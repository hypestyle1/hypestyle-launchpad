// Mails de los perfiles del panel. Son internos: van a nuestro propio equipo,
// no a clientes, así que el tono es directo y sin adornos de marca.

import type { DatosReset } from './admin-profiles';

const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').replace(/^﻿/, '').trim();
const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://hypestyle.com.ar';
const SENDER = { name: 'Hypestyle', email: 'info@hypestyle.com.ar' };

export async function enviarResetAdmin(datos: DatosReset, token: string): Promise<boolean> {
  if (!BREVO_API_KEY) {
    console.error('[admin-mails] falta BREVO_API_KEY — el mail no sale');
    return false;
  }

  const link = `${SITE_URL}/admin/reset?token=${encodeURIComponent(token)}`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:520px;margin:0 auto">
    <h2 style="font-size:15px;text-transform:uppercase;letter-spacing:.08em;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:18px">Recuperar tu acceso al panel</h2>
    <p style="font-size:14px;line-height:1.6">Pediste cambiar la contraseña de tu perfil del panel de Hype. Elegí una nueva desde acá:</p>
    <p style="margin:22px 0"><a href="${link}" style="background:#111;color:#fff;text-decoration:none;font-size:12px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase;padding:12px 22px;border-radius:999px;display:inline-block">Elegir contraseña</a></p>
    <p style="font-size:13px;line-height:1.6;color:#555">El link vale por 2 horas y se usa una sola vez. Si no fuiste vos, ignoralo: tu contraseña actual sigue funcionando.</p>
    <p style="font-size:11px;color:#aaa;word-break:break-all;margin-top:16px">${link}</p>
    <p style="font-size:11px;color:#999;margin-top:28px;border-top:1px solid #eee;padding-top:12px">Hypestyle — Panel</p>
  </div>`;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: SENDER,
      to: [{ email: datos.email, name: datos.name || datos.email }],
      subject: 'Recuperar tu acceso al panel de Hype',
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    console.error('[admin-mails] Brevo error:', res.status, await res.text().catch(() => ''));
    return false;
  }
  return true;
}
