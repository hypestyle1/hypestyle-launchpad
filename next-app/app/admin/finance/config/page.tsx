'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { FinanceSectionTitle } from '@/components/admin/finance/blocks';
import type { FinanceConfig, FeeRule, VariableCost, Provider } from '@/lib/finance/types';

const PROVIDERS: { id: Provider; label: string }[] = [
  { id: 'mercadopago_card', label: 'Mercado Pago — tarjeta' },
  { id: 'mercadopago_wallet', label: 'Mercado Pago — dinero en cuenta' },
  { id: 'gocuotas', label: 'GOcuotas' },
  { id: 'talo', label: 'Talo / transferencia' },
  { id: 'paypal', label: 'PayPal' },
  { id: 'manual', label: 'Manual' },
  { id: 'mayorista', label: 'Mayorista' },
];

export default function FinanceConfigPage() {
  const { autorizado, headers, puede, ingresarConClave } = useAdminAuth();
  const [keyInput, setKeyInput] = useState('');
  const [cfg, setCfg] = useState<FinanceConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    if (!puede('costos')) return;
    const res = await fetch('/api/admin/finance/config', { headers: headers() });
    if (res.ok) setCfg((await res.json()).config);
  }, [headers, puede]);
  useEffect(() => { if (autorizado) load(); }, [autorizado, load]);

  async function save() {
    if (!cfg) return;
    setSaving(true); setMsg('');
    try {
      const res = await fetch('/api/admin/finance/config', { method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify({ config: cfg }) });
      const d = await res.json();
      setMsg(res.ok ? 'Guardado.' : (d.error || 'No se pudo guardar (¿ruta PHP finance-config desplegada?).'));
    } catch { setMsg('Error al conectar.'); } finally { setSaving(false); }
  }

  if (autorizado === false) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="bg-card rounded-lg border border-border p-8 w-full max-w-sm text-center">
          <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="Clave admin"
            onKeyDown={(e) => { if (e.key === 'Enter') ingresarConClave(keyInput); }}
            className="w-full border border-border-mid bg-card text-foreground rounded-md px-3 py-2 text-[13px] mb-3" />
          <button onClick={() => ingresarConClave(keyInput)} className="w-full bg-primary text-primary-foreground rounded-md py-2 text-[13px] font-semibold">Entrar</button>
        </div>
      </div>
    );
  }
  if (!puede('costos')) return <div className="p-8 text-center text-[13px] text-muted-foreground">Sin acceso a Finanzas.</div>;
  if (!cfg) return <div className="p-8 text-center text-[13px] text-muted-foreground">Cargando…</div>;

  const feeOf = (p: Provider) => cfg.feeRules.find((r) => r.provider === p && r.to === null) || cfg.feeRules.find((r) => r.provider === p);
  const setFee = (p: Provider, patch: Partial<FeeRule>) => {
    const rules = [...cfg.feeRules];
    const idx = rules.findIndex((r) => r.provider === p && (r.to === null));
    if (idx >= 0) rules[idx] = { ...rules[idx], ...patch };
    else rules.push({ id: `${p}_${Date.now()}`, provider: p, percent: 0, fixed: 0, from: '2026-01-01', to: null, ...patch });
    setCfg({ ...cfg, feeRules: rules });
  };

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-foreground">Configuración financiera</h1>
        <button onClick={save} disabled={saving} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button>
      </div>
      <p className="text-[13px] text-muted-foreground mb-1">Reglas de comisiones, costos variables y envío. Se aplican a todo Finanzas.</p>
      {msg && <p className={`text-[12px] mb-3 ${msg === 'Guardado.' ? 'text-success' : 'text-warning'}`}>{msg}</p>}

      {/* Payment fees */}
      <FinanceSectionTitle>Comisiones por pasarela (vigentes)</FinanceSectionTitle>
      <p className="text-[12px] text-muted-foreground mb-3">Estas reglas son el fallback. Para Mercado Pago, el fee EXACTO por transacción (sincronizado) tiene prioridad sobre esta regla.</p>
      <div className="bg-card border border-border rounded-lg divide-y divide-border">
        {PROVIDERS.map((p) => {
          const r = feeOf(p.id);
          return (
            <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="text-[13px] text-foreground flex-1 min-w-[180px]">{p.label}</span>
              <label className="flex items-center gap-1 text-[12px] text-muted-foreground">%
                <input type="number" step="0.01" value={r ? (r.percent * 100).toFixed(2) : '0'} onChange={(e) => setFee(p.id, { percent: (parseFloat(e.target.value) || 0) / 100 })}
                  className="w-20 border border-border rounded-md bg-card px-2 py-1 text-[13px] text-foreground text-right tabular-nums" />
              </label>
              <label className="flex items-center gap-1 text-[12px] text-muted-foreground">Fijo $
                <input type="number" step="1" value={r ? r.fixed : 0} onChange={(e) => setFee(p.id, { fixed: parseFloat(e.target.value) || 0 })}
                  className="w-24 border border-border rounded-md bg-card px-2 py-1 text-[13px] text-foreground text-right tabular-nums" />
              </label>
            </div>
          );
        })}
      </div>

      {/* Variable costs */}
      <FinanceSectionTitle right={
        <button onClick={() => setCfg({ ...cfg, variableCosts: [...cfg.variableCosts, { id: `vc_${Date.now()}`, label: 'Nuevo costo', type: 'per_order', value: 0 }] })}
          className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"><Plus size={14} /> Agregar</button>
      }>Costos variables</FinanceSectionTitle>
      <div className="bg-card border border-border rounded-lg divide-y divide-border">
        {cfg.variableCosts.length === 0 && <p className="px-4 py-4 text-[13px] text-muted-foreground">Sin costos variables. Agregá packaging, bolsa, etc.</p>}
        {cfg.variableCosts.map((vc, i) => (
          <div key={vc.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
            <input value={vc.label} onChange={(e) => { const v = [...cfg.variableCosts]; v[i] = { ...vc, label: e.target.value }; setCfg({ ...cfg, variableCosts: v }); }}
              className="flex-1 min-w-[140px] border border-border rounded-md bg-card px-2 py-1 text-[13px] text-foreground" />
            <select value={vc.type} onChange={(e) => { const v = [...cfg.variableCosts]; v[i] = { ...vc, type: e.target.value as VariableCost['type'] }; setCfg({ ...cfg, variableCosts: v }); }}
              className="border border-border rounded-md bg-card px-2 py-1 text-[12px] text-foreground">
              <option value="per_order">Por pedido</option>
              <option value="per_unit">Por unidad</option>
              <option value="percent">% del revenue</option>
            </select>
            <input type="number" step="0.01" value={vc.type === 'percent' ? (vc.value * 100) : vc.value}
              onChange={(e) => { const raw = parseFloat(e.target.value) || 0; const v = [...cfg.variableCosts]; v[i] = { ...vc, value: vc.type === 'percent' ? raw / 100 : raw }; setCfg({ ...cfg, variableCosts: v }); }}
              className="w-24 border border-border rounded-md bg-card px-2 py-1 text-[13px] text-foreground text-right tabular-nums" />
            <button onClick={() => setCfg({ ...cfg, variableCosts: cfg.variableCosts.filter((x) => x.id !== vc.id) })} className="text-muted-foreground/60 hover:text-destructive"><Trash2 size={15} /></button>
          </div>
        ))}
      </div>

      {/* Shipping */}
      <FinanceSectionTitle>Envío</FinanceSectionTitle>
      <div className="bg-card border border-border rounded-lg px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="text-[13px] text-foreground flex-1 min-w-[200px]">Costo real fijo por envío (hasta integrar Andreani)</span>
        <label className="flex items-center gap-1 text-[12px] text-muted-foreground">$
          <input type="number" step="1" value={cfg.shipping.flatRealCost ?? ''} placeholder="sin configurar"
            onChange={(e) => setCfg({ ...cfg, shipping: { flatRealCost: e.target.value === '' ? null : (parseFloat(e.target.value) || 0) } })}
            className="w-28 border border-border rounded-md bg-card px-2 py-1 text-[13px] text-foreground text-right tabular-nums" />
        </label>
      </div>
      <p className="text-[11px] text-muted-foreground/70 mt-2">Si queda vacío, el envío absorbido se marca “Faltante” (no se asume $0).</p>
    </div>
  );
}
