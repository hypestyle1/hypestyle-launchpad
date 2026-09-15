// Persistencia del ledger de Mercado Pago en WP (tablas propias, ver
// PHP/hypestyle-api.php "LEDGER DE CONCILIACIÓN"). Server-to-server con el
// secreto. Si el mu-plugin todavía no tiene las rutas, todo devuelve
// `{ok:false, status:404}` y el llamador lo informa: no se simula persistencia.

import type { Movement, ReportKind, ReconStatus } from './mp-reports';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = (process.env.WP_SECRET || '').replace(/^﻿/, '').trim();

export interface StoredFile {
  id: number; report_kind: ReportKind; file_name: string; begin_date: string | null; end_date: string | null;
  sha256: string; row_count: number; downloaded_at: string | null; processed_at: string | null;
  status: string; error: string | null; created_at: string; updated_at: string; raw?: string | null;
}

export interface StoredMovement {
  id: number; unique_key: string; report_kind: ReportKind; file_name: string; record_type: string; description: string;
  kind: string; payment_id: string | null; order_id: number | null;
  gross_amount: string; fee_amount: string; financing_amount: string; tax_amount: string;
  credit: string; debit: string; net_amount: string; release_date: string | null; approval_date: string | null;
  balance: string | null; currency: string; reconciliation_status: ReconStatus; reconciliation_note: string | null;
  source_hash: string; raw_metadata: string | null; created_at: string; updated_at: string;
}

export interface StoreResult<T = any> { ok: boolean; status: number; body: T | null; error: string | null }

async function call<T = any>(method: 'GET' | 'POST', path: string, body?: unknown, fetchImpl: typeof fetch = fetch): Promise<StoreResult<T>> {
  if (!WP_SECRET) return { ok: false, status: 0, body: null, error: 'WP_SECRET no configurado' };
  try {
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetchImpl(`${WP_URL}/wp-json/hypestyle/v1/${path}${method === 'GET' ? `${sep}_cb=${Date.now()}` : ''}`, {
      method,
      headers: { 'X-Hypestyle-Secret': WP_SECRET, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    const json: any = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, status: res.status, body: json, error: String(json?.message || json?.code || `wp_http_${res.status}`) };
    return { ok: true, status: res.status, body: json as T, error: null };
  } catch (e) {
    return { ok: false, status: 0, body: null, error: e instanceof Error ? e.message : 'network' };
  }
}

export const ledgerStore = {
  listFiles: (kind?: ReportKind) => call<{ files: StoredFile[] }>('GET', `mp-report-files${kind ? `?kind=${kind}` : ''}`),
  getFile: (fileName: string, raw = false) => call<{ file: StoredFile }>('GET', `mp-report-files/${encodeURIComponent(fileName)}${raw ? '?raw=1' : ''}`),
  upsertFile: (f: {
    reportKind: ReportKind; fileName: string; beginDate?: string | null; endDate?: string | null; sha256?: string; rows?: number;
    downloadedAt?: string | null; processedAt?: string | null; status: string; error?: string | null; raw?: string | null;
  }) => call<{ ok: boolean; id: number; created: boolean }>('POST', 'mp-report-files', f),

  listMovements: (q: { from?: string; to?: string; kind?: string; status?: string; reportKind?: ReportKind; fileName?: string; orderId?: number; paymentId?: string; limit?: number }) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
    return call<{ movements: StoredMovement[] }>('GET', `mp-movements?${sp.toString()}`);
  },
  upsertMovements: async (movements: Movement[]) => {
    // Lotes de 500 para no pasar el límite de tamaño de request de WP.
    let inserted = 0, updated = 0; const errors: string[] = [];
    for (let i = 0; i < movements.length; i += 500) {
      const chunk = movements.slice(i, i + 500).map((m) => ({
        ...m,
        rawMetadata: m.rawMetadata ? JSON.stringify(m.rawMetadata) : null,
      }));
      const r = await call<{ ok: boolean; inserted: number; updated: number; errors: string[] }>('POST', 'mp-movements', { movements: chunk });
      if (!r.ok) { errors.push(r.error || `chunk ${i}`); continue; }
      inserted += r.body?.inserted ?? 0; updated += r.body?.updated ?? 0; errors.push(...(r.body?.errors ?? []));
    }
    return { ok: errors.length === 0, inserted, updated, errors };
  },
  setStatuses: async (statuses: { uniqueKey: string; status: ReconStatus; note?: string | null; orderId?: number | null }[]) => {
    let updated = 0; const errors: string[] = [];
    for (let i = 0; i < statuses.length; i += 500) {
      const r = await call<{ ok: boolean; updated: number }>('POST', 'mp-movements/status', { statuses: statuses.slice(i, i + 500) });
      if (!r.ok) errors.push(r.error || `chunk ${i}`); else updated += r.body?.updated ?? 0;
    }
    return { ok: errors.length === 0, updated, errors };
  },

  listRuns: (limit = 30) => call<{ runs: { id: number; at: string; kind: string; summary: any }[] }>('GET', `mp-report-runs?limit=${limit}`),
  insertRun: (kind: string, summary: unknown, at?: string) => call<{ ok: boolean; id: number }>('POST', 'mp-report-runs', { kind, summary, at: at || new Date().toISOString() }),
};

/** Convierte una fila de la tabla a Movement (números como number). */
export function storedToMovement(r: StoredMovement): Movement {
  let raw: Record<string, unknown> | null = null;
  if (r.raw_metadata) { try { raw = JSON.parse(r.raw_metadata); } catch { raw = null; } }
  const n = (v: string | null) => (v === null || v === undefined ? 0 : Number(v));
  return {
    uniqueKey: r.unique_key, reportKind: r.report_kind, fileName: r.file_name, recordType: r.record_type, description: r.description,
    kind: r.kind as Movement['kind'], paymentId: r.payment_id, orderId: r.order_id ? Number(r.order_id) : null,
    grossAmount: n(r.gross_amount), feeAmount: n(r.fee_amount), financingAmount: n(r.financing_amount), taxAmount: n(r.tax_amount),
    credit: n(r.credit), debit: n(r.debit), netAmount: n(r.net_amount),
    releaseDate: r.release_date ? `${r.release_date.replace(' ', 'T')}Z` : null,
    approvalDate: r.approval_date ? `${r.approval_date.replace(' ', 'T')}Z` : null,
    balance: r.balance === null || r.balance === undefined ? null : Number(r.balance), currency: r.currency,
    sourceHash: r.source_hash, rawMetadata: raw,
    reconciliationStatus: r.reconciliation_status, reconciliationNote: r.reconciliation_note,
  };
}
