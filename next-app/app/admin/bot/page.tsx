'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { fmtRelative, fmtDateTime } from '@/lib/admin-format';
import { KpiCard, SectionTitle } from '@/components/admin/dashboard/blocks';
import { DataTable, type Column } from '@/components/admin/DataTable';
import type { CapacityResult } from '@/lib/bot/capacity';

interface CapacityResp extends CapacityResult { lastUpdated: string; stale?: boolean; error?: string; }

const STATUS: Record<string, { label: string; tone: string; dot: string }> = {
  healthy:  { label: 'Saludable', tone: 'text-success', dot: 'bg-success' },
  watch:    { label: 'En observación', tone: 'text-muted-foreground', dot: 'bg-muted-foreground/50' },
  warning:  { label: 'Alerta', tone: 'text-warning', dot: 'bg-warning' },
  critical: { label: 'Crítico', tone: 'text-destructive', dot: 'bg-destructive' },
};
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

export default function BotHealth() {
  const { autorizado, headers, puede, ingresarConClave } = useAdminAuth();
  const [keyInput, setKeyInput] = useState('');
  const [data, setData] = useState<CapacityResp | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error' | 'unconfigured'>('loading');
  const [errMsg, setErrMsg] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (!puede('conversaciones')) return;
    setState('loading');
    try {
      const res = await fetch(`/api/admin/bot/capacity${refresh ? '?refresh=1' : ''}`, { headers: headers() });
      const d = await res.json();
      if (res.status === 400) { setState('unconfigured'); setErrMsg(d.hint || d.error); return; }
      if (!res.ok && !d.used) { setState('error'); setErrMsg(d.error || 'No pudimos consultar n8n'); return; }
      setData(d);
      setState('ok');
    } catch { setState('error'); setErrMsg('Error de conexión'); }
  }, [headers, puede]);

  useEffect(() => { if (autorizado) load(); }, [autorizado, load]);

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

  const d = data;
  const st = d ? STATUS[d.status] : null;

  const wfCols: Column<CapacityResult['workflows'][number]>[] = [
    { key: 'name', header: 'Workflow', render: (w) => <span className="truncate">{w.name}</span> },
    { key: 'executions', header: 'Ejecuciones', align: 'right', render: (w) => <span className="tabular-nums">{w.executions}</span> },
    { key: 'pct', header: '%', align: 'right', hideOnMobile: true, render: (w) => <span className="tabular-nums text-muted-foreground">{pct(w.pct)}</span> },
    { key: 'failed', header: 'Fallidas', align: 'right', hideOnMobile: true, render: (w) => w.failed > 0 ? <span className="tabular-nums text-destructive">{w.failed}</span> : <span className="text-muted-foreground/50">0</span> },
  ];

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-foreground">Bot</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Capacidad de ejecuciones de n8n y salud del bot.</p>
        </div>
        <div className="flex items-center gap-2">
          {d && <span className="text-[11px] text-muted-foreground">Actualizado {fmtRelative(d.lastUpdated)}</span>}
          <button onClick={() => load(true)} title="Actualizar" className="h-9 w-9 grid place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-border-mid">
            <RefreshCw size={14} className={state === 'loading' ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {!puede('conversaciones') ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-[13px] text-muted-foreground">Sin acceso a esta sección.</div>
      ) : state === 'unconfigured' ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-[14px] font-semibold text-foreground">n8n no conectado</p>
          <p className="text-[12px] text-muted-foreground mt-1">{errMsg} Agregá <code className="bg-muted px-1 rounded">N8N_API_KEY</code> (y opcional <code className="bg-muted px-1 rounded">N8N_API_URL</code>) en el servidor.</p>
        </div>
      ) : state === 'error' ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <AlertTriangle size={20} className="text-warning mx-auto mb-2" />
          <p className="text-[14px] font-semibold text-foreground">No pudimos actualizar n8n</p>
          <p className="text-[12px] text-muted-foreground mt-1">{errMsg}</p>
        </div>
      ) : d ? (
        <>
          {d.stale && <div className="mb-4 flex items-center gap-2 bg-warning-soft text-warning rounded-lg px-3 py-2 text-[12px]"><AlertTriangle size={14} /> No pudimos actualizar; mostrando el último dato válido ({fmtRelative(d.lastUpdated)}).</div>}

          {/* Capacity */}
          <SectionTitle>Capacidad del mes</SectionTitle>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Ejecuciones" value={<span>{d.used.toLocaleString('es-AR')} <span className="text-[14px] text-muted-foreground font-normal">/ {d.limit.toLocaleString('es-AR')}</span></span>} sub={`${pct(d.usagePct)} usado`} />
            <KpiCard label="Proyección fin de mes" value={d.projectedMonthEnd.toLocaleString('es-AR')} sub={`${pct(d.projectedPct)} del cupo`} />
            <KpiCard label="Restante" value={d.remaining.toLocaleString('es-AR')} sub={`${d.daysRemaining} días de mes`} />
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground/80">Estado</p>
              <p className={`text-[18px] font-bold mt-1.5 flex items-center gap-2 ${st?.tone}`}><span className={`h-2 w-2 rounded-full ${st?.dot}`} />{st?.label}</p>
              {d.exhaustionDate && <p className="text-[11px] text-destructive mt-1.5">Podría agotarse el {fmtDateTime(d.exhaustionDate).split(' ')[0]}</p>}
              {!d.exhaustionDate && <p className="text-[11px] text-muted-foreground/70 mt-1.5">Sin riesgo proyectado</p>}
            </div>
          </div>

          {/* Barra: actual + proyectado */}
          <div className="bg-card border border-border rounded-lg p-4 mt-3">
            <div className="flex justify-between text-[12px] text-muted-foreground mb-2">
              <span>Consumo del mes</span>
              <span className="tabular-nums">{d.used.toLocaleString('es-AR')} / {d.limit.toLocaleString('es-AR')}</span>
            </div>
            <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-muted-foreground/30" style={{ width: `${Math.min(100, d.projectedPct * 100)}%` }} title="Proyectado" />
              <div className="absolute inset-y-0 left-0 bg-foreground" style={{ width: `${Math.min(100, d.usagePct * 100)}%` }} title="Actual" />
            </div>
            <div className="flex gap-4 text-[11px] text-muted-foreground/70 mt-2">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-foreground" /> Actual {pct(d.usagePct)}</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground/30" /> Proyectado {pct(d.projectedPct)}</span>
            </div>
          </div>

          {/* Projection */}
          <SectionTitle>Proyección</SectionTitle>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Ejecuciones / día" value={d.avgDaily.toLocaleString('es-AR')} sub={`últimos 7 días: ${d.trailing7Avg.toLocaleString('es-AR')}/día`} />
            <KpiCard label="Proyección fin de mes" value={d.projectedMonthEnd.toLocaleString('es-AR')} />
            <KpiCard label="Utilización proyectada" value={pct(d.projectedPct)} />
            <KpiCard label="Días transcurridos" value={`${d.elapsedDays} / ${d.daysInMonth}`} />
          </div>

          {/* Workflows */}
          <SectionTitle>Ejecuciones por workflow</SectionTitle>
          <DataTable columns={wfCols} rows={d.workflows} keyOf={(w) => w.id} emptyTitle="Sin ejecuciones este mes" />

          {/* Health */}
          <SectionTitle>Salud</SectionTitle>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Exitosas" value={d.successful.toLocaleString('es-AR')} />
            <KpiCard label="Fallidas" value={d.failed.toLocaleString('es-AR')} />
            <KpiCard label="Tasa de fallo" value={pct(d.failureRate)} />
            <KpiCard label="Última fallida" value={d.lastFailedAtMs ? fmtRelative(new Date(d.lastFailedAtMs).toISOString()) || '—' : '—'} />
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-3">
            Ejecuciones ≠ mensajes de IA ≠ tokens: un ack de WhatsApp (delivered/read) consume una ejecución de n8n y cero tokens. El conteo es sobre ejecuciones retenidas por n8n; el límite del plan ({d.limit.toLocaleString('es-AR')}) se configura manualmente.
          </p>
        </>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[88px] bg-muted/40 rounded-lg animate-pulse" />)}</div>
      )}
    </div>
  );
}
