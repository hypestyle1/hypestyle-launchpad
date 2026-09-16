'use client';

// MERCADO PAGO — CONCILIACIÓN. Un mes (hora Argentina) por fecha de liberación.
// Payment API explica cada pedido; los reportes de MP confirman la caja.
// Cada fila abre el detalle: pedido Woo vs Payment API vs movimiento del reporte.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { KpiCard } from '@/components/admin/dashboard/blocks';

type Status = 'CONCILIADO' | 'PENDIENTE' | 'DIFERENCIA' | 'SIN_PEDIDO' | 'SIN_PAGO' | 'LIQUIDACION_PENDIENTE' | 'REFUND' | 'REFUND_SIN_REGISTRO' | 'CHARGEBACK' | 'DISPUTA' | 'AJUSTE' | 'SIN_CLASIFICAR';

type Row = {
  uniqueKey: string; reportKind: string; fileName: string; description: string; kind: string; paymentId: string | null; orderId: number | null;
  grossAmount: number; feeAmount: number; financingAmount: number; taxAmount: number; credit: number; debit: number; netAmount: number;
  releaseDate: string | null; approvalDate: string | null; balance: number | null; rawMetadata: any;
  status: Status; statusLabel: string; note: string | null; delta: number | null;
  order: {
    id: number; number: string; status: string; transactionId: string | null;
    snapshot: { gross: number; feeGateway: number; feeFinancing: number; feeOther: number; taxWithholdingTotal: number; netBeforeRefunds: number; netCashReceived: number; refunded: number; moneyReleaseDate: string | null; moneyReleaseStatus: string | null; quality: string } | null;
    hsRefunds: { mpRefundId: string | null; amount: number; status: string; wcRefundId: number | null }[];
    wooRefunded: number;
  } | null;
};

type Resp = {
  month: string; backendMissing: boolean; error?: string;
  kpis: {
    grossSales: number; netPaymentApi: number; netReconciled: number; unlinkedNet: number;
    unlinkedByKind: Record<string, { count: number; credit: number; debit: number; net: number }>;
    pendingDifference: number; coverageCount: number; coverageAmount: number; counts: Record<Status, number>; payments: number; salesNoOrder: number; missingPayments: number;
  } | null;
  movements: Row[]; settlement: Row[];
  missingPayments: { id: number; number: string; status: string; transactionId: string | null; total: number; datePaid: string | null }[];
  files: { id: number; report_kind: string; file_name: string; begin_date: string | null; end_date: string | null; sha256: string; row_count: number; downloaded_at: string | null; processed_at: string | null; status: string; error: string | null }[];
  runs: { id: number; at: string; kind: string; summary: any }[];
};

const STATUS_TONE: Record<Status, string> = {
  CONCILIADO: 'bg-green-100 text-green-700', PENDIENTE: 'bg-muted text-muted-foreground', DIFERENCIA: 'bg-red-100 text-red-700',
  SIN_PEDIDO: 'bg-yellow-100 text-yellow-800', SIN_PAGO: 'bg-yellow-100 text-yellow-800', LIQUIDACION_PENDIENTE: 'bg-blue-100 text-blue-800',
  REFUND: 'bg-purple-100 text-purple-700', REFUND_SIN_REGISTRO: 'bg-red-100 text-red-700', CHARGEBACK: 'bg-red-100 text-red-700', DISPUTA: 'bg-orange-100 text-orange-800', AJUSTE: 'bg-muted text-muted-foreground',
  SIN_CLASIFICAR: 'bg-yellow-100 text-yellow-800',
};
const STATUS_ORDER: Status[] = ['CONCILIADO', 'DIFERENCIA', 'PENDIENTE', 'SIN_PEDIDO', 'SIN_PAGO', 'LIQUIDACION_PENDIENTE', 'REFUND', 'REFUND_SIN_REGISTRO', 'CHARGEBACK', 'DISPUTA', 'AJUSTE', 'SIN_CLASIFICAR'];
const STATUS_LABEL: Record<Status, string> = {
  CONCILIADO: 'Conciliado', PENDIENTE: 'Pendiente', DIFERENCIA: 'Diferencia', SIN_PEDIDO: 'Sin pedido', SIN_PAGO: 'Sin pago', LIQUIDACION_PENDIENTE: 'Liquidación pendiente',
  REFUND: 'Refund', REFUND_SIN_REGISTRO: 'Refund sin registro', CHARGEBACK: 'Chargeback', DISPUTA: 'Disputa', AJUSTE: 'Ajuste', SIN_CLASIFICAR: 'Sin clasificar',
};
const KIND_LABEL: Record<string, string> = {
  payment: 'Venta', payment_out: 'Pago nuestro', refund: 'Refund de venta', refund_in: 'Devolución recibida', chargeback: 'Contracargo', dispute: 'Disputa',
  tax_operation: 'Retención por operación', tax_monthly: 'Percepción / impuesto', reserve: 'Reserva', payout: 'Retiro', fee: 'Fee', adjustment: 'Ajuste', other: 'Otro',
  unclassified: 'Fila ilegible',
};

const fmt = (n: number | null | undefined) => n === null || n === undefined ? '—' : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtDT = (s: string | null | undefined) => {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};
const thisMonth = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).slice(0, 7);
const monthOptions = () => {
  const out: string[] = [];
  const [y, m] = thisMonth().split('-').map(Number);
  for (let i = 0; i < 18; i++) { const d = new Date(Date.UTC(y, m - 1 - i, 1)); out.push(d.toISOString().slice(0, 7)); }
  return out;
};

export default function ConciliacionPage() {
  const { autorizado, headers, puede, ingresarConClave } = useAdminAuth();
  const [keyInput, setKeyInput] = useState('');
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState<Resp | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [filter, setFilter] = useState<Status | 'ALL'>('ALL');
  const [open, setOpen] = useState<Row | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async (m: string) => {
    if (!puede('costos')) return;
    setState('loading');
    try {
      const res = await fetch(`/api/admin/finance/conciliacion?month=${m}&_=${Date.now()}`, { headers: headers(), cache: 'no-store' });
      if (!res.ok) throw new Error();
      setData(await res.json());
      setState('ok');
    } catch { setState('error'); }
  }, [headers, puede]);

  useEffect(() => { if (autorizado) load(month); }, [autorizado, month, load]);

  async function action(body: Record<string, unknown>, label: string) {
    setBusy(label); setMsg('');
    try {
      const res = await fetch('/api/admin/finance/mp-reports', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() }, body: JSON.stringify(body) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(j.error || `Error ${res.status}`); return; }
      if (body.action === 'sync' || body.action === 'reprocess' || body.action === 'reconcile') {
        setMsg(`${label}: ${j.filesDownloaded ?? 0} archivos nuevos · ${j.rowsParsed ?? 0} filas · ${j.matched ?? 0} conciliados · ${j.discrepancies ?? 0} diferencias · ${j.errors?.length ?? 0} errores${j.backendMissing ? ' · BACKEND SIN DESPLEGAR' : ''}`);
      } else if (body.action === 'generate') {
        setMsg(`Pedido a MP: ${Object.entries(j.results || {}).map(([k, v]: any) => `${k} ${v.ok ? 'OK' : `error ${v.error}`}`).join(' · ')}. Tarda unos minutos; después "Sincronizar".`);
      } else setMsg(JSON.stringify(j).slice(0, 300));
      await load(month);
    } catch (e: any) { setMsg(String(e?.message || e)); }
    finally { setBusy(null); }
  }

  const rows = useMemo(() => {
    if (!data) return [];
    const all = [...data.movements, ...data.settlement.filter((s) => s.status === 'LIQUIDACION_PENDIENTE' || s.status === 'SIN_PEDIDO')];
    return filter === 'ALL' ? all : all.filter((r) => r.status === filter);
  }, [data, filter]);

  if (autorizado === false) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="bg-card rounded-lg border border-border p-8 w-full max-w-sm text-center">
          <p className="text-[13px] text-muted-foreground mb-4">Clave de administrador</p>
          <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') ingresarConClave(keyInput); }}
            className="w-full border border-border rounded-lg px-3 py-2 text-[13px] mb-3" />
          <button onClick={() => ingresarConClave(keyInput)} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold">Entrar</button>
        </div>
      </div>
    );
  }
  if (autorizado && !puede('costos')) return <div className="p-8 text-[13px] text-muted-foreground">Tu perfil no tiene acceso a Finanzas.</div>;

  const k = data?.kpis || null;

  return (
    <div className="px-4 md:px-6 py-5 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[18px] font-bold text-foreground">Mercado Pago — Conciliación</h1>
          <p className="text-[12px] text-muted-foreground">Base: fecha de liberación (reporte de dinero liberado). Payment API explica el pedido; el reporte confirma la caja.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="border border-border rounded-lg px-3 py-1.5 text-[12.5px] bg-card">
            {monthOptions().map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={() => load(month)} className="px-3 py-1.5 rounded-lg border border-border text-[12px] font-medium text-foreground hover:bg-muted/50 flex items-center gap-1.5"><RefreshCw size={13} /> Actualizar</button>
          <button onClick={() => action({ action: 'sync' }, 'Sincronizar')} disabled={!!busy} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold hover:opacity-90 disabled:opacity-40">{busy === 'Sincronizar' ? 'Sincronizando…' : 'Sincronizar reportes'}</button>
          <button onClick={() => action({ action: 'generate', month }, 'Generar')} disabled={!!busy} className="px-3 py-1.5 rounded-lg border border-border text-[12px] font-medium hover:bg-muted/50 disabled:opacity-40">{busy === 'Generar' ? 'Pidiendo…' : `Pedir a MP ${month}`}</button>
          <button onClick={() => action({ action: 'reconcile', month }, 'Re-conciliar')} disabled={!!busy} className="px-3 py-1.5 rounded-lg border border-border text-[12px] font-medium hover:bg-muted/50 disabled:opacity-40">Re-conciliar</button>
        </div>
      </div>

      {msg && <div className="mb-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[12px] text-foreground">{msg}</div>}

      {data?.backendMissing && (
        <div className="mb-4 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-[12.5px] text-yellow-900">
          El backend de WordPress todavía no tiene las tablas del ledger (mu-plugin hypestyle-api.php 1.36.0 sin subir). Los reportes se pueden pedir a MP, pero no se persisten ni se concilian hasta desplegarlo.
        </div>
      )}

      {state === 'error' && <div className="text-[13px] text-red-700 mb-4">No se pudo cargar la conciliación.</div>}

      {k && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
          <KpiCard label="Ventas brutas MP" value={fmt(k.grossSales)} sub={`${k.payments} con pedido · ${k.salesNoOrder} sin pedido`} />
          <KpiCard label="Neto según Payment API" value={fmt(k.netPaymentApi)} sub="pedidos con snapshot" />
          <KpiCard label="Neto conciliado" value={fmt(k.netReconciled)} sub="ventas conciliadas − refunds/contracargos" />
          <KpiCard label="Movimientos sin pedido" value={fmt(k.unlinkedNet)} sub={Object.entries(k.unlinkedByKind).map(([kind, v]) => `${kind === 'payment' ? 'Venta sin pedido' : (KIND_LABEL[kind] || kind)} ${v.count}`).join(' · ') || 'ninguno'} />
          <KpiCard label="Diferencia pendiente" value={fmt(k.pendingDifference)} sub={`${k.counts.DIFERENCIA} diferencias · ${k.counts.PENDIENTE} pendientes · ${k.counts.REFUND_SIN_REGISTRO} refunds sin registro · ${k.missingPayments} sin pago`} />
          <KpiCard label="Cobertura conciliada" value={`${k.coverageCount}%`} sub={`${k.coverageAmount}% del neto de ventas con pedido`} />
        </div>
      )}

      {k && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          <FilterChip active={filter === 'ALL'} onClick={() => setFilter('ALL')} label={`Todos (${data!.movements.length})`} />
          {STATUS_ORDER.map((s) => {
            const n = s === 'SIN_PAGO' ? k.missingPayments : (k.counts[s] || 0) + (s === 'LIQUIDACION_PENDIENTE' ? data!.settlement.filter((x) => x.status === s).length : 0);
            if (!n) return null;
            return <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)} label={`${STATUS_LABEL[s]} (${n})`} tone={STATUS_TONE[s]} />;
          })}
        </div>
      )}

      {filter === 'SIN_PAGO' ? (
        <div className="bg-card rounded-lg border border-border overflow-x-auto mb-5">
          <table className="w-full text-[12px]">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="text-left px-3 py-2">Pedido</th><th className="text-left px-3 py-2">Estado</th><th className="text-left px-3 py-2">Payment ID</th><th className="text-right px-3 py-2">Total</th><th className="text-left px-3 py-2">Pagado</th></tr></thead>
            <tbody>
              {data!.missingPayments.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-3 py-2"><Link href={`/admin/pedidos/${o.id}`} className="underline underline-offset-2">#{o.number}</Link></td>
                  <td className="px-3 py-2">{o.status}</td><td className="px-3 py-2 font-mono">{o.transactionId || '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(o.total)}</td><td className="px-3 py-2">{fmtDT(o.datePaid ? `${o.datePaid}Z` : null)}</td>
                </tr>
              ))}
              {data!.missingPayments.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">Todos los pedidos MP cobrados en el mes tienen su fila en el reporte.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-x-auto mb-5">
          <table className="w-full text-[12px]">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr><th className="text-left px-3 py-2">Liberado</th><th className="text-left px-3 py-2">Tipo</th><th className="text-left px-3 py-2">Pedido</th><th className="text-left px-3 py-2">Payment ID</th><th className="text-right px-3 py-2">Bruto</th><th className="text-right px-3 py-2">Neto</th><th className="text-left px-3 py-2">Estado</th><th className="text-left px-3 py-2">Nota</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.uniqueKey} onClick={() => setOpen(r)} className="border-t border-border hover:bg-muted/40 cursor-pointer">
                  <td className="px-3 py-1.5 whitespace-nowrap">{fmtDT(r.releaseDate)}{r.reportKind === 'settlement_report' && <span className="ml-1 text-[10px] text-muted-foreground">(settl.)</span>}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap">{KIND_LABEL[r.kind] || r.kind}<span className="block text-[10.5px] text-muted-foreground">{r.description}</span></td>
                  <td className="px-3 py-1.5">{r.orderId ? <Link href={`/admin/pedidos/${r.orderId}`} onClick={(e) => e.stopPropagation()} className="underline underline-offset-2">#{r.orderId}</Link> : '—'}</td>
                  <td className="px-3 py-1.5 font-mono text-[11px]">{r.paymentId || '—'}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{fmt(r.grossAmount)}</td>
                  <td className={`px-3 py-1.5 text-right tabular-nums ${r.netAmount < 0 ? 'text-destructive' : ''}`}>{fmt(r.netAmount)}</td>
                  <td className="px-3 py-1.5"><span className={`text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 ${STATUS_TONE[r.status]}`}>{STATUS_LABEL[r.status]}</span></td>
                  <td className="px-3 py-1.5 text-[11px] text-muted-foreground max-w-[360px] truncate" title={r.note || ''}>{r.note || ''}</td>
                </tr>
              ))}
              {state === 'ok' && rows.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Sin movimientos para este mes en el ledger. Pedí el reporte a MP y sincronizá.</td></tr>}
              {state === 'loading' && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Cargando…</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="text-[13px] font-semibold text-foreground mb-2">Reportes</h2>
      <div className="bg-card rounded-lg border border-border overflow-x-auto mb-5">
        <table className="w-full text-[12px]">
          <thead className="text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="text-left px-3 py-2">Tipo</th><th className="text-left px-3 py-2">Período</th><th className="text-left px-3 py-2">Archivo</th><th className="text-left px-3 py-2">Descargado</th><th className="text-right px-3 py-2">Filas</th><th className="text-left px-3 py-2">Hash</th><th className="text-left px-3 py-2">Estado</th><th className="px-3 py-2"></th></tr></thead>
          <tbody>
            {(data?.files || []).map((f) => (
              <tr key={f.id} className="border-t border-border">
                <td className="px-3 py-1.5">{f.report_kind === 'release_report' ? 'Dinero liberado' : 'Transacciones'}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{(f.begin_date || '').slice(0, 10)} → {(f.end_date || '').slice(0, 10)}</td>
                <td className="px-3 py-1.5 font-mono text-[11px]">{f.file_name}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{fmtDT(f.downloaded_at ? `${f.downloaded_at}Z` : null)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{f.row_count}</td>
                <td className="px-3 py-1.5 font-mono text-[10.5px] text-muted-foreground">{f.sha256.slice(0, 12)}</td>
                <td className="px-3 py-1.5">{f.status}{f.error && <span className="block text-[10.5px] text-red-700">{f.error}</span>}</td>
                <td className="px-3 py-1.5 text-right"><button onClick={() => action({ action: 'reprocess', fileName: f.file_name }, `Reprocesar ${f.file_name}`)} disabled={!!busy} className="px-2 py-1 rounded-md border border-border text-[11px] hover:bg-muted/50 disabled:opacity-40">Reprocesar</button></td>
              </tr>
            ))}
            {(data?.files || []).length === 0 && <tr><td colSpan={8} className="px-3 py-4 text-center text-muted-foreground">Ningún reporte en el ledger todavía.</td></tr>}
          </tbody>
        </table>
      </div>

      {(data?.runs || []).length > 0 && (
        <details className="mb-6">
          <summary className="text-[12px] text-muted-foreground cursor-pointer">Últimas corridas ({data!.runs.length})</summary>
          <div className="mt-2 space-y-1 text-[11.5px] text-muted-foreground">
            {data!.runs.map((r) => (
              <div key={r.id}>{fmtDT(`${r.at}Z`)} · {r.kind} · {typeof r.summary === 'object' && r.summary ? `${r.summary.filesDownloaded ?? 0} archivos · ${r.summary.rowsParsed ?? 0} filas · ${r.summary.matched ?? 0} conciliados · ${r.summary.discrepancies ?? 0} dif. · ${(r.summary.errors || []).length} errores` : ''}</div>
            ))}
          </div>
        </details>
      )}

      {open && <DetailPanel row={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function FilterChip({ active, onClick, label, tone }: { active: boolean; onClick: () => void; label: string; tone?: string }) {
  return (
    <button onClick={onClick} className={`text-[11px] font-medium rounded-full px-2.5 py-1 border ${active ? 'border-foreground bg-foreground text-background' : `border-border ${tone || 'bg-card text-foreground'} hover:opacity-80`}`}>{label}</button>
  );
}

function Cell({ label, a, b, c }: { label: string; a: string; b: string; c: string }) {
  const diff = a !== b || (c !== '—' && c !== b);
  return (
    <tr className={`border-t border-border ${diff ? 'bg-yellow-50/60' : ''}`}>
      <td className="px-3 py-1.5 text-muted-foreground">{label}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{a}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{b}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{c}</td>
    </tr>
  );
}

function DetailPanel({ row, onClose }: { row: Row; onClose: () => void }) {
  const s = row.order?.snapshot || null;
  const woo = row.order;
  const rep = row;
  const isSale = row.kind === 'payment';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-3xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="text-[14px] font-bold text-foreground">{KIND_LABEL[row.kind] || row.kind} · {row.description}</div>
            <div className="text-[11.5px] text-muted-foreground">Liberado {fmtDT(row.releaseDate)} · aprobado {fmtDT(row.approvalDate)} · archivo <span className="font-mono">{row.fileName}</span></div>
          </div>
          <span className={`text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 ${STATUS_TONE[row.status]}`}>{STATUS_LABEL[row.status]}</span>
        </div>
        {row.note && <div className="mb-3 rounded-lg bg-muted/50 px-3 py-2 text-[12px] text-foreground">{row.note}</div>}

        <table className="w-full text-[12px] mb-4">
          <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr><th className="text-left px-3 py-2"></th><th className="text-right px-3 py-2">Pedido Woo</th><th className="text-right px-3 py-2">Payment API</th><th className="text-right px-3 py-2">Reporte MP</th></tr>
          </thead>
          <tbody>
            <Cell label="Identidad" a={woo ? `#${woo.number}` : '—'} b={woo?.transactionId || '—'} c={rep.paymentId || '—'} />
            <Cell label="Bruto" a={s ? fmt(s.gross) : '—'} b={s ? fmt(s.gross) : '—'} c={fmt(rep.grossAmount)} />
            <Cell label="Comisión" a="—" b={s ? fmt(-s.feeGateway) : '—'} c={fmt(rep.feeAmount)} />
            <Cell label="Financiación" a="—" b={s ? fmt(-s.feeFinancing) : '—'} c={fmt(rep.financingAmount)} />
            <Cell label="Retenciones" a="—" b={s ? fmt(-s.taxWithholdingTotal) : '—'} c={fmt(rep.taxAmount)} />
            <Cell label={isSale ? 'Neto' : 'Movimiento'} a="—" b={s ? fmt(s.netBeforeRefunds) : '—'} c={fmt(rep.netAmount)} />
            {isSale && s && <Cell label="Delta neto" a="—" b="—" c={row.delta === null ? '—' : fmt(row.delta)} />}
            <Cell label="Refunds" a={woo ? fmt(woo.wooRefunded) : '—'} b={s ? fmt(s.refunded) : '—'} c={row.kind === 'refund' ? fmt(rep.debit) : '—'} />
            <Cell label="Liberación" a="—" b={s ? `${fmtDT(s.moneyReleaseDate)} · ${s.moneyReleaseStatus || ''}` : '—'} c={fmtDT(rep.releaseDate)} />
          </tbody>
        </table>

        {woo && woo.hsRefunds.length > 0 && (
          <div className="text-[11.5px] text-muted-foreground mb-3">Refunds registrados: {woo.hsRefunds.map((r) => `${r.mpRefundId || '?'} ${fmt(r.amount)} ${r.status}${r.wcRefundId ? ` Woo #${r.wcRefundId}` : ''}`).join(' · ')}</div>
        )}
        {row.rawMetadata && (
          <details className="text-[11px] text-muted-foreground">
            <summary className="cursor-pointer">Datos crudos del reporte</summary>
            <pre className="mt-1 whitespace-pre-wrap break-all bg-muted/40 rounded p-2">{JSON.stringify(row.rawMetadata, null, 1)}</pre>
          </details>
        )}
        <div className="mt-4 flex justify-between items-center">
          {woo ? <Link href={`/admin/pedidos/${woo.id}`} className="text-[12px] underline underline-offset-2">Abrir pedido #{woo.number}</Link> : <span />}
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg border border-border text-[12px] font-medium hover:bg-muted/50">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
