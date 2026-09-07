// Sync contra WooCommerce: lee los pedidos pagados de la ventana, saca el
// `_instagram` de cada uno y devuelve las entradas candidatas. El merge con lo
// ya guardado lo hace el PHP (upsert), así dos syncs seguidos no duplican.
//
// La ventana arranca unos días antes del último sync para atrapar pedidos que
// se pagaron después de crearse (pending → processing). Si nunca se sincronizó
// se miran los últimos 120 días — la migración de Tienda Nube a Woo fue en
// mayo 2026, así que con eso alcanza; lo anterior entra por el import del sheet.

import { fetchOrderPages } from '@/lib/dashboard/wc-paginate';
import { entryFromOrder, type CloseFriendEntry } from './types';

export const SYNC_FIELDS = 'id,number,status,date_created_gmt,billing,meta_data';
const DAY = 86_400_000;
const OVERLAP_DAYS = 7;
const FIRST_SYNC_DAYS = 120;

export function syncWindow(lastSyncAt: string | null, now = new Date()): { after: string; before: string } {
  const last = lastSyncAt ? new Date(lastSyncAt).getTime() : NaN;
  const from = Number.isFinite(last) ? last - OVERLAP_DAYS * DAY : now.getTime() - FIRST_SYNC_DAYS * DAY;
  return { after: new Date(from).toISOString(), before: new Date(now.getTime() + 6 * 3600_000).toISOString() };
}

export async function collectFromWoo(lastSyncAt: string | null, now = new Date()): Promise<{ entries: CloseFriendEntry[]; orders: number; truncated: boolean }> {
  const { after, before } = syncWindow(lastSyncAt, now);
  const { raw, truncated } = await fetchOrderPages({ fields: SYNC_FIELDS, after, before });
  const nowIso = now.toISOString();
  const entries: CloseFriendEntry[] = [];
  // De más viejo a más nuevo: si un cliente compró dos veces queda el primer pedido.
  const ordered = [...raw].sort((a, b) => String(a.date_created_gmt || '').localeCompare(String(b.date_created_gmt || '')));
  for (const o of ordered) {
    const e = entryFromOrder(o, { onlyPaid: true, now: nowIso });
    if (e) entries.push(e);
  }
  return { entries, orders: raw.length, truncated };
}
