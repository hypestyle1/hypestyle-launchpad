// Postulaciones para crear contenido con Hype.
//
// No son clientes de WooCommerce: no compran, no tienen pedidos y no deberían
// ensuciar la lista de clientes. Se guardan como post propio en WP (ver
// PHP/hypestyle-api.php) con el estado de revisión en su meta.

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = (process.env.WP_SECRET || '').replace(/^﻿/, '').trim();
const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').replace(/^﻿/, '').trim();
const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://hypestyle.com.ar';
const SENDER = { name: 'Hypestyle', email: 'info@hypestyle.com.ar' };

// Content manager. Se puede mover a variable de entorno el día que cambie la
// persona; por ahora vale más que esté a la vista en el código que escondida.
//
// Este valor por defecto estuvo MAL: se puso una dirección inventada antes de
// saber la real, así que los avisos de postulación se mandaban a una casilla
// que no existe y Micaela no recibía ninguno.
const CONTENT_MANAGER = {
  email: (process.env.CONTENT_MANAGER_EMAIL || 'lagriegamanagement@gmail.com').trim(),
  nombre: 'Micaela',
};
const ADMIN_EMAIL = 'hypestylearg@gmail.com';

export const ESTADOS = ['nuevo', 'potencial', 'descartado', 'aprobado'] as const;
export type EstadoCreador = (typeof ESTADOS)[number];

export const ETIQUETA_ESTADO: Record<EstadoCreador, string> = {
  nuevo: 'Sin revisar',
  potencial: 'Potencial',
  descartado: 'Descartado',
  aprobado: 'Aprobado',
};

export interface Creador {
  id: number;
  nombre: string; email: string; telefono: string; ciudad: string; edad: string;
  instagram: string; tiktok: string; links: string; porque: string; prenda: string;
  frecuencia: string; equipo: string; talle: string; marcas: string;
  tutor_nombre: string; tutor_contacto: string;
  // Multi-idioma. En postulaciones viejas vienen vacíos: son opcionales a
  // propósito, para no tener que migrar nada.
  idioma: string; locale: string; idioma_detectado: string; traduccion_estado: string;
  porque_es: string; prenda_es: string; links_es: string; marcas_es: string;
  estado: EstadoCreador; nota: string;
  revisadoPor: string; revisadoEl: string;
  creadoEl: string;
}

const wpHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${WP_SECRET}` };

export async function listarCreadores(): Promise<Creador[] | null> {
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/creadores`, { headers: wpHeaders, cache: 'no-store' });
  if (!res.ok) {
    console.error('[creadores] no se pudo leer la lista:', res.status);
    return null;
  }
  const data = await res.json();
  return (data.creadores ?? []) as Creador[];
}

export async function guardarCreador(campos: Record<string, string>): Promise<{ id: number; repetido: boolean } | null> {
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/creadores`, {
    method: 'POST',
    headers: wpHeaders,
    body: JSON.stringify(campos),
  });
  if (!res.ok) {
    console.error('[creadores] no se pudo guardar:', res.status, await res.text().catch(() => ''));
    return null;
  }
  const data = await res.json();
  return { id: data.creador?.id, repetido: !!data.repetido };
}

export async function actualizarCreador(id: number, cambios: { estado?: string; nota?: string; revisadoPor?: string }) {
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/creadores/${id}`, {
    method: 'POST',
    headers: wpHeaders,
    body: JSON.stringify(cambios),
  });
  return res.ok ? await res.json() : null;
}

/* ─── Aviso a la content manager ─────────────────────────────────────────── */

const fila = (label: string, value?: string) =>
  value ? `<tr><td style="padding:5px 10px;color:#888;width:150px;vertical-align:top">${label}</td><td style="padding:5px 10px">${value.replace(/</g, '&lt;')}</td></tr>` : '';

export async function avisarPostulacion(c: Record<string, string>, repetido: boolean): Promise<boolean> {
  if (!BREVO_API_KEY) {
    console.error('[creadores] falta BREVO_API_KEY — el aviso no sale');
    return false;
  }

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:560px;margin:0 auto">
    <h2 style="font-size:15px;text-transform:uppercase;letter-spacing:.08em;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:18px">
      ${repetido ? 'Postulación actualizada' : 'Nueva postulación de creador'}
    </h2>
    <p style="font-size:14px;line-height:1.6"><strong>${c.nombre}</strong> se postuló para crear contenido con Hype.</p>
    <table style="font-size:13px;border-collapse:collapse;width:100%;margin:16px 0">
      ${fila('Mail', c.email)}
      ${fila('Teléfono', c.telefono)}
      ${fila('Ciudad', c.ciudad)}
      ${fila('Edad', c.edad)}
      ${fila('Instagram', c.instagram ? '@' + c.instagram.replace(/^@/, '') : '')}
      ${fila('TikTok', c.tiktok ? '@' + c.tiktok.replace(/^@/, '') : '')}
      ${fila('Talle', c.talle)}
      ${fila('Puede producir', c.frecuencia)}
      ${fila('Graba y edita con', c.equipo)}
      ${fila('Marcas previas', c.marcas)}
    </table>
    ${c.links ? `<p style="font-size:13px;color:#888;margin-bottom:4px">Su trabajo</p><p style="font-size:13px;line-height:1.7;white-space:pre-wrap;margin-top:0">${c.links.replace(/</g, '&lt;')}</p>` : ''}
    ${c.porque ? `<p style="font-size:13px;color:#888;margin-bottom:4px;margin-top:16px">Por qué Hype</p><p style="font-size:13px;line-height:1.7;white-space:pre-wrap;margin-top:0">${c.porque.replace(/</g, '&lt;')}</p>` : ''}
    ${c.prenda ? `<p style="font-size:13px;color:#888;margin-bottom:4px;margin-top:16px">Qué se pondría</p><p style="font-size:13px;line-height:1.7;white-space:pre-wrap;margin-top:0">${c.prenda.replace(/</g, '&lt;')}</p>` : ''}
    ${c.tutor_nombre ? `<p style="font-size:13px;background:#fff8e1;border:1px solid #ffe082;border-radius:6px;padding:10px;margin-top:16px"><strong>Es menor de edad.</strong> Adulto responsable: ${c.tutor_nombre} — ${c.tutor_contacto || 'sin contacto'}</p>` : ''}
    <p style="margin:24px 0"><a href="${SITE_URL}/admin/creadores" style="background:#111;color:#fff;text-decoration:none;font-size:12px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase;padding:12px 22px;border-radius:999px;display:inline-block">Revisar en el panel</a></p>
    <p style="font-size:11px;color:#999;border-top:1px solid #eee;padding-top:12px">Hypestyle — Crea contenido con Hype</p>
  </div>`;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: SENDER,
      to: [{ email: CONTENT_MANAGER.email, name: CONTENT_MANAGER.nombre }],
      cc: [{ email: ADMIN_EMAIL, name: 'Hypestyle' }],
      subject: `${c.nombre} quiere crear contenido con Hype`,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    console.error('[creadores] Brevo error:', res.status, await res.text().catch(() => ''));
    return false;
  }
  return true;
}
