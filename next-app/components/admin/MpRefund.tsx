'use client';

// Bloque "Mercado Pago" del detalle del pedido: reembolsado / disponible,
// historial de refunds y el modal para reembolsar (total o parcial).
//
// Todo pasa por /api/admin/orders/[id]/refund (server-side, sección
// `reembolsos`). El "disponible" que se muestra es el FRESCO de MP, no el del
// snapshot. La idempotency key la genera el servidor al cargar el estado y se
// reutiliza idéntica ante un reintento del mismo intento: un doble click o un
// corte de red nunca duplican el reembolso.

import { useCallback, useEffect, useRef, useState } from 'react';

type HsRefund = {
  mpRefundId: string | null; paymentId: string; amount: number; type: 'full' | 'partial'; at: string; actor: string;
  idempotencyKey: string; wcRefundId: number | null; status: 'completed' | 'mp_completed_woo_pending' | 'failed';
  reason?: string; error?: string; origin: 'admin' | 'external'; mpStatus?: string | null;
};

type Preview = {
  supported: boolean; reason?: string; mpError?: string; error?: string;
  orderId: number; number?: string; paymentId: string | null;
  customer?: { name: string; email: string };
  mp?: { status: string | null; statusDetail: string | null; gross: number; refunded: number; refundable: number };
  refunds: HsRefund[];
  wooRefunds?: { id: number; total: number; reason: string }[];
  summary: { unregistered: number | null; pendingWoo: { mpRefundId: string | null; amount: number; origin: string }[] };
  idempotencyKey?: string;
};

type Done = { amount: number; mpRefundId: string | null; wcRefundId: number | null; at: string; type: 'full' | 'partial' };

const fmt2 = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtDT = (s: string) => {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const STATUS_LABEL: Record<HsRefund['status'], { text: string; cls: string }> = {
  completed: { text: 'Registrado', cls: 'bg-green-100 text-green-700' },
  mp_completed_woo_pending: { text: 'Sin registro Woo', cls: 'bg-yellow-100 text-yellow-800' },
  failed: { text: 'Falló', cls: 'bg-red-100 text-red-700' },
};

export function MpRefundBlock({ orderId, orderNumber, adminKey, mpUrl, isMp, onChanged }: {
  orderId: number; orderNumber: string; adminKey: string; mpUrl: string | null; isMp: boolean; onChanged: () => void;
}) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [httpStatus, setHttpStatus] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [repairing, setRepairing] = useState<string | null>(null);
  const [repairMsg, setRepairMsg] = useState('');

  const load = useCallback(async () => {
    if (!isMp) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/orders/${orderId}/refund?_=${Date.now()}`, { headers: { 'x-admin-key': adminKey }, cache: 'no-store' });
      setHttpStatus(r.status);
      const j = await r.json().catch(() => null);
      setPreview(j);
    } catch {
      setHttpStatus(0);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [orderId, adminKey, isMp]);

  useEffect(() => { load(); }, [load]);

  async function repair(mpRefundId: string) {
    setRepairing(mpRefundId);
    setRepairMsg('');
    try {
      const r = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ action: 'repair', mpRefundId }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { setRepairMsg(j.error || `Error ${r.status}`); return; }
      setRepairMsg(`Registrado en WooCommerce como refund #${j.entry?.wcRefundId ?? '?'}.`);
      await load();
      onChanged();
    } catch (e: any) {
      setRepairMsg(String(e?.message || e));
    } finally {
      setRepairing(null);
    }
  }

  if (!isMp) return null;
  if (httpStatus === 403) {
    return <div className="mt-3 pt-3 border-t border-border text-[11.5px] text-muted-foreground">Reembolsos: tu perfil no tiene la sección <span className="font-mono">reembolsos</span>.</div>;
  }
  if (httpStatus === 503) {
    return <div className="mt-3 pt-3 border-t border-border text-[11.5px] text-yellow-700">Reembolsos deshabilitados: falta configurar el token de Mercado Pago.</div>;
  }

  const mp = preview?.mp || null;
  const refunds = preview?.refunds || [];
  const canRefund = !!mp && mp.refundable > 0 && !loading;

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Mercado Pago</div>
        {loading && <span className="text-[10.5px] text-muted-foreground/70">consultando…</span>}
      </div>

      {preview?.mpError && <div className="text-[11.5px] text-yellow-700 mb-2">Mercado Pago no respondió: {preview.mpError}</div>}
      {preview && preview.supported === false && preview.reason === 'missing_payment_id' && (
        <div className="text-[11.5px] text-muted-foreground mb-2">Sin Payment ID: no se puede reembolsar desde acá.</div>
      )}

      {mp && (
        <div className="text-[12.5px]">
          <Row label="Estado del pago" value={<span className="text-foreground">{mp.status}{mp.statusDetail && mp.statusDetail !== 'accredited' ? ` · ${mp.statusDetail}` : ''}</span>} />
          <Row label="Reembolsado" value={<span className={`tabular-nums ${mp.refunded > 0 ? 'text-destructive' : 'text-foreground'}`}>{mp.refunded > 0 ? '−' : ''}{fmt2(mp.refunded)}</span>} />
          <Row label="Disponible para reembolsar" value={<span className="tabular-nums font-semibold text-foreground">{fmt2(mp.refundable)}</span>} />
          {preview?.summary?.unregistered != null && preview.summary.unregistered > 0.01 && (
            <div className="mt-1 text-[11.5px] text-yellow-700">
              Hay {fmt2(preview.summary.unregistered)} devueltos en Mercado Pago sin registro en WooCommerce.
            </div>
          )}
        </div>
      )}

      {refunds.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {refunds.map((r) => {
            const st = STATUS_LABEL[r.status];
            return (
              <div key={r.idempotencyKey} className="rounded-md border border-border px-2.5 py-2 text-[11.5px]">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 ${st.cls}`}>{r.origin === 'external' && r.status === 'mp_completed_woo_pending' ? 'Refund externo · sin registro Woo' : st.text}</span>
                    <span className="tabular-nums text-foreground">{fmt2(r.amount)}</span>
                    <span className="text-muted-foreground">{r.type === 'full' ? 'total' : 'parcial'}</span>
                  </div>
                  <span className="text-muted-foreground/70">{fmtDT(r.at)}</span>
                </div>
                <div className="mt-0.5 text-muted-foreground flex flex-wrap gap-x-3">
                  {r.mpRefundId && <span>MP <span className="font-mono text-foreground">{r.mpRefundId}</span></span>}
                  {r.wcRefundId && <span>Woo <span className="font-mono text-foreground">#{r.wcRefundId}</span></span>}
                  <span>{r.actor}</span>
                  {r.reason && <span>· {r.reason}</span>}
                </div>
                {r.error && <div className="mt-0.5 text-red-700">{r.error}</div>}
                {r.status === 'mp_completed_woo_pending' && r.mpRefundId && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <button
                      onClick={() => repair(r.mpRefundId!)}
                      disabled={repairing !== null}
                      className="px-2.5 py-1 rounded-md border border-border text-[11.5px] font-medium text-foreground hover:bg-muted/50 disabled:opacity-50"
                    >
                      {repairing === r.mpRefundId ? 'Registrando…' : (r.origin === 'external' ? 'Registrar en Woo' : 'Reintentar registro en Woo')}
                    </button>
                    <span className="text-muted-foreground/70">Sólo registra en WooCommerce. No vuelve a devolver dinero.</span>
                  </div>
                )}
              </div>
            );
          })}
          {repairMsg && <div className="text-[11.5px] text-foreground">{repairMsg}</div>}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {mpUrl && (
          <a href={mpUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg border border-border text-[12px] font-medium text-foreground hover:bg-muted/50">
            Ver en Mercado Pago
          </a>
        )}
        <button
          onClick={() => setModal(true)}
          disabled={!canRefund}
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold hover:opacity-90 disabled:opacity-40"
          title={!mp ? 'Esperando a Mercado Pago' : mp.refundable <= 0 ? 'No queda nada por reembolsar' : ''}
        >
          Reembolsar
        </button>
      </div>

      {modal && preview && mp && preview.idempotencyKey && (
        <RefundModal
          orderId={orderId}
          orderNumber={orderNumber}
          adminKey={adminKey}
          customer={preview.customer || { name: '', email: '' }}
          paymentId={preview.paymentId || ''}
          gross={mp.gross}
          refunded={mp.refunded}
          refundable={mp.refundable}
          idempotencyKey={preview.idempotencyKey}
          onClose={async (changed) => { setModal(false); if (changed) { await load(); onChanged(); } }}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function RefundModal({ orderId, orderNumber, adminKey, customer, paymentId, gross, refunded, refundable, idempotencyKey, onClose }: {
  orderId: number; orderNumber: string; adminKey: string; customer: { name: string; email: string }; paymentId: string;
  gross: number; refunded: number; refundable: number; idempotencyKey: string; onClose: (changed: boolean) => void;
}) {
  const [mode, setMode] = useState<'full' | 'partial'>('full');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [phase, setPhase] = useState<'confirm' | 'submitting' | 'done' | 'error'>('confirm');
  const [error, setError] = useState('');
  const [repairable, setRepairable] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const inFlight = useRef(false);
  // La key es del intento: fija mientras el modal esté abierto, reintentos incluidos.
  const keyRef = useRef(idempotencyKey);

  const parsed = mode === 'full' ? refundable : parseAmountClient(amount);
  const amountOk = parsed !== null && parsed > 0 && parsed <= refundable + 1e-9;

  async function submit() {
    if (inFlight.current || !amountOk) return;
    inFlight.current = true;
    setPhase('submitting');
    setError('');
    try {
      const r = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ action: 'refund', mode, amount: mode === 'partial' ? amount : undefined, idempotencyKey: keyRef.current, reason: reason.trim() || undefined }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) {
        setDone({ amount: j.entry.amount, mpRefundId: j.entry.mpRefundId, wcRefundId: j.entry.wcRefundId, at: j.entry.at, type: j.entry.type });
        setPhase('done');
        return;
      }
      setError(j.error || `Error ${r.status}`);
      setRepairable(!!j.repairable);
      setPhase('error');
    } catch (e: any) {
      // Corte de red: no sabemos si MP ejecutó. Reintentar con LA MISMA key es seguro.
      setError(`Sin respuesta del servidor (${String(e?.message || e)}). Podés reintentar: se usa la misma clave de idempotencia, no se duplica.`);
      setRepairable(false);
      setPhase('error');
    } finally {
      inFlight.current = false;
    }
  }

  const busy = phase === 'submitting';
  // Una vez que MP pudo haber ejecutado, el modal no se cierra por accidente:
  // sólo con el botón explícito, y la pantalla de atrás se recarga.
  const lockClose = busy || phase === 'done' || (phase === 'error' && repairable);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => { if (!lockClose) onClose(false); }}>
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-[15px] font-bold text-foreground mb-1 uppercase tracking-wide">Reembolsar pedido #{orderNumber}</h2>

        {phase === 'done' && done ? (
          <div className="mt-3">
            <div className="text-[13px] font-semibold text-green-700 mb-2">Reembolso realizado</div>
            <dl className="text-[12.5px] space-y-1">
              <div className="flex justify-between"><dt className="text-muted-foreground">Monto</dt><dd className="tabular-nums text-foreground">{fmt2(done.amount)} ({done.type === 'full' ? 'total' : 'parcial'})</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">MP Refund ID</dt><dd className="font-mono text-foreground">{done.mpRefundId || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">WC Refund ID</dt><dd className="font-mono text-foreground">{done.wcRefundId ? `#${done.wcRefundId}` : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Fecha</dt><dd className="text-foreground">{fmtDT(done.at)}</dd></div>
            </dl>
            <p className="mt-3 text-[11.5px] text-muted-foreground">El dinero vuelve al medio de pago original. El stock no se repuso: si corresponde, hacelo aparte.</p>
            <button onClick={() => onClose(true)} className="mt-4 w-full py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:opacity-90">Cerrar</button>
          </div>
        ) : (
          <>
            <dl className="mt-3 text-[12.5px] space-y-1">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Cliente</dt><dd className="text-foreground text-right">{customer.name}{customer.email ? <span className="block text-[11px] text-muted-foreground">{customer.email}</span> : null}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Payment ID</dt><dd className="font-mono text-foreground">{paymentId}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Monto original</dt><dd className="tabular-nums text-foreground">{fmt2(gross)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Ya reembolsado</dt><dd className="tabular-nums text-foreground">{fmt2(refunded)}</dd></div>
              <div className="flex justify-between gap-3 pt-1 border-t border-border"><dt className="text-foreground font-medium">Disponible para reembolsar</dt><dd className="tabular-nums font-semibold text-foreground">{fmt2(refundable)}</dd></div>
            </dl>

            <div className="mt-4 space-y-2">
              <label className="flex items-center gap-2 text-[13px] text-foreground cursor-pointer">
                <input type="radio" name="refund-mode" checked={mode === 'full'} onChange={() => setMode('full')} disabled={busy} />
                Reembolso total <span className="text-muted-foreground tabular-nums">({fmt2(refundable)})</span>
              </label>
              <label className="flex items-center gap-2 text-[13px] text-foreground cursor-pointer">
                <input type="radio" name="refund-mode" checked={mode === 'partial'} onChange={() => setMode('partial')} disabled={busy} />
                Reembolso parcial
              </label>
              {mode === 'partial' && (
                <div className="pl-6">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-muted-foreground">$</span>
                    <input
                      type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={busy}
                      placeholder="0,00" autoFocus
                      className="w-40 border border-border rounded-lg px-3 py-1.5 text-[13px] tabular-nums focus:outline-none focus:border-border-mid"
                    />
                  </div>
                  {amount && !amountOk && <div className="mt-1 text-[11.5px] text-red-700">Ingresá un monto mayor a cero y hasta {fmt2(refundable)}.</div>}
                </div>
              )}
              <input
                type="text" value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy} maxLength={200}
                placeholder="Motivo (opcional, queda en la nota del pedido)"
                className="w-full border border-border rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:border-border-mid"
              />
            </div>

            <div className="mt-4 rounded-lg bg-muted/50 px-3 py-2 text-[11.5px] text-muted-foreground space-y-0.5">
              <div className="text-foreground font-medium">El dinero será devuelto al medio de pago original.</div>
              <div>El reembolso no repone stock automáticamente.</div>
            </div>

            {phase === 'error' && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800">
                {error}
                {repairable && <div className="mt-1 text-[11.5px]">Cerrá este modal y usá &ldquo;Reintentar registro en Woo&rdquo; en el bloque Mercado Pago. No se vuelve a devolver dinero.</div>}
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => onClose(phase === 'error' && repairable)}
                disabled={busy}
                className="flex-1 py-2 rounded-lg border border-border text-[13px] font-medium text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
              >
                {phase === 'error' && repairable ? 'Cerrar' : 'Cancelar'}
              </button>
              {!(phase === 'error' && repairable) && (
                <button
                  onClick={submit}
                  disabled={busy || !amountOk}
                  className="flex-1 py-2 rounded-lg bg-red-600 text-white text-[13px] font-semibold hover:bg-red-700 disabled:opacity-60"
                >
                  {busy ? 'Reembolsando…' : (phase === 'error' ? 'Reintentar' : 'Confirmar reembolso')}
                </button>
              )}
            </div>
            {busy && <div className="mt-2 text-[11.5px] text-muted-foreground text-center">Hablando con Mercado Pago y WooCommerce. No cierres esta ventana.</div>}
          </>
        )}
      </div>
    </div>
  );
}

function parseAmountClient(v: string): number | null {
  let s = v.trim().replace(/\s|\$/g, '');
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}
