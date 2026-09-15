// Cliente de los reportes de Mercado Pago (release_report / settlement_report).
// Endpoints verificados contra la API viva el 15/09/2026:
//   GET/POST/PUT /v1/account/{kind}/config      configuración (columnas, separador, tz, frecuencia)
//   POST/DELETE  /v1/account/{kind}/schedule    activa / desactiva la generación automática
//   POST         /v1/account/{kind}             genera a mano {begin_date, end_date} (202; 203 = falló)
//   GET          /v1/account/{kind}/list        lista (file_name vacío = todavía en preparación)
//   GET          /v1/account/{kind}/{file_name} descarga el CSV
// El token sólo vive acá; nunca se loguea ni se devuelve.

import type { ReportKind } from './mp-reports';

export interface MpReportEntry {
  id: number;
  beginDate: string;
  endDate: string;
  fileName: string | null;
  status: string;
  createdFrom: string;
  dateCreated: string | null;
}

export interface MpReportsClient {
  getConfig(kind: ReportKind): Promise<{ status: number; body: any }>;
  putConfig(kind: ReportKind, cfg: Record<string, unknown>): Promise<{ status: number; body: any }>;
  schedule(kind: ReportKind, enable: boolean): Promise<{ status: number; body: any }>;
  create(kind: ReportKind, beginISO: string, endISO: string): Promise<{ ok: boolean; status: number; body: any }>;
  list(kind: ReportKind): Promise<MpReportEntry[]>;
  download(kind: ReportKind, fileName: string): Promise<{ ok: boolean; status: number; text: string }>;
}

const BASE = 'https://api.mercadopago.com/v1/account';

export function mpReportsClient(token: string, fetchImpl: typeof fetch = fetch): MpReportsClient {
  const H = { Authorization: `Bearer ${token}` };
  async function json(method: string, path: string, body?: unknown): Promise<{ status: number; body: any }> {
    try {
      const res = await fetchImpl(`${BASE}/${path}`, {
        method, headers: body ? { ...H, 'Content-Type': 'application/json' } : H,
        body: body ? JSON.stringify(body) : undefined, cache: 'no-store',
      });
      const text = await res.text();
      let parsed: any = null; try { parsed = JSON.parse(text); } catch { parsed = text; }
      return { status: res.status, body: parsed };
    } catch (e) {
      return { status: 0, body: { message: e instanceof Error ? e.message : 'network' } };
    }
  }
  return {
    getConfig: (kind) => json('GET', `${kind}/config`),
    async putConfig(kind, cfg) {
      const r = await json('PUT', `${kind}/config`, cfg);
      // Sin config previa el PUT falla: se crea con POST.
      if (r.status === 404) return json('POST', `${kind}/config`, cfg);
      return r;
    },
    schedule: (kind, enable) => json(enable ? 'POST' : 'DELETE', `${kind}/schedule`),
    async create(kind, beginISO, endISO) {
      const r = await json('POST', kind, { begin_date: beginISO, end_date: endISO });
      return { ok: r.status === 202 || r.status === 200 || r.status === 201, status: r.status, body: r.body };
    },
    async list(kind) {
      const r = await json('GET', `${kind}/list`);
      if (r.status !== 200 || !Array.isArray(r.body)) return [];
      return r.body.map((x: any) => ({
        id: Number(x.id), beginDate: String(x.begin_date || ''), endDate: String(x.end_date || ''),
        fileName: x.file_name ? String(x.file_name) : null, status: String(x.status || ''),
        createdFrom: String(x.created_from || ''), dateCreated: x.date_created || x.generation_date || null,
      }));
    },
    async download(kind, fileName) {
      try {
        const res = await fetchImpl(`${BASE}/${kind}/${encodeURIComponent(fileName)}`, { headers: H, cache: 'no-store' });
        const text = await res.text();
        return { ok: res.ok, status: res.status, text };
      } catch (e) {
        return { ok: false, status: 0, text: e instanceof Error ? e.message : 'network' };
      }
    },
  };
}

/** Columnas explícitas de cada reporte (lo que el parser exige está en REQUIRED). */
export const RELEASE_COLUMNS = ['DATE', 'SOURCE_ID', 'EXTERNAL_REFERENCE', 'RECORD_TYPE', 'DESCRIPTION', 'NET_CREDIT_AMOUNT', 'NET_DEBIT_AMOUNT', 'GROSS_AMOUNT', 'MP_FEE_AMOUNT', 'FINANCING_FEE_AMOUNT', 'SHIPPING_FEE_AMOUNT', 'TAXES_AMOUNT', 'COUPON_AMOUNT', 'INSTALLMENTS', 'PAYMENT_METHOD', 'PAYMENT_METHOD_TYPE', 'TAX_DETAIL', 'TAXES_DISAGGREGATED', 'TRANSACTION_APPROVAL_DATE', 'BALANCE_AMOUNT', 'ORDER_ID', 'METADATA', 'CURRENCY'];
export const SETTLEMENT_COLUMNS = ['EXTERNAL_REFERENCE', 'SOURCE_ID', 'TRANSACTION_TYPE', 'TRANSACTION_AMOUNT', 'TRANSACTION_CURRENCY', 'TRANSACTION_DATE', 'SETTLEMENT_DATE', 'SETTLEMENT_NET_AMOUNT', 'REAL_AMOUNT', 'FEE_AMOUNT', 'FINANCING_FEE_AMOUNT', 'SHIPPING_FEE_AMOUNT', 'TAXES_AMOUNT', 'TAX_DETAIL', 'TAXES_DISAGGREGATED', 'COUPON_AMOUNT', 'INSTALLMENTS', 'PAYMENT_METHOD', 'PAYMENT_METHOD_TYPE', 'MONEY_RELEASE_DATE', 'IS_RELEASED', 'DESCRIPTION', 'METADATA', 'ORDER_ID'];

export function reportConfig(kind: ReportKind): Record<string, unknown> {
  const columns = (kind === 'release_report' ? RELEASE_COLUMNS : SETTLEMENT_COLUMNS).map((key) => ({ key }));
  const base = {
    columns,
    file_name_prefix: kind === 'release_report' ? 'hype-release' : 'hype-settlement',
    frequency: { hour: 6, type: 'monthly', value: 1 },
    separator: ';',
    display_timezone: 'GMT-03',
    report_translation: 'es',
    notification_email_list: [],
    include_withdrawal_at_end: false,
  };
  return kind === 'release_report'
    ? { ...base, execute_after_withdrawal: false, check_available_balance: false, compensate_detail: false }
    : base;
}

/** Rango UTC de un mes en hora Argentina, como lo pide MP. */
export function monthRangeForMp(month: string): { begin: string; end: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  const begin = new Date(Date.UTC(y, mo - 1, 1, 3, 0, 0)).toISOString().replace('.000Z', 'Z');
  const end = new Date(Date.UTC(y, mo, 1, 2, 59, 59)).toISOString().replace('.000Z', 'Z');
  return { begin, end };
}
