// Gestión de la cuenta de un mayorista: buscarla, pisar la contraseña y firmar
// los links de recuperación.
//
// La contraseña vieja nunca se puede leer — WordPress guarda un hash y no hay
// forma de volver atrás, ni por WC REST ni por base. Todo lo de acá parte de
// esa premisa: se pisa por una nueva y se la comunica una sola vez.

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = process.env.WC_CONSUMER_KEY || '';
const WC_SEC = process.env.WC_CONSUMER_SECRET || '';
const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').replace(/^﻿/, '').trim();
const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://hypestyle.com.ar';
const SENDER = { name: 'Hypestyle', email: 'info@hypestyle.com.ar' };

// Mismo secreto que firma las sesiones, con prefijo propio en el payload para
// que un token de sesión no sirva como token de reset ni al revés.
const SESSION_SECRET = (process.env.MAYORISTA_SESSION_SECRET || '').replace(/^﻿/, '').trim();
const RESET_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas

// Sin guión bajo, como el resto de las meta del proyecto: WC descarta en
// silencio las "protegidas" al actualizar un customer por REST.
const NONCE_META = 'mayorista_reset_nonce';

export function wcAuth() {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
}

export interface MayoristaAccount {
  id: number;
  email: string;
  label: string;
}

function metaVal(meta: { key: string; value: string }[] | undefined, key: string): string {
  return meta?.find((m) => m.key === key)?.value ?? '';
}

function toAccount(c: any): MayoristaAccount {
  const label = (c.billing?.company || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email).trim();
  return { id: c.id, email: c.email, label };
}

/** Devuelve la cuenta solo si existe Y tiene el acceso mayorista activo. */
export async function findActiveMayoristaByEmail(email: string): Promise<MayoristaAccount | null> {
  const res = await fetch(
    `${WP_URL}/wp-json/wc/v3/customers?email=${encodeURIComponent(email)}&_fields=id,email,first_name,last_name,billing,meta_data`,
    { headers: { Authorization: wcAuth() }, cache: 'no-store' },
  );
  if (!res.ok) return null;
  const list = (await res.json()) as any[];
  const found = list.find((c) => metaVal(c.meta_data, 'es_mayorista') === 'yes');
  return found ? toAccount(found) : null;
}

export async function getMayoristaById(customerId: number): Promise<MayoristaAccount | null> {
  const res = await fetch(
    `${WP_URL}/wp-json/wc/v3/customers/${customerId}?_fields=id,email,first_name,last_name,billing,meta_data`,
    { headers: { Authorization: wcAuth() }, cache: 'no-store' },
  );
  if (!res.ok) return null;
  const c = await res.json();
  if (metaVal(c.meta_data, 'es_mayorista') !== 'yes') return null;
  return toAccount(c);
}

export async function setCustomerPassword(
  customerId: number,
  password: string,
  extraMeta: { key: string; value: string }[] = [],
): Promise<boolean> {
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/customers/${customerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
    body: JSON.stringify(extraMeta.length ? { password, meta_data: extraMeta } : { password }),
  });
  if (!res.ok) {
    console.error('[mayorista-account] no se pudo cambiar la contraseña:', res.status, await res.text().catch(() => ''));
    return false;
  }
  return true;
}

/* ─── Token de recuperación ───────────────────────────────────────────────
   Firmado con HMAC y atado a un nonce guardado en el perfil del cliente. El
   nonce es lo que lo vuelve de un solo uso: al completar el reset se borra, y
   cualquier link viejo dando vueltas por la casilla deja de validar. */

function b64url(buf: ArrayBuffer): string {
  let bin = '';
  for (const b of new Uint8Array(buf)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
}

function randomNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return b64url(bytes.buffer);
}

/** Genera el token y deja el nonce en el perfil. Null si falta el secreto. */
export async function createResetToken(customerId: number): Promise<string | null> {
  if (!SESSION_SECRET) return null;
  const nonce = randomNonce();
  const exp = Date.now() + RESET_TTL_MS;
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/customers/${customerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
    body: JSON.stringify({ meta_data: [{ key: NONCE_META, value: nonce }] }),
  });
  if (!res.ok) return null;
  const sig = await sign(`reset:${customerId}:${exp}:${nonce}`);
  return `${customerId}.${exp}.${sig}`;
}

/** Devuelve el customerId si el token vale, o null. No consume el nonce. */
export async function verifyResetToken(token: string): Promise<number | null> {
  if (!SESSION_SECRET || !token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [idStr, expStr, sig] = parts;
  const customerId = Number(idStr);
  const exp = Number(expStr);
  if (!customerId || !exp || Number.isNaN(exp) || Date.now() > exp) return null;

  const res = await fetch(`${WP_URL}/wp-json/wc/v3/customers/${customerId}?_fields=id,meta_data`, {
    headers: { Authorization: wcAuth() },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const c = await res.json();
  const nonce = metaVal(c.meta_data, NONCE_META);
  if (!nonce) return null; // ya se usó, o nunca se pidió

  const expected = await sign(`reset:${customerId}:${exp}:${nonce}`);
  return expected === sig ? customerId : null;
}

/** Meta a mandar junto con la contraseña nueva para quemar el link usado. */
export function burnedNonceMeta() {
  return [{ key: NONCE_META, value: '' }];
}

/* ─── Mails ──────────────────────────────────────────────────────────────── */

const shell = (title: string, inner: string) => `<div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:520px;margin:0 auto">
  <h2 style="font-size:15px;text-transform:uppercase;letter-spacing:.08em;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:18px">${title}</h2>
  ${inner}
  <p style="font-size:11px;color:#999;margin-top:28px;border-top:1px solid #eee;padding-top:12px">Hypestyle — Catálogo mayorista<br><a href="${SITE_URL}/mayoristas" style="color:#999">hypestyle.com.ar/mayoristas</a></p>
</div>`;

async function send(to: { email: string; name?: string }, subject: string, html: string): Promise<boolean> {
  if (!BREVO_API_KEY) {
    console.error('[mayorista-account] falta BREVO_API_KEY — el mail no sale');
    return false;
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: SENDER, to: [to], subject, htmlContent: html }),
  });
  if (!res.ok) {
    console.error('[mayorista-account] Brevo error:', res.status, await res.text().catch(() => ''));
    return false;
  }
  return true;
}

/** Clave nueva generada desde el panel — se la mandamos nosotros al cliente. */
export async function sendNewPasswordEmail(account: MayoristaAccount, password: string): Promise<boolean> {
  return send(
    { email: account.email, name: account.label },
    'Tu nuevo acceso al catálogo mayorista',
    shell(
      'Tu acceso mayorista',
      `
      <p style="font-size:14px;line-height:1.6">Hola ${account.label}, generamos una contraseña nueva para tu cuenta.</p>
      <table style="font-size:14px;border-collapse:collapse;margin:18px 0;width:100%">
        <tr><td style="padding:6px 10px;color:#888;width:110px">Usuario</td><td style="padding:6px 10px;font-weight:bold">${account.email}</td></tr>
        <tr><td style="padding:6px 10px;color:#888">Contraseña</td><td style="padding:6px 10px;font-family:monospace;font-weight:bold;font-size:15px">${password}</td></tr>
      </table>
      <p style="margin:22px 0"><a href="${SITE_URL}/mayoristas/login" style="background:#111;color:#fff;text-decoration:none;font-size:12px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase;padding:12px 22px;border-radius:999px;display:inline-block">Ingresar</a></p>
      <p style="font-size:13px;line-height:1.6;color:#555">Una vez adentro podés cambiarla por una que recuerdes, desde <strong>Mi cuenta</strong>.</p>
    `,
    ),
  );
}

/** Link de recuperación pedido por el propio cliente desde el login. */
export async function sendResetLinkEmail(account: MayoristaAccount, token: string): Promise<boolean> {
  const link = `${SITE_URL}/mayoristas/reset?token=${encodeURIComponent(token)}`;
  return send(
    { email: account.email, name: account.label },
    'Recuperá tu acceso al catálogo mayorista',
    shell(
      'Recuperar acceso',
      `
      <p style="font-size:14px;line-height:1.6">Hola ${account.label}, pediste volver a entrar al catálogo mayorista. Elegí una contraseña nueva desde acá:</p>
      <p style="margin:22px 0"><a href="${link}" style="background:#111;color:#fff;text-decoration:none;font-size:12px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase;padding:12px 22px;border-radius:999px;display:inline-block">Elegir contraseña</a></p>
      <p style="font-size:13px;line-height:1.6;color:#555">El link vale por 2 horas y se usa una sola vez. Si no fuiste vos, ignoralo: tu contraseña actual sigue funcionando.</p>
      <p style="font-size:11px;color:#aaa;word-break:break-all;margin-top:16px">${link}</p>
    `,
    ),
  );
}

/* ─── Solicitudes de acceso ───────────────────────────────────────────────
   El propio comercio se registra desde /mayoristas/solicitud: carga sus datos
   y elige su usuario y contraseña. La cuenta nace en 'pending', que el login
   ya rechaza — hypestyle_mayorista_login exige es_mayorista === 'yes' —, así
   que no hay que inventar ningún portero nuevo: la solicitud simplemente no
   puede entrar hasta que alguien la aprueba. */

export type MayoristaStatus = 'pending' | 'active' | 'revoked';

export function statusFromMeta(value: string): MayoristaStatus {
  if (value === 'yes') return 'active';
  if (value === 'pending') return 'pending';
  return 'revoked';
}

const ADMIN_EMAIL = 'hypestylearg@gmail.com';
// El token de aprobación se firma con WP_SECRET y no con el de sesiones: son
// dos permisos distintos y no queremos que uno sirva para el otro.
const ADMIN_SECRET = (process.env.WP_SECRET || '').replace(/^﻿/, '').trim();
const APPROVAL_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

async function signAdmin(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(ADMIN_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
}

export async function createApprovalToken(customerId: number): Promise<string | null> {
  if (!ADMIN_SECRET) return null;
  const exp = Date.now() + APPROVAL_TTL_MS;
  const sig = await signAdmin(`aprobar:${customerId}:${exp}`);
  return `${customerId}.${exp}.${sig}`;
}

export async function verifyApprovalToken(token: string): Promise<number | null> {
  if (!ADMIN_SECRET || !token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [idStr, expStr, sig] = parts;
  const customerId = Number(idStr);
  const exp = Number(expStr);
  if (!customerId || !exp || Number.isNaN(exp) || Date.now() > exp) return null;
  const expected = await signAdmin(`aprobar:${customerId}:${exp}`);
  return expected === sig ? customerId : null;
}

export interface SolicitudData {
  razonSocial: string;
  cuit: string;
  instagram: string;
  localFisico: boolean;
  modalidad: string;
  contacto: string;
  telefono: string;
  ciudad: string;
  provincia: string;
}

/** Aviso a Hypestyle de que alguien pidió acceso. Lleva el link para aprobar. */
export async function sendSolicitudAdminEmail(
  account: MayoristaAccount,
  data: SolicitudData,
  token: string,
): Promise<boolean> {
  const link = `${SITE_URL}/admin/aprobar?token=${encodeURIComponent(token)}`;
  const row = (label: string, value?: string) =>
    value ? `<tr><td style="padding:5px 10px;color:#888;width:150px">${label}</td><td style="padding:5px 10px;font-weight:bold">${value}</td></tr>` : '';

  return send(
    { email: ADMIN_EMAIL, name: 'Hypestyle' },
    `${data.razonSocial || account.label} solicitó acceso al catálogo mayorista`,
    shell(
      'Nueva solicitud de acceso',
      `
      <p style="font-size:14px;line-height:1.6"><strong>${data.razonSocial || account.label}</strong> solicitó acceso para entrar al catálogo mayorista de Hype.</p>
      <table style="font-size:13px;border-collapse:collapse;width:100%;margin:16px 0">
        ${row('Razón social', data.razonSocial)}
        ${row('CUIT', data.cuit)}
        ${row('Contacto', data.contacto)}
        ${row('Mail', account.email)}
        ${row('Teléfono', data.telefono)}
        ${row('Instagram', data.instagram)}
        ${row('Local físico', data.localFisico ? 'Sí' : 'No')}
        ${row('Cómo vende', data.modalidad)}
        ${row('Ubicación', [data.ciudad, data.provincia].filter(Boolean).join(', '))}
      </table>
      <p style="font-size:13px;line-height:1.6;color:#555">Ya cargó todos sus datos y eligió su propia contraseña. Hasta que lo apruebes, la cuenta existe pero no puede entrar.</p>
      <p style="margin:22px 0"><a href="${link}" style="background:#111;color:#fff;text-decoration:none;font-size:12px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase;padding:12px 22px;border-radius:999px;display:inline-block">Revisar y aprobar</a></p>
      <p style="font-size:12px;line-height:1.6;color:#888">El link te muestra la solicitud completa y te deja aprobarla o rechazarla con un botón. Nada se activa por abrirlo.</p>
      <p style="font-size:12px;line-height:1.6;color:#888">También la tenés en el panel, junto con el resto: <a href="${SITE_URL}/admin/mayoristas" style="color:#888">hypestyle.com.ar/admin/mayoristas</a></p>
    `,
    ),
  );
}

/** Al aprobar: se le avisa al comercio que ya puede entrar. */
export async function sendAprobacionEmail(account: MayoristaAccount): Promise<boolean> {
  return send(
    { email: account.email, name: account.label },
    'Tu acceso al catálogo mayorista de Hype está activo',
    shell(
      'Bienvenido al mayorista',
      `
      <p style="font-size:14px;line-height:1.6">Hola ${account.label}, aprobamos tu solicitud. Tu acceso al catálogo mayorista ya está activo.</p>
      <p style="font-size:14px;line-height:1.6">Entrá con <strong>${account.email}</strong> y la contraseña que elegiste al registrarte.</p>
      <p style="margin:22px 0"><a href="${SITE_URL}/mayoristas/login" style="background:#111;color:#fff;text-decoration:none;font-size:12px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase;padding:12px 22px;border-radius:999px;display:inline-block">Ver el catálogo</a></p>
      <p style="font-size:13px;line-height:1.6;color:#555">Los precios que vas a ver son mayoristas, al 50% de la lista. Cualquier duda, respondé este mail.</p>
    `,
    ),
  );
}
