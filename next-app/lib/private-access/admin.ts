// Helpers del lado admin (route handlers de /api/admin/private-access/*).

import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { wpPost, type WpResult } from './store';
import { CONFIG_TAG } from './server';

/** Invalida la config cacheada (home, /private-access): pausar o reanudar es instantáneo. */
export function invalidateConfig(): void {
  try { revalidateTag(CONFIG_TAG); } catch { /* fuera de un request de Next */ }
  try { revalidatePath('/'); } catch {}
}

export const NO_STORE = { 'Cache-Control': 'private, no-store' };

/** WpResult fallido → respuesta JSON para el panel. */
export function wpError(r: Extract<WpResult<unknown>, { ok: false }>): NextResponse {
  if (r.notDeployed) {
    return NextResponse.json({ error: 'El plugin hypestyle-private-access.php no está subido a WordPress.', notDeployed: true }, { status: 501, headers: NO_STORE });
  }
  return NextResponse.json({ error: r.error || 'WordPress no respondió' }, { status: r.status >= 400 && r.status < 600 ? r.status : 502, headers: NO_STORE });
}

export interface OpenResult { ok: boolean; dryRun: boolean; published: string[]; salePricesCleared: number; openedAt: string | null }

/**
 * Abre la colección al público y refresca las páginas que muestran catálogo.
 * Lo usan el botón del admin y el cron. Idempotente.
 */
export async function openCollection(dryRun = false): Promise<WpResult<OpenResult>> {
  const r = await wpPost<OpenResult>('/open', { dryRun });
  if (r.ok && !dryRun) {
    invalidateConfig();
    for (const p of ['/', '/productos', '/new-in', '/novedades', '/sitemap.xml', '/private-access']) {
      try { revalidatePath(p); } catch { /* fuera de un request de Next (tests) */ }
    }
    for (const slug of r.data.published) {
      try { revalidatePath(`/producto/${slug}`); } catch {}
    }
  }
  return r;
}
