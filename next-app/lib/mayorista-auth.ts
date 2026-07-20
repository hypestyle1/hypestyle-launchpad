// Auth de acceso mayorista: usuarios fijos por env var (sin cuenta WP), cookie
// firmada con HMAC via Web Crypto (compatible con Edge middleware y route handlers).

export const MAYORISTA_COOKIE = 'hype_mayorista_session';
const SESSION_SECRET = process.env.MAYORISTA_SESSION_SECRET || 'hype-mayorista-dev-secret';
const SESSION_DAYS = 30;

export interface MayoristaUser {
  user: string;
  pass: string;
  label?: string;
}

export function getMayoristaUsers(): MayoristaUser[] {
  try {
    const parsed = JSON.parse(process.env.MAYORISTA_USERS || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function findMayoristaUser(username: string, password: string): MayoristaUser | null {
  const users = getMayoristaUsers();
  return users.find(u => u.user === username && u.pass === password) ?? null;
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

export async function createSessionToken(username: string): Promise<string> {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${username}.${exp}`;
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [username, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!username || !exp || Number.isNaN(exp) || Date.now() > exp) return null;
  const expected = await hmac(`${username}.${exp}`);
  if (expected !== sig) return null;
  return username;
}
