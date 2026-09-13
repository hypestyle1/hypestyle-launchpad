// Cliente de Google Analytics 4 (Data API v1beta) — READ ONLY, server-side.
//
// La credencial es un service account de Google Cloud con rol "Lector" en la
// propiedad de GA4. Nunca sale del servidor: no browser, no respuesta, no logs.
// Se firma un JWT RS256 con la clave privada usando `crypto` de Node (sin
// googleapis ni google-auth-library: son ~10 MB de dependencia para dos
// llamadas HTTP) y se canjea por un access token de una hora.
//
// Las llamadas de reporte son POST, así que el Data Cache de Vercel vía
// `fetch({ next: { revalidate } })` no aplica (sólo cachea GET). Se usa
// `unstable_cache` sobre la función completa, con el mismo TTL de 10 minutos
// que Meta. `force` saltea el cache pidiendo datos frescos.

import { createSign } from 'crypto';
import { unstable_cache } from 'next/cache';

const DATA_API = 'https://analyticsdata.googleapis.com/v1beta';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const REVALIDATE = 600;

export interface ServiceAccount { clientEmail: string; privateKey: string }

/**
 * Credenciales desde el entorno. Se aceptan dos formas, porque el JSON que
 * descarga Google Cloud es lo más cómodo de pegar en Vercel pero también es
 * frágil (una comilla mal y no parsea):
 *   - GA4_SERVICE_ACCOUNT_JSON = contenido completo del .json
 *   - GA4_CLIENT_EMAIL + GA4_PRIVATE_KEY (la clave con `\n` literales)
 */
export function readServiceAccount(env: Record<string, string | undefined> = process.env): ServiceAccount | null {
  const raw = (env.GA4_SERVICE_ACCOUNT_JSON || '').replace(/^﻿/, '').trim();
  if (raw) {
    try {
      const j = JSON.parse(raw);
      if (j?.client_email && j?.private_key) return { clientEmail: String(j.client_email), privateKey: normalizeKey(String(j.private_key)) };
    } catch { /* cae a las variables sueltas */ }
  }
  const email = (env.GA4_CLIENT_EMAIL || '').trim();
  const key = (env.GA4_PRIVATE_KEY || '').trim();
  if (email && key) return { clientEmail: email, privateKey: normalizeKey(key) };
  return null;
}

/** Vercel guarda los saltos de línea de la clave como `\n` literales. */
export function normalizeKey(key: string): string {
  return key.replace(/\\n/g, '\n').replace(/^"|"$/g, '');
}

export function ga4PropertyId(env: Record<string, string | undefined> = process.env): string {
  return (env.GA4_PROPERTY_ID || '').replace(/^properties\//, '').trim();
}

export function ga4Configured(): boolean {
  return !!ga4PropertyId() && !!readServiceAccount();
}

/* ─── JWT / access token ─────────────────────────────────────────────────── */

const b64url = (input: string | Buffer) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** JWT firmado RS256 para el flujo server-to-server de Google. `now` en segundos. */
export function buildAssertion(sa: ServiceAccount, now: number = Math.floor(Date.now() / 1000)): string {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: sa.clientEmail, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const sig = signer.sign(sa.privateKey);
  return `${header}.${claims}.${b64url(sig)}`;
}

// Token por proceso: dura 1 h, se renueva 60 s antes. Una instancia fría paga
// un canje (≈150 ms); las siguientes llamadas lo reusan.
let cachedToken: { value: string; exp: number } | null = null;

async function accessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.value;
  const sa = readServiceAccount();
  if (!sa) throw new Error('ga4 not configured');
  const body = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: buildAssertion(sa, now) });
  const res = await fetch(TOKEN_URL, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body, cache: 'no-store' });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) throw new Error(`ga4 auth: ${json.error_description || json.error || res.status}`);
  cachedToken = { value: json.access_token, exp: now + (Number(json.expires_in) || 3600) };
  return cachedToken.value;
}

/* ─── Llamadas a la Data API ─────────────────────────────────────────────── */

async function dataApi(path: string, body?: unknown): Promise<any> {
  const token = await accessToken();
  let lastErr: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${DATA_API}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      lastErr = new Error(`ga4 ${res.status}`);
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      continue;
    }
    const err: any = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `ga4 ${res.status}`);
  }
  throw lastErr || new Error('ga4 unreachable');
}

/** Un `runReport` crudo (request = body de la API, sin `property`). */
export function runReport(request: Record<string, unknown>): Promise<any> {
  return dataApi(`/properties/${ga4PropertyId()}:runReport`, request);
}

/** Hasta 5 reportes en una sola llamada. Devuelve `reports[]` en el mismo orden. */
export async function batchRunReports(requests: Record<string, unknown>[]): Promise<any[]> {
  const out: any[] = [];
  for (let i = 0; i < requests.length; i += 5) {
    const chunk = requests.slice(i, i + 5);
    const data = await dataApi(`/properties/${ga4PropertyId()}:batchRunReports`, { requests: chunk });
    out.push(...(data.reports || []));
  }
  return out;
}

/** Usuarios activos en los últimos 30 minutos (no se cachea: es "ahora"). */
export async function runRealtimeActiveUsers(): Promise<number> {
  const data = await dataApi(`/properties/${ga4PropertyId()}:runRealtimeReport`, { metrics: [{ name: 'activeUsers' }] });
  const v = data?.rows?.[0]?.metricValues?.[0]?.value;
  return Number(v) || 0;
}

/** Prueba liviana de acceso: metadata de la propiedad (GET, cacheable). */
export async function fetchPropertyMetadata(force = false): Promise<{ name: string }> {
  const token = await accessToken();
  const res = await fetch(`${DATA_API}/properties/${ga4PropertyId()}/metadata`, {
    headers: { authorization: `Bearer ${token}` },
    ...(force ? { cache: 'no-store' as const } : { next: { revalidate: REVALIDATE } }),
  });
  if (!res.ok) {
    const err: any = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `ga4 ${res.status}`);
  }
  const d = await res.json();
  return { name: String(d.name || '') };
}

/**
 * Batch cacheado en el Data Cache de Vercel (compartido entre instancias,
 * stale-while-revalidate, 10 min). La clave incluye propiedad + rango + los
 * requests serializados, así un cambio en la definición del reporte invalida.
 */
const cachedBatch = unstable_cache(
  async (_key: string, requests: Record<string, unknown>[]) => batchRunReports(requests),
  ['ga4-batch'],
  { revalidate: REVALIDATE, tags: ['ga4'] },
);

export async function batchRunReportsCached(requests: Record<string, unknown>[], force = false): Promise<any[]> {
  if (force) return batchRunReports(requests);
  const key = `${ga4PropertyId()}:${JSON.stringify(requests)}`;
  return cachedBatch(key, requests);
}

/** Sólo para tests: resetea el token cacheado del proceso. */
export function _resetTokenCache(): void { cachedToken = null; }
