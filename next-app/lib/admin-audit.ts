// Audit log de acciones administrativas sensibles (refunds, conciliación).
//
// Persistencia en WP (`hypestyle/v1/audit-log`, tabla wp_hs_audit_log) vía
// secreto server-to-server. Es best-effort: si el backend no tiene la ruta
// todavía (mu-plugin sin actualizar) o WP está caído, la acción NO se frena —
// el rastro queda igual en la meta y en la nota del pedido, que son la fuente
// primaria. Siempre se loguea también a consola (Vercel logs).

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = (process.env.WP_SECRET || '').replace(/^﻿/, '').trim();

export interface AuditEvent {
  action: string;
  actor: string;
  orderId?: number | null;
  paymentId?: string | null;
  mpRefundId?: string | null;
  wcRefundId?: number | null;
  amount?: number | null;
  at?: string;
  result: 'ok' | 'error';
  error?: string | null;
  /** Datos extra (nunca secretos). */
  details?: Record<string, unknown> | null;
}

export async function auditLog(event: AuditEvent, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const payload = { ...event, at: event.at || new Date().toISOString() };
  console.log(`[audit] ${payload.action} actor="${payload.actor}" order=${payload.orderId ?? '-'} payment=${payload.paymentId ?? '-'} mpRefund=${payload.mpRefundId ?? '-'} wcRefund=${payload.wcRefundId ?? '-'} amount=${payload.amount ?? '-'} result=${payload.result}${payload.error ? ` error="${payload.error}"` : ''}`);
  if (!WP_SECRET) return false;
  try {
    const res = await fetchImpl(`${WP_URL}/wp-json/hypestyle/v1/audit-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hypestyle-Secret': WP_SECRET },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    if (!res.ok) console.warn(`[audit] backend ${res.status} (¿mu-plugin sin la ruta audit-log?)`);
    return res.ok;
  } catch (e) {
    console.warn('[audit] backend unreachable:', e instanceof Error ? e.message : e);
    return false;
  }
}
