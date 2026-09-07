// Acceso server-side a la WP option hs_close_friends (rutas hypestyle/v1/
// close-friends del mu-plugin, PHP ≥ 1.31.0). Mismo patrón que
// lib/finance/load-config.ts: header X-Hypestyle-Secret, cache-buster porque
// Hostinger cachea por URL exacta, y 404 → "ruta no desplegada".

import { emptyStore, type CloseFriendEntry, type CloseFriendsStore } from './types';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = (process.env.WP_SECRET || '').trim();
const H = { 'X-Hypestyle-Secret': WP_SECRET, 'Content-Type': 'application/json' };
const BASE = `${WP_URL}/wp-json/hypestyle/v1/close-friends`;

export type StoreResult<T> = { ok: true; data: T } | { ok: false; status: number; notDeployed?: boolean; error?: string };

async function parse<T>(res: Response): Promise<StoreResult<T>> {
  if (res.status === 404) return { ok: false, status: 404, notDeployed: true };
  const data = await res.json().catch(() => null);
  if (!res.ok) return { ok: false, status: res.status, error: data?.message || data?.error || `HTTP ${res.status}` };
  return { ok: true, data: data as T };
}

export async function loadStore(): Promise<StoreResult<CloseFriendsStore>> {
  try {
    const res = await fetch(`${BASE}?_cb=${Date.now()}`, { headers: H, cache: 'no-store' });
    const r = await parse<Partial<CloseFriendsStore>>(res);
    if (r.ok === false) return r;
    const d = r.data || {};
    return { ok: true, data: { ...emptyStore(), ...d, entries: Array.isArray(d.entries) ? d.entries : [] } };
  } catch (e: any) {
    return { ok: false, status: 502, error: e?.message || 'fetch failed' };
  }
}

export async function upsertEntries(entries: CloseFriendEntry[], lastSyncAt?: string): Promise<StoreResult<{ added: number; updated: number; total: number }>> {
  try {
    const res = await fetch(BASE, { method: 'POST', headers: H, body: JSON.stringify({ entries, lastSyncAt }), cache: 'no-store' });
    return parse(res);
  } catch (e: any) {
    return { ok: false, status: 502, error: e?.message || 'fetch failed' };
  }
}

export async function patchEntry(key: string, patch: Partial<Pick<CloseFriendEntry, 'added' | 'status' | 'handle' | 'note' | 'name'>>): Promise<StoreResult<{ entry: CloseFriendEntry }>> {
  try {
    const res = await fetch(`${BASE}/entry`, { method: 'POST', headers: H, body: JSON.stringify({ key, patch }), cache: 'no-store' });
    return parse(res);
  } catch (e: any) {
    return { ok: false, status: 502, error: e?.message || 'fetch failed' };
  }
}

export async function deleteEntry(key: string): Promise<StoreResult<{ total: number }>> {
  try {
    const res = await fetch(`${BASE}/entry?key=${encodeURIComponent(key)}&_cb=${Date.now()}`, { method: 'DELETE', headers: H, cache: 'no-store' });
    return parse(res);
  } catch (e: any) {
    return { ok: false, status: 502, error: e?.message || 'fetch failed' };
  }
}
