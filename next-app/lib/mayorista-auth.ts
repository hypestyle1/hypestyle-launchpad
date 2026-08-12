// Auth de acceso mayorista: clientes reales de WooCommerce (flag _es_mayorista
// en su perfil), validados server-to-server contra WP (ver /mayorista-login en
// PHP/hypestyle-api.php). La cookie de sesión guarda el customerId, firmada con
// HMAC via Web Crypto (compatible con Edge middleware y route handlers).

export const MAYORISTA_COOKIE = 'hype_mayorista_session';
// Fail closed: sin secreto configurado no se firman ni se validan sesiones. El
// fallback literal anterior vivía en la fuente pública del repo, así que
// cualquiera podía firmarse una cookie para el customerId que quisiera y leer el
// perfil/pedidos de ese cliente. Ahora, si la variable falta, createSessionToken
// lanza (el login falla ruidoso) y verifySessionToken rechaza (nadie autorizado).
const SESSION_SECRET = (process.env.MAYORISTA_SESSION_SECRET || '').replace(/^﻿/, '').trim();
const SESSION_DAYS = 30;

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = (process.env.WP_SECRET || '').replace(/^﻿/, '').trim();

export interface MayoristaBilling {
  first_name: string; last_name: string; company: string;
  address_1: string; address_2: string; city: string; state: string;
  postcode: string; country: string; phone: string;
}

export interface MayoristaLoginResult {
  customerId: number;
  email: string;
  label: string;
  billing: MayoristaBilling;
}

export async function authenticateMayoristaCustomer(username: string, password: string): Promise<MayoristaLoginResult | { error: string } | null> {
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/mayorista-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${WP_SECRET}` },
    body: JSON.stringify({ username, password }),
  });
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) return { error: `WP ${res.status}` };
  const data = await res.json();
  return { customerId: data.customerId, email: data.email, label: data.label, billing: data.billing };
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

export async function createSessionToken(customerId: number): Promise<string> {
  if (!SESSION_SECRET) throw new Error('MAYORISTA_SESSION_SECRET no configurado');
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${customerId}.${exp}`;
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

// Devuelve el customerId (como número) o null si la cookie falta/expiró/no valida.
export async function verifySessionToken(token: string | undefined | null): Promise<number | null> {
  if (!SESSION_SECRET || !token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [customerIdStr, expStr, sig] = parts;
  const customerId = Number(customerIdStr);
  const exp = Number(expStr);
  if (!customerId || !exp || Number.isNaN(exp) || Date.now() > exp) return null;
  const expected = await hmac(`${customerIdStr}.${exp}`);
  if (expected !== sig) return null;
  return customerId;
}
