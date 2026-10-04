'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Lock, RefreshCw, Upload, Download, Plus, Trash2, Ban, RotateCcw, Rocket, Instagram } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { toast } from '@/components/ui/sonner';
import { MetricCard, StatusBadge, ConfirmDialog } from '@/components/admin/ui';
import type { PrivateAccessConfig } from '@/lib/private-access/config';

// Panel de Private Access (preventa Mejores Amigos). Todo pasa por
// /api/admin/private-access/* → mu-plugin hypestyle-private-access.php.

interface Member {
  id: number; handle: string; name: string; source: string; status: 'active' | 'blocked'; note: string;
  createdAt: string | null; lastAccessAt: string | null; accessCount: number;
}
interface Stats {
  members: number; membersEntered: number; attempts: number; granted: number; denied: number;
  rateLimited: number; deviceLimited: number; paidOrders: number; revenue: number; collectionProducts: number;
}
interface ImportPreview { dryRun?: boolean; format: string; valid: number; sample: { handle: string; name: string }[]; invalid: string[]; invalidCount: number }

const SOURCE_LABEL: Record<string, string> = { csv: 'CSV', manual: 'Manual', close_friends: 'Close Friends', ig_export: 'Export IG' };
const ars = (n: number) => `$ ${Math.round(n).toLocaleString('es-AR')}`;
const fmtWhen = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }) : '—');

/** ISO con offset → valor de <input type="datetime-local"> en hora Argentina. */
function toLocalInput(iso: string): string {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? new Date(t - 3 * 3600_000).toISOString().slice(0, 16) : '';
}
function fromLocalInput(v: string): string { return v ? `${v}:00-03:00` : ''; }

export default function PrivateAccessAdminPage() {
  const { autorizado, headers, puede, ingresarConClave } = useAdminAuth();
  const [keyInput, setKeyInput] = useState('');
  const [state, setState] = useState<'loading' | 'ok' | 'error' | 'notdeployed'>('loading');
  const [config, setConfig] = useState<PrivateAccessConfig | null>(null);
  const [draft, setDraft] = useState<PrivateAccessConfig | null>(null);
  const [active, setActive] = useState(false);
  const [mock, setMock] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [newHandle, setNewHandle] = useState('');
  const [newName, setNewName] = useState('');
  const [importText, setImportText] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [toDelete, setToDelete] = useState<Member | null>(null);
  const [openPreview, setOpenPreview] = useState<{ published: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const PER = 50;

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const res = await fetch(`/api/admin/private-access${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...headers(), ...(init?.headers || {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data?.error || `HTTP ${res.status}`), { data, status: res.status });
    return data;
  }, [headers]);

  const loadHeader = useCallback(async () => {
    try {
      const d = await api('');
      if (d.notDeployed) { setState('notdeployed'); setConfig(d.config); setDraft(d.config); return; }
      setConfig(d.config); setDraft(d.config); setActive(d.active); setMock(!!d.mock); setStats(d.stats); setState('ok');
    } catch { setState('error'); }
  }, [api]);

  const loadMembers = useCallback(async (p = page, q = search) => {
    try {
      const d = await api(`/members?page=${p}&per_page=${PER}${q ? `&search=${encodeURIComponent(q)}` : ''}`);
      setMembers(d.members || []); setTotal(d.total || 0);
    } catch { /* el header ya muestra el error */ }
  }, [api, page, search]);

  const load = useCallback(async () => {
    if (!puede('creadores')) return;
    setState('loading');
    await loadHeader();
    await loadMembers();
  }, [puede, loadHeader, loadMembers]);

  // Carga una vez al autorizar; las recargas siguientes son explícitas.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (autorizado) load(); }, [autorizado]);
  useEffect(() => {
    if (!autorizado || state !== 'ok') return;
    const t = setTimeout(() => { setPage(1); loadMembers(1, search); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  /* ── Config ── */

  const dirty = !!(config && draft && JSON.stringify(config) !== JSON.stringify(draft));

  async function saveConfig(patch?: Partial<PrivateAccessConfig>) {
    const body = patch ?? draft;
    if (!body) return;
    setBusy('config');
    try {
      await api('', { method: 'POST', body: JSON.stringify({ patch: body }) });
      toast.success('Configuración guardada');
      await loadHeader();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  /* ── Miembros ── */

  async function addMember() {
    if (!newHandle.trim()) return;
    setBusy('add');
    try {
      const d = await api('/members', { method: 'POST', body: JSON.stringify({ action: 'upsert', handle: newHandle, name: newName }) });
      toast.success(d.created ? `@${d.member.handle} agregado` : `@${d.member.handle} ya estaba (actualizado)`);
      setNewHandle(''); setNewName('');
      await Promise.all([loadMembers(1, search), loadHeader()]);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  async function setStatus(m: Member, status: 'active' | 'blocked') {
    setBusy(`m:${m.handle}`);
    try {
      await api('/members', { method: 'POST', body: JSON.stringify({ action: 'upsert', handle: m.handle, status }) });
      setMembers(prev => prev.map(x => x.handle === m.handle ? { ...x, status } : x));
      toast.success(status === 'blocked' ? `@${m.handle} bloqueado` : `@${m.handle} reactivado`);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  async function deleteMember(m: Member) {
    setBusy(`m:${m.handle}`);
    try {
      await api('/members', { method: 'POST', body: JSON.stringify({ action: 'delete', handle: m.handle }) });
      toast.success(`@${m.handle} eliminado`);
      setToDelete(null);
      await Promise.all([loadMembers(), loadHeader()]);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  /* ── Import / export ── */

  async function previewImport(text: string) {
    setBusy('import');
    try {
      const d = await api('/import', { method: 'POST', body: JSON.stringify({ text, dryRun: true }) });
      setImportText(text); setPreview(d);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  async function confirmImport() {
    if (importText == null) return;
    setBusy('import');
    try {
      const d = await api('/import', { method: 'POST', body: JSON.stringify({ text: importText }) });
      toast.success(`${d.added} nuevos · ${d.alreadyExisted} ya estaban · total ${d.total}`);
      setPreview(null); setImportText(null);
      await Promise.all([loadMembers(1, ''), loadHeader()]);
      setSearch(''); setPage(1);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  async function importFromCloseFriends() {
    setBusy('cf');
    try {
      const d = await api('/import', { method: 'POST', body: JSON.stringify({ fromCloseFriends: true }) });
      toast.success(`Close Friends: ${d.added} nuevos · ${d.alreadyExisted} ya estaban`);
      await Promise.all([loadMembers(1, ''), loadHeader()]);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  async function exportCsv() {
    setBusy('export');
    try {
      const res = await fetch('/api/admin/private-access/export', { headers: headers() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `mejores-amigos-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  /* ── Apertura ── */

  async function previewOpen() {
    setBusy('open');
    try { setOpenPreview(await api('/open', { method: 'POST', body: JSON.stringify({ dryRun: true }) })); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }
  async function confirmOpen() {
    setBusy('open');
    try {
      const d = await api('/open', { method: 'POST', body: JSON.stringify({}) });
      toast.success(`Colección abierta: ${d.published.length} productos publicados`);
      setOpenPreview(null);
      await loadHeader();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  /* ── Gate ── */

  if (autorizado === false) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="bg-card rounded-lg border border-border p-8 w-full max-w-sm text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto mx-auto mb-6 dark:invert" />
          <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="Clave admin" onKeyDown={(e) => { if (e.key === 'Enter') ingresarConClave(keyInput); }} className="w-full border border-border-mid bg-card text-foreground rounded-md px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-ring" />
          <button onClick={() => ingresarConClave(keyInput)} className="w-full bg-primary text-primary-foreground rounded-md py-2 text-[13px] font-semibold">Entrar</button>
        </div>
      </div>
    );
  }
  if (autorizado && !puede('creadores')) {
    return <div className="max-w-[1360px] mx-auto px-6 py-10 text-[13px] text-muted-foreground">Sin acceso a Contenido.</div>;
  }

  const statusTone = !config ? 'neutral' : active ? 'success' : config.override === 'force_off' ? 'critical' : 'neutral';
  const statusLabel = !config ? '—'
    : config.override === 'force_on' ? 'Activa (forzada)'
    : config.override === 'force_off' ? 'Pausada'
    : active ? 'Activa'
    : config.openedAt ? 'Abierta al público'
    : !config.enabled ? 'Deshabilitada' : 'Fuera de fecha';
  const input = 'h-9 border border-border bg-card text-foreground rounded-lg px-2.5 text-[13px] focus:outline-none focus:border-border-mid';
  const btn = 'h-9 px-3.5 rounded-lg border border-border bg-card text-[13px] font-medium text-foreground hover:border-border-mid flex items-center gap-1.5 disabled:opacity-50';
  const btnPrimary = 'h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold flex items-center gap-1.5 disabled:opacity-60';
  const pages = Math.max(1, Math.ceil(total / PER));

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-foreground flex items-center gap-2">
            <Lock size={21} /> Private Access
            <StatusBadge tone={statusTone as any}>{statusLabel}</StatusBadge>
            {mock && <StatusBadge tone="warning">Modo mock</StatusBadge>}
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Preventa para Mejores Amigos · {config?.collectionName} {config?.collectionSubtitle} · tag <code className="text-[12px]">{config?.collectionTag}</code>
          </p>
        </div>
        <button onClick={load} title="Actualizar" className="h-9 w-9 grid place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-border-mid">
          <RefreshCw size={14} className={state === 'loading' ? 'animate-spin' : ''} />
        </button>
      </div>

      {state === 'notdeployed' && (
        <div className="mb-5 rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-[13px] text-foreground">
          El plugin <code>hypestyle-private-access.php</code> no está subido a WordPress. Hasta subirlo no se puede guardar config ni importar miembros.
        </div>
      )}
      {state === 'error' && (
        <div className="mb-5 rounded-lg border border-destructive/40 px-4 py-3 text-[13px] text-destructive">No se pudo leer el estado desde WordPress.</div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <MetricCard label="Miembros" value={stats?.members ?? '—'} hint="activos en la lista" />
        <MetricCard label="Entraron" value={stats?.membersEntered ?? '—'} hint={`${stats?.granted ?? 0} accesos`} />
        <MetricCard label="Denegados" value={stats?.denied ?? '—'} tone={stats && stats.denied > 0 ? 'warning' : 'default'} hint={stats ? `${stats.rateLimited} por rate limit · ${stats.deviceLimited} por tope` : undefined} />
        <MetricCard label="Pedidos pagos" value={stats?.paidOrders ?? '—'} tone="success" />
        <MetricCard label="Revenue" value={stats ? ars(stats.revenue) : '—'} tone="success" />
        <MetricCard label="Productos" value={stats?.collectionProducts ?? '—'} hint={`con el tag ${config?.collectionTag ?? ''}`} tone={stats && stats.collectionProducts === 0 ? 'critical' : 'default'} />
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-5 mb-6">
        {/* Config */}
        <section className="bg-card border border-border rounded-lg p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-bold text-foreground">Configuración</h2>
            <div className="flex items-center gap-2">
              {dirty && <button onClick={() => setDraft(config)} className="text-[12px] text-muted-foreground hover:text-foreground">Descartar</button>}
              <button onClick={() => saveConfig()} disabled={!dirty || busy === 'config' || state === 'notdeployed'} className={btnPrimary}>{busy === 'config' ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </div>
          {draft && (
            <div className="grid sm:grid-cols-2 gap-x-5 gap-y-4 text-[13px]">
              <label className="flex items-center gap-2.5 sm:col-span-2">
                <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} className="h-4 w-4" />
                <span className="font-medium text-foreground">Preventa habilitada</span>
                <span className="text-muted-foreground">(con esto apagado no se muestra nada, aunque esté en fecha)</span>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Inicio</span>
                <input type="datetime-local" value={toLocalInput(draft.startAt)} onChange={(e) => setDraft({ ...draft, startAt: fromLocalInput(e.target.value) })} className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Apertura pública</span>
                <input type="datetime-local" value={toLocalInput(draft.publicOpenAt)} onChange={(e) => setDraft({ ...draft, publicOpenAt: fromLocalInput(e.target.value) })} className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Fin del descuento (copy)</span>
                <input type="datetime-local" value={toLocalInput(draft.saleEndsAt)} onChange={(e) => setDraft({ ...draft, saleEndsAt: fromLocalInput(e.target.value) })} className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Descuento que se anuncia (%)</span>
                <input type="number" min={0} max={90} value={draft.discountPct} onChange={(e) => setDraft({ ...draft, discountPct: Number(e.target.value) })} className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Tag de la colección en Woo</span>
                <input value={draft.collectionTag} onChange={(e) => setDraft({ ...draft, collectionTag: e.target.value.trim().toLowerCase() })} className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Dispositivos por usuario (7 días)</span>
                <input type="number" min={1} max={50} value={draft.maxDevices ?? 6} onChange={(e) => setDraft({ ...draft, maxDevices: Number(e.target.value) })} className={input} />
              </label>
              <label className="flex items-center gap-2.5 sm:col-span-2">
                <input type="checkbox" checked={!!draft.clearSaleOnOpen} onChange={(e) => setDraft({ ...draft, clearSaleOnOpen: e.target.checked })} className="h-4 w-4" />
                <span className="text-foreground">Al abrir al público, sacar el precio de oferta</span>
              </label>
            </div>
          )}
          <p className="text-[11.5px] text-muted-foreground mt-4 leading-relaxed">
            El precio con descuento sale de Woo: cargá el precio de oferta programado en cada producto. Este % es solo el texto que se muestra.
          </p>
        </section>

        {/* Override + apertura */}
        <section className="bg-card border border-border rounded-lg p-4 sm:p-5 flex flex-col gap-4">
          <div>
            <h2 className="text-[14px] font-bold text-foreground mb-1">Control manual</h2>
            <p className="text-[12px] text-muted-foreground mb-3">Pisa las fechas al instante.</p>
            <div className="grid grid-cols-3 gap-1 bg-muted rounded-lg p-0.5">
              {([['auto', 'Por fecha'], ['force_on', 'Forzar ON'], ['force_off', 'Pausar']] as const).map(([v, l]) => (
                <button key={v} onClick={() => saveConfig({ override: v })} disabled={busy === 'config' || state === 'notdeployed'}
                  className={`h-8 rounded-md text-[12px] font-medium ${config?.override === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-border pt-4">
            <h2 className="text-[14px] font-bold text-foreground mb-1">Apertura pública</h2>
            {config?.openedAt ? (
              <p className="text-[12.5px] text-success">Abierta el {fmtWhen(config.openedAt)}.</p>
            ) : (
              <>
                <p className="text-[12px] text-muted-foreground mb-3 leading-relaxed">
                  Automática el {config ? fmtWhen(config.publicOpenAt) : '—'} (el cron corre cada 10 min). Publica los productos del tag y saca la oferta si está marcado.
                </p>
                <button onClick={previewOpen} disabled={busy === 'open' || state !== 'ok'} className={btn}><Rocket size={14} /> Abrir al público ahora…</button>
              </>
            )}
          </div>
        </section>
      </div>

      {/* Miembros */}
      <section className="bg-card border border-border rounded-lg">
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-border">
          <h2 className="text-[14px] font-bold text-foreground mr-2">Mejores Amigos <span className="text-muted-foreground font-normal tabular-nums">· {total}</span></h2>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar @usuario o nombre…" className={`${input} w-[220px]`} />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept=".csv,.txt,.json,text/csv,application/json" className="hidden"
              onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) previewImport(await f.text()); }} />
            <button onClick={() => fileRef.current?.click()} disabled={busy === 'import' || state !== 'ok'} className={btn} title="CSV username,name o close_friends.json del export de Instagram">
              <Upload size={14} /> Importar CSV / JSON
            </button>
            <button onClick={importFromCloseFriends} disabled={busy === 'cf' || state !== 'ok'} className={btn} title="Suma los tildados del panel Close Friends">
              <Instagram size={14} /> {busy === 'cf' ? 'Importando…' : 'Traer de Close Friends'}
            </button>
            <button onClick={exportCsv} disabled={busy === 'export' || state !== 'ok'} className={btn}><Download size={14} /> Descargar</button>
          </div>
        </div>

        {/* Alta manual */}
        <form onSubmit={(e) => { e.preventDefault(); addMember(); }} className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border bg-muted/40">
          <span className="text-[12px] text-muted-foreground">Agregar:</span>
          <input value={newHandle} onChange={(e) => setNewHandle(e.target.value)} placeholder="@usuario" autoCapitalize="none" autoCorrect="off" spellCheck={false} className={`${input} w-[180px]`} />
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre (opcional)" className={`${input} w-[180px]`} />
          <button type="submit" disabled={!newHandle.trim() || busy === 'add' || state !== 'ok'} className={btnPrimary}><Plus size={14} /> Agregar</button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-4 py-2.5 font-medium">Usuario</th>
                <th className="px-3 py-2.5 font-medium">Nombre</th>
                <th className="px-3 py-2.5 font-medium">Origen</th>
                <th className="px-3 py-2.5 font-medium">Estado</th>
                <th className="px-3 py-2.5 font-medium">Alta</th>
                <th className="px-3 py-2.5 font-medium">Último acceso</th>
                <th className="px-3 py-2.5 font-medium text-right">Accesos</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {members.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">{search ? 'Nadie coincide con la búsqueda.' : 'Todavía no hay miembros. Importá el CSV o traé los de Close Friends.'}</td></tr>
              )}
              {members.map((m) => (
                <tr key={m.handle} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    <a href={`https://instagram.com/${m.handle}`} target="_blank" rel="noreferrer" className="hover:underline">@{m.handle}</a>
                  </td>
                  <td className="px-3 py-2.5 text-foreground/80">{m.name || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2.5"><StatusBadge tone="neutral">{SOURCE_LABEL[m.source] ?? m.source}</StatusBadge></td>
                  <td className="px-3 py-2.5">{m.status === 'active' ? <StatusBadge tone="success">Activo</StatusBadge> : <StatusBadge tone="critical">Bloqueado</StatusBadge>}</td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{fmtWhen(m.createdAt)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{fmtWhen(m.lastAccessAt)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{m.accessCount}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      {m.status === 'active' ? (
                        <button onClick={() => setStatus(m, 'blocked')} disabled={busy === `m:${m.handle}`} title="Bloquear" className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:text-destructive hover:bg-muted"><Ban size={14} /></button>
                      ) : (
                        <button onClick={() => setStatus(m, 'active')} disabled={busy === `m:${m.handle}`} title="Reactivar" className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:text-success hover:bg-muted"><RotateCcw size={14} /></button>
                      )}
                      <button onClick={() => setToDelete(m)} title="Eliminar" className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:text-destructive hover:bg-muted"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border text-[12px] text-muted-foreground">
            <button disabled={page <= 1} onClick={() => { setPage(page - 1); loadMembers(page - 1, search); }} className="h-8 px-3 rounded-md border border-border disabled:opacity-40">Anterior</button>
            <span className="tabular-nums">{page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => { setPage(page + 1); loadMembers(page + 1, search); }} className="h-8 px-3 rounded-md border border-border disabled:opacity-40">Siguiente</button>
          </div>
        )}
      </section>

      {/* Preview del import */}
      <ConfirmDialog
        open={!!preview}
        title={`Importar ${preview?.valid ?? 0} usuarios`}
        confirmLabel="Importar"
        busy={busy === 'import'}
        onClose={() => { setPreview(null); setImportText(null); }}
        onConfirm={confirmImport}
        body={preview && (
          <div className="space-y-2">
            <p>Formato: {preview.format === 'instagram_json' ? 'export de Instagram' : 'CSV'}. Se suman solo los que no están; los existentes no se tocan.</p>
            <p className="text-foreground">{preview.sample.map(s => `@${s.handle}`).join(', ')}{preview.valid > preview.sample.length ? '…' : ''}</p>
            {preview.invalidCount > 0 && (
              <p className="text-warning">{preview.invalidCount} filas inválidas se ignoran: {preview.invalid.slice(0, 6).join(', ')}{preview.invalidCount > 6 ? '…' : ''}</p>
            )}
          </div>
        )}
      />

      <ConfirmDialog
        open={!!toDelete}
        title={`Eliminar a @${toDelete?.handle}`}
        body="Pierde el acceso a la preventa. Si querés frenarlo sin perder el historial, mejor bloquealo."
        confirmLabel="Eliminar"
        tone="critical"
        busy={!!toDelete && busy === `m:${toDelete.handle}`}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteMember(toDelete)}
      />

      <ConfirmDialog
        open={!!openPreview}
        title="Abrir la colección al público"
        confirmLabel={`Publicar ${openPreview?.published.length ?? 0} productos`}
        tone="critical"
        busy={busy === 'open'}
        onClose={() => setOpenPreview(null)}
        onConfirm={confirmOpen}
        body={openPreview && (
          <div className="space-y-2">
            <p>Pasan a publicados y aparecen en todo el sitio, Meta y Google. {config?.clearSaleOnOpen ? 'Se saca el precio de oferta.' : 'El precio de oferta queda como está.'}</p>
            <p className="text-foreground">{openPreview.published.length ? openPreview.published.join(', ') : 'No hay productos privados con el tag (ya están publicados o falta cargarlos).'}</p>
          </div>
        )}
      />
    </div>
  );
}
