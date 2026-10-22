/**
 * Escritura de los lotes al mu-plugin `hypestyle-ig-insights.php` (WP).
 *
 * SOLO la usa la ruta de sync en modo write, y el modo write está apagado por
 * env hasta el gate B2: `syncWriteEnabled()` exige `IG_SYNC_WRITE=1` además
 * del secret. En dry-run este módulo no se toca.
 */

import type { IgPostInput, IgSnapshotInput } from './types';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';

type FetchLike = typeof fetch;

/** Interruptor del gate B2: sin la env explícita no se escribe en WP. */
export function syncWriteEnabled(): boolean {
  return process.env.IG_SYNC_WRITE === '1' && Boolean(process.env.WP_SECRET);
}

export class WpStoreError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    /** true cuando WP devolvió 404: el mu-plugin no está desplegado (gate B1). */
    readonly notDeployed: boolean,
  ) {
    super(message);
    this.name = 'WpStoreError';
  }
}

async function postBulk(
  path: string,
  items: unknown[],
  fetchImpl: FetchLike,
): Promise<Record<string, unknown>> {
  const res = await fetchImpl(`${WP_URL}/wp-json/hypestyle/v1/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hypestyle-Secret': process.env.WP_SECRET || '',
    },
    body: JSON.stringify({ items }),
    cache: 'no-store',
  });
  if (res.status === 404) {
    throw new WpStoreError(
      'hypestyle-ig-insights.php no está desplegado en WP (gate B1 pendiente)',
      404,
      true,
    );
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new WpStoreError(String(data.message || `WP respondió ${res.status}`), res.status, false);
  }
  return data;
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Upsert de publicaciones, en lotes de 100 (el límite del endpoint). */
export async function pushPosts(
  items: IgPostInput[],
  fetchImpl: FetchLike = fetch,
): Promise<{ created: number; updated: number; rejected: string[] }> {
  const total = { created: 0, updated: 0, rejected: [] as string[] };
  for (const lote of chunks(items, 100)) {
    const r = await postBulk('ig-posts/bulk', lote, fetchImpl);
    total.created += Number(r.created) || 0;
    total.updated += Number(r.updated) || 0;
    if (Array.isArray(r.rejected)) total.rejected.push(...r.rejected.map(String));
  }
  return total;
}

/** Alta de snapshots, en lotes de 200. Reenviar no duplica (idempotente en WP). */
export async function pushSnapshots(
  items: IgSnapshotInput[],
  fetchImpl: FetchLike = fetch,
): Promise<{ inserted: number; skipped: number; rejected: string[] }> {
  const total = { inserted: 0, skipped: 0, rejected: [] as string[] };
  for (const lote of chunks(items, 200)) {
    const r = await postBulk('ig-snapshots/bulk', lote, fetchImpl);
    total.inserted += Number(r.inserted) || 0;
    total.skipped += Number(r.skipped) || 0;
    if (Array.isArray(r.rejected)) total.rejected.push(...r.rejected.map(String));
  }
  return total;
}
