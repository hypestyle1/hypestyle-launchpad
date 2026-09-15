'use client';

// Bloque "Mercado Pago" del detalle del pedido: reembolsado / disponible e
// historial de refunds.
//
// Decisión 15/09/2026: los reembolsos se EJECUTAN en el panel de Mercado Pago
// (con la seguridad de MP), no desde acá: cualquiera con la clave del panel
// podría devolver pedidos ya entregados. Este bloque sólo lee el estado fresco
// de MP, detecta refunds hechos por fuera y permite REGISTRARLOS en Woo
// ("Registrar en Woo"), que no mueve plata. Todo pasa por
// /api/admin/orders/[id]/refund (server-side, sección `reembolsos`).

import { useCallback, useEffect, useState } from 'react';

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

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {mpUrl && (
          <a href={mpUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg border border-border text-[12px] font-medium text-foreground hover:bg-muted/50">
            Ver en Mercado Pago
          </a>
        )}
        <span className="text-[11px] text-muted-foreground/70">Los reembolsos se hacen en Mercado Pago. Al volver acá aparecen para registrarlos en Woo.</span>
      </div>
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

