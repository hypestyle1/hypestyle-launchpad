// Cliente server-side del mu-plugin hypestyle-private-access.php (rutas
// hypestyle/v1/private-access/*). Mismo patrón que lib/close-friends/store.ts:
// header con el secreto, cache-buster porque Hostinger cachea por URL exacta,
// y 404 → "ruta no desplegada". Nunca se importa desde el browser.

const WP_URL = (process.env.PRIVATE_ACCESS_WP_URL || process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com').replace(/\/+$/, '');
const WP_SECRET = (process.env.WP_SECRET || '').replace(/^﻿/, '').trim();
const BASE = `${WP_URL}/wp-json/hypestyle/v1/private-access`;

export type WpResult<T> = { ok: true; data: T } | { ok: false; status: number; notDeployed?: boolean; error?: string };

function headers(): Record<string, string> {
  return { 'X-Hypestyle-Secret': WP_SECRET, 'Content-Type': 'application/json' };
}

async function parse<T>(res: Response): Promise<WpResult<T>> {
  if (res.status === 404) {
    const body = await res.json().catch(() => null);
    // 404 de WP con code rest_no_route = el plugin no está subido. Un 404
    // propio del plugin (producto no encontrado) trae otro code.
    if (!body || body.code === 'rest_no_route') return { ok: false, status: 404, notDeployed: true };
    return { ok: false, status: 404, error: body.message || 'not_found' };
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) return { ok: false, status: res.status, error: data?.message || data?.error || `HTTP ${res.status}` };
  return { ok: true, data: data as T };
}

export async function wpGet<T>(path: string, params: Record<string, string | number | undefined> = {}, opts: { revalidate?: number; tags?: string[] } = {}): Promise<WpResult<T>> {
  if (!WP_SECRET) return { ok: false, status: 500, error: 'WP_SECRET no configurado' };
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') qs.set(k, String(v));
  // Con revalidate, el buster cambia cada `revalidate` segundos (así el cache
  // de Next sirve y, si LiteSpeed llegara a cachear, nunca más de un minuto).
  // Sin revalidate, uno por request. Los `tags` permiten invalidar al instante
  // (revalidateTag) todas las entradas, sea cual sea el buster.
  const bucket = opts.revalidate ? Math.floor(Date.now() / (opts.revalidate * 1000)) : Date.now();
  qs.set('_cb', String(bucket));
  try {
    const res = await fetch(`${BASE}${path}?${qs}`, {
      headers: headers(),
      ...(opts.revalidate ? { next: { revalidate: opts.revalidate, tags: opts.tags } } : { cache: 'no-store' as const }),
      signal: AbortSignal.timeout(15_000),
    });
    return parse<T>(res);
  } catch (e: any) {
    return { ok: false, status: 502, error: e?.message || 'fetch failed' };
  }
}

export async function wpPost<T>(path: string, body: unknown): Promise<WpResult<T>> {
  if (!WP_SECRET) return { ok: false, status: 500, error: 'WP_SECRET no configurado' };
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body ?? {}),
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    });
    return parse<T>(res);
  } catch (e: any) {
    return { ok: false, status: 502, error: e?.message || 'fetch failed' };
  }
}
