// Perfiles del panel: quién entra, qué puede ver y desde cuándo.
//
// Hasta acá /admin se abría con UNA clave compartida que se tipeaba al entrar.
// No había usuarios, ni identidad, ni forma de saber quién hizo qué, ni de
// darle a alguien acceso a una parte sola. Los perfiles son usuarios reales de
// WordPress con la meta hs_admin_role (ver PHP/hypestyle-api.php) — mismo
// patrón que el acceso mayorista, y por lo mismo: WP ya hashea las contraseñas
// y ya sabe autenticarlas.

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = (process.env.WP_SECRET || '').replace(/^﻿/, '').trim();

// Fail closed, igual que las sesiones mayoristas: sin secreto no se firma ni se
// valida nada. Se reutiliza WP_SECRET para no sumar una variable más de Vercel
// que alguien tenga que acordarse de cargar — que es exactamente cómo el acceso
// mayorista estuvo caído una semana.
const SESSION_SECRET = (process.env.ADMIN_SESSION_SECRET || process.env.WP_SECRET || '').replace(/^﻿/, '').trim();

export const ADMIN_COOKIE = 'hype_admin_session';
const SESSION_HOURS = 12;

export const SECCIONES = [
  'pedidos', 'costos', 'mayoristas', 'creadores',
  'reviews', 'newsletter', 'conversaciones', 'email-metrics', 'perfiles',
] as const;
export type Seccion = (typeof SECCIONES)[number];

export type AdminRole = 'owner' | 'content';

/* Qué ve cada rol. 'content' es el perfil de la content manager: creadores,
   reseñas y newsletter. Deliberadamente sin pedidos, costos ni clientes — no
   necesita ver la plata ni los datos personales de quien compra. */
export const PERMISOS: Record<AdminRole, readonly Seccion[]> = {
  owner: SECCIONES,
  content: ['creadores', 'reviews', 'newsletter'],
};

export const NOMBRE_ROL: Record<AdminRole, string> = {
  owner: 'Acceso completo',
  content: 'Contenido y creadores',
};

export interface AdminProfile {
  id: number;
  email: string;
  name: string;
  role: AdminRole;
  lastLogin: string | null;
  loginCount: number;
  createdAt?: string;
}

export function puede(role: AdminRole | null, seccion: Seccion): boolean {
  if (!role) return false;
  return (PERMISOS[role] ?? []).includes(seccion);
}

/* ─── Autenticación contra WordPress ─────────────────────────────────────── */

export type AdminAuthResult =
  | { profile: AdminProfile }
  | { failure: 'credentials' | 'not_admin' }
  | { error: string };

export async function authenticateAdmin(username: string, password: string): Promise<AdminAuthResult> {
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${WP_SECRET}` },
    body: JSON.stringify({ username, password }),
    cache: 'no-store',
  });
  // El 403 es "la contraseña está bien pero la cuenta no tiene panel": se
  // distingue del 401 para poder decirlo, en vez de mandar a todos al mismo
  // "usuario o contraseña incorrectos" que no ayuda a nadie.
  if (res.status === 403) return { failure: 'not_admin' };
  if (res.status === 401) return { failure: 'credentials' };
  if (!res.ok) return { error: `WP ${res.status}` };
  const data = await res.json();
  return { profile: data.profile as AdminProfile };
}

/* ─── Sesión firmada ─────────────────────────────────────────────────────── */

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

export async function createAdminSession(profile: AdminProfile): Promise<string> {
  if (!SESSION_SECRET) throw new Error('Sin secreto para firmar la sesión del panel');
  const exp = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = `admin:${profile.id}:${profile.role}:${exp}`;
  return `${profile.id}.${profile.role}.${exp}.${await sign(payload)}`;
}

export interface AdminSession { id: number; role: AdminRole }

export async function verifyAdminSession(token: string | undefined | null): Promise<AdminSession | null> {
  if (!SESSION_SECRET || !token) return null;
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [idStr, role, expStr, sig] = parts;
  const id = Number(idStr);
  const exp = Number(expStr);
  if (!id || !exp || Number.isNaN(exp) || Date.now() > exp) return null;
  if (role !== 'owner' && role !== 'content') return null;
  const esperado = await sign(`admin:${id}:${role}:${exp}`);
  return esperado === sig ? { id, role: role as AdminRole } : null;
}
