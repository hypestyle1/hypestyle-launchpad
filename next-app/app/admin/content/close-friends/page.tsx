'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Instagram, Upload, Check, ExternalLink, Copy, Trash2, Pencil, Ban, RotateCcw } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { toast } from '@/components/ui/sonner';
import { StatusBadge, ConfirmDialog, type BadgeTone } from '@/components/admin/ui';
import {
  type CloseFriendEntry, type CloseFriendsStore, type CloseFriendStatus,
  SOURCE_LABEL, STATUS_LABEL, entryKey, summarize,
} from '@/lib/close-friends/types';

type Tab = 'pendientes' | 'agregados' | 'revisar' | 'todos';
const TABS: { id: Tab; label: string }[] = [
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'agregados', label: 'Agregados' },
  { id: 'revisar', label: 'Revisar' },
  { id: 'todos', label: 'Todos' },
];

const STATUS_TONE: Record<CloseFriendStatus, BadgeTone> = { listo: 'neutral', revisar: 'warning', descartado: 'neutral' };
const SOURCE_TONE: Record<CloseFriendEntry['source'], BadgeTone> = { woo: 'info', tiendanube: 'neutral', manual: 'neutral' };

const fmtDay = (iso?: string) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${Number(d)}/${Number(m)}/${y.slice(2)}` : iso;
};
const fmtWhen = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }) : 'nunca');

export default function CloseFriendsPage() {
  const { autorizado, headers, puede, ingresarConClave } = useAdminAuth();
  const [keyInput, setKeyInput] = useState('');
  const [store, setStore] = useState<CloseFriendsStore | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error' | 'notdeployed'>('loading');
  const [tab, setTab] = useState<Tab>('pendientes');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null); // key de la fila en vuelo, o 'sync' / 'import'
  const [editing, setEditing] = useState<{ key: string; handle: string } | null>(null);
  const [toDelete, setToDelete] = useState<CloseFriendEntry | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!puede('creadores')) return;
    setState('loading');
    try {
      const res = await fetch('/api/admin/close-friends', { headers: headers() });
      const d = await res.json();
      if (d.notDeployed) { setState('notdeployed'); setStore({ entries: [], lastSyncAt: null, updatedAt: null }); return; }
      if (!res.ok) throw new Error();
      setStore(d); setState('ok');
    } catch { setState('error'); }
  }, [headers, puede]);

  useEffect(() => { if (autorizado) load(); }, [autorizado, load]);

  const entries = store?.entries ?? [];
  const stats = useMemo(() => summarize(entries), [entries]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^@/, '');
    let list = entries.filter((e) => {
      if (tab === 'pendientes') return !e.added && e.status === 'listo';
      if (tab === 'agregados') return e.added;
      if (tab === 'revisar') return e.status === 'revisar' && !e.added;
      return true;
    });
    if (q) list = list.filter((e) => e.handle.includes(q) || e.name.toLowerCase().includes(q) || e.orderNumber.includes(q) || e.note.toLowerCase().includes(q));
    // Más nuevos arriba: la lista pendiente se trabaja desde el último pedido.
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.handle.localeCompare(b.handle));
  }, [entries, tab, search]);

  /* ── Acciones ── */

  async function patch(e: CloseFriendEntry, p: Partial<Pick<CloseFriendEntry, 'added' | 'status' | 'handle' | 'note'>>, undoable = false) {
    const key = entryKey(e);
    setBusy(key);
    // Optimista sólo para el tilde (no cambia la clave de la fila): se ve al toque.
    const soloTilde = p.added !== undefined && Object.keys(p).length === 1;
    if (soloTilde) setStore((s) => s && { ...s, entries: s.entries.map((x) => (entryKey(x) === key ? { ...x, added: !!p.added, addedAt: p.added ? new Date().toISOString() : null } : x)) });
    try {
      const res = await fetch('/api/admin/close-friends/entry', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() }, body: JSON.stringify({ key, patch: p }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.conflict ? 'Ya existe otra entrada con ese usuario.' : d.error || 'No se pudo guardar'); await load(); return false; }
      setStore((s) => s && { ...s, entries: s.entries.map((x) => (entryKey(x) === key ? d.entry : x)) });
      if (undoable && p.added !== undefined) {
        toast.success(p.added ? `@${e.handle} agregado a Close Friends` : `@${e.handle} vuelve a pendientes`, {
          action: { label: 'Deshacer', onClick: () => patch({ ...e, ...p } as CloseFriendEntry, { added: !p.added }) },
        });
      }
      return true;
    } catch { toast.error('No se pudo guardar'); await load(); return false; }
    finally { setBusy(null); }
  }

  async function remove(e: CloseFriendEntry) {
    const key = entryKey(e);
    setBusy(key);
    try {
      const res = await fetch(`/api/admin/close-friends/entry?key=${encodeURIComponent(key)}`, { method: 'DELETE', headers: headers() });
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error || 'No se pudo borrar'); return; }
      setStore((s) => s && { ...s, entries: s.entries.filter((x) => entryKey(x) !== key) });
      toast.success(`@${e.handle} borrado`);
    } catch { toast.error('No se pudo borrar'); }
    finally { setBusy(null); setToDelete(null); }
  }

  async function sync() {
    setBusy('sync');
    try {
      const res = await fetch('/api/admin/close-friends/sync', { method: 'POST', headers: headers() });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error || 'No se pudo sincronizar'); return; }
      const n = d.added as number;
      toast.success(n === 0 ? 'No hay usuarios nuevos en Woo.' : `${n} usuario${n === 1 ? '' : 's'} nuevo${n === 1 ? '' : 's'} desde Woo`, {
        description: `${d.orders} pedidos revisados${d.truncated ? ' · ATENCIÓN: alguna página de Woo falló, volvé a sincronizar' : ''}`,
      });
      await load();
      if (n > 0) setTab('pendientes');
    } catch { toast.error('No se pudo sincronizar'); }
    finally { setBusy(null); }
  }

  async function importCsv(file: File) {
    setBusy('import');
    try {
      const csv = await file.text();
      const res = await fetch('/api/admin/close-friends/import', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() }, body: JSON.stringify({ csv }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error || 'No se pudo importar'); return; }
      toast.success(`Importados: ${d.added} nuevos · ${d.updated} tildados · ${d.parsed} filas leídas`);
      await load();
    } catch { toast.error('No se pudo leer el archivo'); }
    finally { setBusy(null); if (fileRef.current) fileRef.current.value = ''; }
  }

  function copy(handle: string) {
    navigator.clipboard?.writeText(handle).then(() => toast.success(`@${handle} copiado`)).catch(() => {});
  }

  /* ── Gate ── */

  if (autorizado === false) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="bg-card rounded-lg border border-border p-8 w-full max-w-sm text-center">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto mx-auto mb-6 dark:invert" />
          <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="Clave admin" onKeyDown={(e) => { if (e.key === 'Enter') ingresarConClave(keyInput); }} className="w-full border border-border-mid bg-card text-foreground rounded-md px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-ring" />
          <button onClick={() => ingresarConClave(keyInput)} className="w-full bg-primary text-primary-foreground rounded-md py-2 text-[13px] font-semibold">Entrar</button>
        </div>
      </div>
    );
  }

  const counts: Record<Tab, number> = {
    pendientes: stats.pendientes,
    agregados: stats.agregados,
    revisar: stats.revisar,
    todos: entries.length,
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-foreground flex items-center gap-2"><Instagram size={22} /> Close Friends</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Usuarios de Instagram que dejaron los clientes al comprar. Tildá cada uno cuando lo sumes a Mejores amigos.</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); }} />
          <button onClick={() => fileRef.current?.click()} disabled={busy === 'import' || state === 'notdeployed'} title="Importar el CSV del sheet maestro (Woo + Tienda Nube)" className="h-9 px-3.5 rounded-lg border border-border bg-card text-[13px] font-medium text-foreground hover:border-border-mid flex items-center gap-1.5 disabled:opacity-50">
            <Upload size={14} /> Importar CSV
          </button>
          <button onClick={sync} disabled={busy === 'sync' || state === 'notdeployed'} className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold flex items-center gap-1.5 disabled:opacity-60">
            <RefreshCw size={14} className={busy === 'sync' ? 'animate-spin' : ''} /> {busy === 'sync' ? 'Sincronizando…' : 'Sincronizar Woo'}
          </button>
          <button onClick={load} title="Actualizar" className="h-9 w-9 grid place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-border-mid"><RefreshCw size={14} className={state === 'loading' ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Kpi label="Pendientes" value={stats.pendientes} tone="text-destructive" onClick={() => setTab('pendientes')} active={tab === 'pendientes'} />
        <Kpi label="Agregados" value={stats.agregados} tone="text-success" onClick={() => setTab('agregados')} active={tab === 'agregados'} />
        <Kpi label="Revisar" value={stats.revisar} tone="text-warning" onClick={() => setTab('revisar')} active={tab === 'revisar'} />
        <Kpi label="Total" value={stats.total} tone="text-foreground" onClick={() => setTab('todos')} active={tab === 'todos'} hint={`${stats.pct}% agregados`} />
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-5">
        <div className="h-full bg-success rounded-full transition-all" style={{ width: `${stats.pct}%` }} />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-0.5">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`h-8 px-3 rounded-md text-[12.5px] font-medium flex items-center gap-1.5 ${tab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {t.label} <span className={`text-[11px] tabular-nums ${tab === t.id ? 'opacity-80' : 'opacity-60'}`}>{counts[t.id]}</span>
            </button>
          ))}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="@usuario, nombre o pedido…" className="h-8 border border-border bg-card text-foreground rounded-lg px-2.5 text-[12.5px] w-[220px] focus:outline-none focus:border-border-mid" />
        {search && <button onClick={() => setSearch('')} className="text-[12px] text-muted-foreground hover:text-foreground">Limpiar</button>}
        <span className="ml-auto text-[12px] text-muted-foreground">Último sync con Woo: {fmtWhen(store?.lastSyncAt)}</span>
      </div>

      {!puede('creadores') ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-[13px] text-muted-foreground">Sin acceso a Contenido.</div>
      ) : state === 'notdeployed' ? (
        <div className="bg-warning-soft text-warning rounded-lg p-4 text-[13px]">El backend de Close Friends (PHP 1.31.0) todavía no está desplegado. La UI está lista; al subir el mu-plugin, la lista y los tildes persisten server-side.</div>
      ) : state === 'error' ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-[13px] text-destructive">No se pudo cargar la lista. Reintentá.</div>
      ) : !store ? (
        <div className="h-[320px] bg-muted/40 rounded-lg animate-pulse" />
      ) : entries.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-lg p-14 text-center">
          <Instagram size={26} className="mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-[14px] font-semibold text-foreground">Todavía no hay usuarios cargados.</p>
          <p className="text-[12.5px] text-muted-foreground mt-1">Sincronizá con Woo para traer los pedidos pagados, o importá el CSV del sheet maestro para arrancar con el histórico de Tienda Nube.</p>
          <button onClick={sync} className="mt-4 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold">Sincronizar Woo</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-10 text-center text-[13px] text-muted-foreground">
          {tab === 'pendientes' && !search ? 'No hay usuarios pendientes. Todos los que compraron ya están en Close Friends.' : 'Nada por acá.'}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground/80">
                  <th className="px-3 py-2 text-left font-medium w-[44px]" title="Agregado a Close Friends">CF</th>
                  <th className="px-3 py-2 text-left font-medium">Usuario IG</th>
                  <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">Nombre</th>
                  <th className="px-3 py-2 text-left font-medium">Pedido</th>
                  <th className="px-3 py-2 text-left font-medium hidden md:table-cell">Fecha</th>
                  <th className="px-3 py-2 text-left font-medium hidden md:table-cell">Fuente</th>
                  <th className="px-3 py-2 text-left font-medium hidden lg:table-cell">Estado</th>
                  <th className="px-3 py-2 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const key = entryKey(e);
                  const isBusy = busy === key;
                  const isEditing = editing?.key === key;
                  return (
                    <tr key={key} className={`border-b border-border last:border-0 hover:bg-muted/30 ${e.added ? 'opacity-70' : ''} ${e.status === 'descartado' ? 'opacity-50' : ''}`}>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => patch(e, { added: !e.added }, true)}
                          disabled={isBusy || e.status === 'descartado'}
                          aria-label={e.added ? 'Sacar de agregados' : 'Marcar como agregado a Close Friends'}
                          className={`h-6 w-6 rounded-md border grid place-items-center transition-colors disabled:opacity-40 ${e.added ? 'bg-success border-success text-white' : 'border-border-mid bg-card hover:border-foreground'}`}
                        >
                          {e.added && <Check size={14} strokeWidth={3} />}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <form onSubmit={async (ev) => { ev.preventDefault(); const ok = await patch(e, { handle: editing.handle, status: 'listo' }); if (ok) setEditing(null); }} className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">@</span>
                            <input autoFocus value={editing.handle} onChange={(ev) => setEditing({ key, handle: ev.target.value })} onKeyDown={(ev) => { if (ev.key === 'Escape') setEditing(null); }} className="h-7 border border-border-mid bg-card text-foreground rounded-md px-2 text-[13px] w-[180px] focus:outline-none focus:border-ring" />
                            <button type="submit" className="h-7 px-2 rounded-md bg-primary text-primary-foreground text-[12px] font-semibold">OK</button>
                            <button type="button" onClick={() => setEditing(null)} className="h-7 px-2 rounded-md text-[12px] text-muted-foreground hover:text-foreground">Cancelar</button>
                          </form>
                        ) : e.status === 'revisar' ? (
                          <div className="min-w-0">
                            <p className="text-[12.5px] text-foreground whitespace-pre-wrap break-words max-w-[420px]">{e.note || e.handle}</p>
                            <p className="text-[11px] text-warning mt-0.5">Dejó un mail o un mensaje: buscá el usuario y corregilo con el lápiz.</p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <a href={`https://instagram.com/${e.handle}`} target="_blank" rel="noreferrer" className="font-semibold text-foreground hover:underline truncate" title="Abrir perfil">@{e.handle}</a>
                            <a href={`https://instagram.com/${e.handle}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" title="Abrir perfil"><ExternalLink size={12} /></a>
                            <button onClick={() => copy(e.handle)} className="text-muted-foreground hover:text-foreground" title="Copiar usuario"><Copy size={12} /></button>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 hidden sm:table-cell text-foreground">{e.name || '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground tabular-nums">{e.orderNumber ? `#${e.orderNumber}` : '—'}</td>
                      <td className="px-3 py-2 hidden md:table-cell text-muted-foreground tabular-nums">{fmtDay(e.date)}</td>
                      <td className="px-3 py-2 hidden md:table-cell"><StatusBadge tone={SOURCE_TONE[e.source]}>{SOURCE_LABEL[e.source]}</StatusBadge></td>
                      <td className="px-3 py-2 hidden lg:table-cell">
                        {e.added ? <StatusBadge tone="success">Agregado</StatusBadge> : <StatusBadge tone={STATUS_TONE[e.status]}>{STATUS_LABEL[e.status]}</StatusBadge>}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1 text-muted-foreground">
                          {!isEditing && <button onClick={() => setEditing({ key, handle: e.status === 'revisar' ? '' : e.handle })} disabled={isBusy} title="Corregir usuario" className="h-7 w-7 grid place-items-center rounded-md hover:bg-muted hover:text-foreground"><Pencil size={13} /></button>}
                          {e.status === 'descartado' ? (
                            <button onClick={() => patch(e, { status: 'listo' })} disabled={isBusy} title="Recuperar" className="h-7 w-7 grid place-items-center rounded-md hover:bg-muted hover:text-foreground"><RotateCcw size={13} /></button>
                          ) : (
                            <button onClick={() => patch(e, { status: 'descartado', added: false })} disabled={isBusy} title="Descartar (no es un usuario real)" className="h-7 w-7 grid place-items-center rounded-md hover:bg-muted hover:text-foreground"><Ban size={13} /></button>
                          )}
                          <button onClick={() => setToDelete(e)} disabled={isBusy} title="Borrar" className="h-7 w-7 grid place-items-center rounded-md hover:bg-muted hover:text-destructive"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 border-t border-border text-[11.5px] text-muted-foreground">{rows.length} de {entries.length} · Woo se sincroniza con los pedidos pagados; los que no pagaron entran solos cuando se acredita el pago.</div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title={toDelete ? `¿Borrar @${toDelete.handle}?` : ''}
        body="Se saca de la lista. Si vuelve a comprar con el mismo usuario, el sync lo trae de nuevo. Para basura tipo “hola” u “ok” es mejor Descartar."
        confirmLabel="Borrar"
        tone="critical"
        busy={!!toDelete && busy === entryKey(toDelete)}
        onConfirm={() => toDelete && remove(toDelete)}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}

function Kpi({ label, value, tone, hint, onClick, active }: { label: string; value: number; tone: string; hint?: string; onClick: () => void; active: boolean }) {
  return (
    <button onClick={onClick} className={`bg-card border rounded-lg p-4 text-left w-full transition-colors hover:border-border-mid ${active ? 'border-foreground' : 'border-border'}`}>
      <p className={`text-[26px] font-bold leading-none tabular-nums ${tone}`}>{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground/80 mt-1.5">{label}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </button>
  );
}
