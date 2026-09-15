import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/admin-auth';
import { fetchOrderPages } from '@/lib/dashboard/wc-paginate';
import { ledgerStore, storedToMovement } from '@/lib/finance/mp-ledger-store';
import { loadOrdersForRecon } from '@/lib/finance/mp-reports-sync';
import {
  reconcileAll, computeKpis, monthRangeAr, snapshotNetBeforeRefunds, RECON_LABEL,
  type Movement, type ReconResult,
} from '@/lib/finance/mp-reports';
import { MP_METHODS, SYNCABLE_STATUSES } from '@/lib/finance/mp-sync';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

// Datos de /admin/finance/conciliacion para un mes (hora Argentina, base =
// fecha de liberación del reporte de dinero liberado).
//
// Los estados se recalculan en vivo contra Woo (pedido + snapshot + _hs_refunds)
// para que la pantalla nunca muestre un estado viejo; el ledger guarda el
// último resultado del cron. SIN_PAGO sale del lado de Woo: pedidos MP
// cobrados en el mes que no tienen fila `payment` en el reporte.

type OrderSide = { id: number; number: string; status: string; transactionId: string | null; snapshotNet: number | null; total: number; datePaid: string | null };

export async function GET(req: NextRequest) {
  if (!(await authorizeAdmin(req, 'costos'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const month = req.nextUrl.searchParams.get('month') || new Date().toISOString().slice(0, 7);
  const range = monthRangeAr(month);
  if (!range) return NextResponse.json({ error: 'month inválido (YYYY-MM)' }, { status: 400 });

  const [rel, set, files, runs] = await Promise.all([
    ledgerStore.listMovements({ from: range.from, to: range.to, reportKind: 'release_report', limit: 5000 }),
    ledgerStore.listMovements({ from: range.from, to: range.to, reportKind: 'settlement_report', limit: 5000 }),
    ledgerStore.listFiles(),
    ledgerStore.listRuns(10),
  ]);
  if (!rel.ok) {
    return NextResponse.json({ month, backendMissing: rel.status === 404, error: rel.error, movements: [], settlement: [], kpis: null, files: [], runs: [] }, { status: rel.status === 404 ? 200 : 502 });
  }

  const movements: Movement[] = (rel.body?.movements || []).map(storedToMovement);
  const settlement: Movement[] = (set.ok ? set.body?.movements || [] : []).map(storedToMovement);

  const orderIds = [...movements, ...settlement].map((m) => m.orderId).filter((n): n is number => !!n);
  const orders = await loadOrdersForRecon(orderIds);
  const results = new Map<string, ReconResult>();
  for (const r of reconcileAll([...movements, ...settlement], orders)) results.set(r.uniqueKey, r);

  // SIN_PAGO: pedidos MP cobrados en el mes (date_paid en hora AR) sin fila payment.
  const paymentIds = new Set(movements.filter((m) => m.kind === 'payment').map((m) => m.paymentId).filter(Boolean));
  const missing: OrderSide[] = [];
  try {
    const after = new Date(Date.parse(range.from) - 20 * 86400_000).toISOString();
    const { raw } = await fetchOrderPages({ fields: 'id,number,status,payment_method,transaction_id,total,date_paid_gmt,meta_data', after, before: range.to });
    for (const o of raw) {
      if (!MP_METHODS.has(String(o.payment_method || '')) || !SYNCABLE_STATUSES.has(String(o.status || ''))) continue;
      const paid = o.date_paid_gmt ? Date.parse(/Z$/.test(o.date_paid_gmt) ? o.date_paid_gmt : `${o.date_paid_gmt}Z`) : NaN;
      if (!Number.isFinite(paid) || paid < Date.parse(range.from) || paid >= Date.parse(range.to)) continue;
      const tx = o.transaction_id ? String(o.transaction_id).trim() : null;
      if (tx && paymentIds.has(tx)) continue;
      missing.push({ id: Number(o.id), number: String(o.number ?? o.id), status: String(o.status), transactionId: tx, snapshotNet: null, total: parseFloat(o.total) || 0, datePaid: o.date_paid_gmt || null });
    }
  } catch (e) {
    console.warn('[conciliacion] SIN_PAGO scan failed:', e instanceof Error ? e.message : e);
  }

  const kpis = computeKpis(movements, results, orders, missing.length);

  const orderInfo = (id: number | null) => {
    const o = id ? orders.get(id) : undefined;
    if (!o) return null;
    return {
      id: o.id, number: o.number, status: o.status, transactionId: o.transactionId,
      snapshot: o.snapshot ? {
        gross: o.snapshot.gross, feeGateway: o.snapshot.feeGateway, feeFinancing: o.snapshot.feeFinancing, feeOther: o.snapshot.feeOther,
        taxWithholdingTotal: o.snapshot.taxWithholdingTotal, netBeforeRefunds: snapshotNetBeforeRefunds(o.snapshot), netCashReceived: o.snapshot.netCashReceived,
        refunded: o.snapshot.refunded, moneyReleaseDate: o.snapshot.moneyReleaseDate, moneyReleaseStatus: o.snapshot.moneyReleaseStatus, quality: o.snapshot.quality,
      } : null,
      hsRefunds: o.hsRefunds.map((r) => ({ mpRefundId: r.mpRefundId, amount: r.amount, status: r.status, wcRefundId: r.wcRefundId })),
      wooRefunded: o.wooRefunded,
    };
  };

  const rows = (list: Movement[]) => list.map((m) => {
    const r = results.get(m.uniqueKey);
    return {
      ...m,
      status: r?.status ?? m.reconciliationStatus ?? 'PENDIENTE',
      statusLabel: RECON_LABEL[r?.status ?? m.reconciliationStatus ?? 'PENDIENTE'],
      note: r?.note ?? m.reconciliationNote ?? null,
      delta: r?.delta ?? null,
      order: orderInfo(m.orderId),
    };
  });

  return NextResponse.json({
    month, range, backendMissing: false,
    kpis,
    movements: rows(movements),
    settlement: rows(settlement),
    missingPayments: missing,
    files: files.ok ? files.body?.files || [] : [],
    runs: runs.ok ? runs.body?.runs || [] : [],
  });
}

