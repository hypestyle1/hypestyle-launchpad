// Acceso server-side a la API de n8n, autoalojado en n8n.hypestyle.com.ar desde el
// 01/09/2026. El token (N8N_API_KEY) NUNCA sale del servidor: no va al browser, ni
// a la respuesta, ni a logs, ni a query strings.
// Cacheado en memoria por proceso (los datos de capacidad no cambian segundo a
// segundo). La API de n8n NO expone el límite mensual del plan → se configura aparte.
//
// Nota: n8n Cloud PODA ejecuciones viejas; el conteo del mes es sobre las
// ejecuciones retenidas (puede subestimar el inicio del mes si la retención es
// corta). La PROYECCIÓN, basada en el ritmo reciente, es robusta a eso.

import type { ExecLite } from './capacity';

const N8N_URL = (process.env.N8N_API_URL || 'https://n8n.hypestyle.com.ar').replace(/\/+$/, '');
const N8N_KEY = (process.env.N8N_API_KEY || '').trim();

export function n8nConfigured(): boolean { return !!N8N_KEY; }

async function n8nGet(path: string): Promise<any> {
  const res = await fetch(`${N8N_URL}${path}`, {
    headers: { 'X-N8N-API-KEY': N8N_KEY, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`n8n ${res.status}`);
  return res.json();
}

/** Nombres de workflow por id (para el breakdown). */
export async function fetchWorkflowNames(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const data = await n8nGet(`/api/v1/workflows?limit=250`);
    for (const w of (data.data || data || [])) if (w.id) map.set(String(w.id), String(w.name || w.id));
  } catch { /* si falla, el breakdown usa ids */ }
  return map;
}

/** Ejecuciones desde `sinceMs` (paginado por cursor, newest-first, con tope). */
export async function fetchExecutionsSince(sinceMs: number): Promise<ExecLite[]> {
  const out: ExecLite[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 60; page++) {
    const qs = `limit=250${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const data = await n8nGet(`/api/v1/executions?${qs}`);
    const rows: any[] = data.data || [];
    if (!rows.length) break;
    let oldest = Infinity;
    for (const e of rows) {
      const ms = Date.parse(e.startedAt);
      if (!Number.isFinite(ms)) continue;
      oldest = Math.min(oldest, ms);
      if (ms >= sinceMs) out.push({ workflowId: String(e.workflowId), status: String(e.status || ''), startedAtMs: ms });
    }
    // Si el más viejo del lote ya cayó antes del corte, no hace falta seguir.
    if (oldest < sinceMs || !data.nextCursor) break;
    cursor = data.nextCursor;
  }
  return out;
}

interface Cached { at: number; executions: ExecLite[]; names: Map<string, string>; }
let cache: Cached | null = null;
const TTL = 5 * 60_000;

/** Trae (o sirve del cache) las ejecuciones desde `sinceMs` + nombres. */
export async function getN8nData(sinceMs: number, force = false): Promise<{ executions: ExecLite[]; names: Map<string, string>; at: number }> {
  if (!force && cache && Date.now() - cache.at < TTL) return cache;
  const [executions, names] = await Promise.all([fetchExecutionsSince(sinceMs), fetchWorkflowNames()]);
  cache = { at: Date.now(), executions, names };
  return cache;
}

/** Último cache válido (para el error state: "último dato válido"). */
export function lastGoodCache(): Cached | null { return cache; }
