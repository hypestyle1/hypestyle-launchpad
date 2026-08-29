'use client';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { RefreshCw, Plus, X, ChevronLeft, ChevronRight, Trash2, Calendar as Cal, Columns3, List as ListIcon } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import {
  type ContentItem, type ContentStatus, type ContentChannel, type ContentFormat, type ContentPriority, type ContentReference,
  STATUS_LABEL, PRIORITY_LABEL, CHANNEL_LABEL, FORMAT_LABEL, STATUS_TONE, PRIORITY_TONE,
  KANBAN_STATUSES, ALL_STATUSES, CHANNELS, FORMATS, PRIORITIES, CHANNEL_FORMATS, blankContentItem,
} from '@/lib/content/types';
import { ContentDrawer } from '@/components/admin/ContentDrawer';

type View = 'calendar' | 'kanban' | 'list';
const VIEWS: { id: View; label: string; Icon: any }[] = [
  { id: 'calendar', label: 'Calendario', Icon: Cal }, { id: 'kanban', label: 'Kanban', Icon: Columns3 }, { id: 'list', label: 'Lista', Icon: ListIcon },
];
const dayOf = (iso?: string | null) => (iso ? iso.slice(0, 10) : null);
const fmtDay = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', timeZone: 'America/Argentina/Buenos_Aires' }) : '—');
const fmtDayTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }) : '—');

export default function ContentPage() {
  return <Suspense fallback={<div className="max-w-[1360px] mx-auto px-4 py-6"><div className="h-[320px] bg-muted/40 rounded-lg animate-pulse" /></div>}><ContentInner /></Suspense>;
}

function ContentInner() {
  const { autorizado, headers, puede, ingresarConClave } = useAdminAuth();
  const [keyInput, setKeyInput] = useState('');
  const router = useRouter();
  const sp = useSearchParams();
  const view = (sp.get('view') as View) || 'calendar';
  const setView = (v: View) => { const q = new URLSearchParams(sp.toString()); q.set('view', v); router.replace(`/admin/content?${q}`); };

  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error' | 'notdeployed'>('loading');
  const [refs, setRefs] = useState<{ responsibles: any[]; creators: any[]; campaigns: any[] }>({ responsibles: [], creators: [], campaigns: [] });
  const [edit, setEdit] = useState<Partial<ContentItem> | null>(null);
  const [filters, setFilters] = useState<{ status: string; channel: string; format: string; priority: string; search: string; campaignId: string; creatorId: string }>({ status: sp.get('status') || '', channel: '', format: '', priority: '', search: '', campaignId: sp.get('campaignId') || '', creatorId: sp.get('creatorId') || '' });

  const load = useCallback(async () => {
    if (!puede('creadores')) return;
    setState('loading');
    try {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(filters)) if (v) qs.set(k === 'search' ? 'search' : k === 'priority' ? 'priority' : k, v);
      const res = await fetch(`/api/admin/content?${qs}`, { headers: headers() });
      const d = await res.json();
      if (d.notDeployed) { setState('notdeployed'); setItems([]); return; }
      if (!res.ok) throw new Error();
      setItems(d.items || []);
      setState('ok');
    } catch { setState('error'); }
  }, [headers, puede, filters]);

  useEffect(() => { if (autorizado) load(); }, [autorizado, load]);
  useEffect(() => { if (autorizado) fetch('/api/admin/content/refs', { headers: headers() }).then((r) => r.ok ? r.json() : null).then((d) => d && setRefs(d)).catch(() => {}); }, [autorizado, headers]);

  const responsibleName = (id?: string | null) => refs.responsibles.find((r) => r.id === id)?.name || (id ? id : '—');
  const campaignName = (id?: string | null) => refs.campaigns.find((c) => c.id === id)?.name || null;

  async function saveItem(patch: Partial<ContentItem>, id?: string) {
    const url = id ? `/api/admin/content/${id}` : '/api/admin/content';
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() }, body: JSON.stringify(patch) });
    if (res.status === 501) { const d = await res.json(); alert(d.error); return false; }
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.conflict ? 'El contenido cambió en otra sesión. Recargá.' : (d.error || 'Error al guardar')); return false; }
    await load(); return true;
  }
  async function archiveItem(id: string) {
    if (!confirm('¿Archivar este contenido? Queda en la papelera, no se borra.')) return;
    await fetch(`/api/admin/content/${id}`, { method: 'DELETE', headers: headers() });
    setEdit(null); load();
  }
  // Cambio de status optimista (kanban/drawer) con rollback.
  async function changeStatus(item: ContentItem, status: ContentStatus) {
    if (item.status === status) return;
    const prev = items || [];
    setItems(prev.map((i) => (i.id === item.id ? { ...i, status } : i)));
    const res = await fetch(`/api/admin/content/${item.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() }, body: JSON.stringify({ status }) });
    if (!res.ok) { setItems(prev); alert('No se pudo actualizar el estado.'); }
    else load();
  }

  if (autorizado === false) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="bg-card rounded-lg border border-border p-8 w-full max-w-sm text-center">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto mx-auto mb-6 dark:invert" />
          <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="Clave admin"
            onKeyDown={(e) => { if (e.key === 'Enter') ingresarConClave(keyInput); }}
            className="w-full border border-border-mid bg-card text-foreground rounded-md px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-ring" />
          <button onClick={() => ingresarConClave(keyInput)} className="w-full bg-primary text-primary-foreground rounded-md py-2 text-[13px] font-semibold">Entrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-foreground">Contenido</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Planificá, producí y publicá todo el contenido de Hype.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEdit(blankContentItem())} className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold flex items-center gap-1.5"><Plus size={14} /> Nuevo contenido</button>
          <button onClick={load} title="Actualizar" className="h-9 w-9 grid place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-border-mid"><RefreshCw size={14} className={state === 'loading' ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      {/* View switcher + filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-0.5">
          {VIEWS.map((v) => (
            <button key={v.id} onClick={() => setView(v.id)} className={`h-8 px-3 rounded-md text-[12.5px] font-medium flex items-center gap-1.5 ${view === v.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}><v.Icon size={13} /> {v.label}</button>
          ))}
        </div>
        <input value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} placeholder="Buscar…" className="h-8 border border-border bg-card text-foreground rounded-lg px-2.5 text-[12.5px] w-[150px] focus:outline-none focus:border-border-mid" />
        {([['status', STATUS_LABEL, ALL_STATUSES], ['channel', CHANNEL_LABEL, CHANNELS], ['priority', PRIORITY_LABEL, PRIORITIES]] as const).map(([key, labels, opts]) => (
          <select key={key} value={(filters as any)[key]} onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))} className="h-8 border border-border bg-card text-foreground rounded-lg px-2 text-[12px] focus:outline-none focus:border-border-mid">
            <option value="">{key === 'status' ? 'Estado' : key === 'channel' ? 'Canal' : 'Prioridad'}</option>
            {(opts as string[]).map((o) => <option key={o} value={o}>{(labels as any)[o]}</option>)}
          </select>
        ))}
        {refs.campaigns.length > 0 && (
          <select value={filters.campaignId} onChange={(e) => setFilters((f) => ({ ...f, campaignId: e.target.value }))} className="h-8 border border-border bg-card text-foreground rounded-lg px-2 text-[12px] focus:outline-none focus:border-border-mid max-w-[150px]">
            <option value="">Campaña</option>
            {refs.campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        {refs.creators.length > 0 && (
          <select value={filters.creatorId} onChange={(e) => setFilters((f) => ({ ...f, creatorId: e.target.value }))} className="h-8 border border-border bg-card text-foreground rounded-lg px-2 text-[12px] focus:outline-none focus:border-border-mid max-w-[150px]">
            <option value="">Creador</option>
            {refs.creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        {(filters.status || filters.channel || filters.priority || filters.search || filters.campaignId || filters.creatorId) && <button onClick={() => setFilters({ status: '', channel: '', format: '', priority: '', search: '', campaignId: '', creatorId: '' })} className="text-[12px] text-muted-foreground hover:text-foreground">Limpiar</button>}
      </div>

      {!puede('creadores') ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-[13px] text-muted-foreground">Sin acceso a Contenido.</div>
      ) : state === 'notdeployed' ? (
        <div className="bg-warning-soft text-warning rounded-lg p-4 text-[13px]">El backend de Content OS (PHP 1.24.0) todavía no está desplegado. La UI está lista; al subir el mu-plugin, el contenido persiste server-side.</div>
      ) : state === 'error' ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-[13px] text-destructive">No se pudo cargar el contenido. Reintentá.</div>
      ) : !items ? (
        <div className="h-[320px] bg-muted/40 rounded-lg animate-pulse" />
      ) : items.length === 0 && !filters.search && !filters.status ? (
        <div className="bg-card border border-dashed border-border rounded-lg p-14 text-center">
          <p className="text-[14px] font-semibold text-foreground">Todavía no hay contenido planificado.</p>
          <p className="text-[12.5px] text-muted-foreground mt-1">Empezá por una idea: título, canal y formato.</p>
          <button onClick={() => setEdit(blankContentItem())} className="mt-4 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold">Crear primer contenido</button>
        </div>
      ) : view === 'calendar' ? (
        <CalendarView items={items} onOpen={setEdit} onNew={(d) => setEdit({ ...blankContentItem(), scheduledAt: d })} respName={responsibleName} campaignName={campaignName} />
      ) : view === 'kanban' ? (
        <KanbanView items={items} onOpen={setEdit} onNew={(s) => setEdit({ ...blankContentItem(), status: s })} onDrop={changeStatus} respName={responsibleName} campaignName={campaignName} />
      ) : (
        <ListView items={items} onOpen={setEdit} respName={responsibleName} campaignName={campaignName} />
      )}

      {edit && <ContentDrawer initial={edit} refs={refs} headers={headers} onClose={() => setEdit(null)} onSave={saveItem} onArchive={archiveItem} />}
    </div>
  );
}

// ── Card compacta (compartida por Calendar/Kanban) ──
function ItemCard({ item, onOpen, respName, campaignName, compact }: { item: ContentItem; onOpen: (i: ContentItem) => void; respName: (id?: string | null) => string; campaignName?: (id?: string | null) => string | null; compact?: boolean }) {
  const camp = campaignName?.(item.campaignId);
  return (
    <button onClick={() => onOpen(item)} className="w-full text-left bg-card border border-border rounded-lg px-2.5 py-2 hover:border-border-mid transition-colors">
      <p className="text-[12px] font-medium text-foreground truncate leading-tight">{item.title}</p>
      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
        <span className="text-[10px] text-muted-foreground">{CHANNEL_LABEL[item.channel]} · {FORMAT_LABEL[item.format]}</span>
        {!compact && <span className={`text-[9.5px] rounded-full px-1.5 py-0.5 ${STATUS_TONE[item.status]}`}>{STATUS_LABEL[item.status]}</span>}
      </div>
      {camp && <p className="text-[9.5px] text-muted-foreground/70 truncate mt-0.5">{camp}</p>}
      {(item.responsibleId || item.priority !== 'medium') && (
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-muted-foreground/70 truncate">{item.responsibleId ? respName(item.responsibleId) : ''}</span>
          {item.priority !== 'medium' && <span className={`text-[9.5px] ${PRIORITY_TONE[item.priority]}`}>{PRIORITY_LABEL[item.priority]}</span>}
        </div>
      )}
    </button>
  );
}

// ── Calendar (Month) + bandeja Sin fecha ──
function CalendarView({ items, onOpen, onNew, respName, campaignName }: { items: ContentItem[]; onOpen: (i: ContentItem) => void; onNew: (dateIso: string) => void; respName: (id?: string | null) => string; campaignName: (id?: string | null) => string | null }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const byDay = useMemo(() => { const m = new Map<string, ContentItem[]>(); for (const it of items) { const d = dayOf(it.scheduledAt); if (d) (m.get(d) || m.set(d, []).get(d))!.push(it); } return m; }, [items]);
  const unscheduled = items.filter((i) => !i.scheduledAt);

  const first = new Date(Date.UTC(cursor.y, cursor.m, 1));
  const startDow = (first.getUTCDay() + 6) % 7; // lunes=0
  const daysInMonth = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_240px]">
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <span className="text-[13px] font-semibold text-foreground capitalize">{monthLabel}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setCursor((c) => ({ y: c.m === 0 ? c.y - 1 : c.y, m: (c.m + 11) % 12 }))} className="h-7 w-7 grid place-items-center rounded-md hover:bg-muted text-muted-foreground"><ChevronLeft size={15} /></button>
            <button onClick={() => { const d = new Date(); setCursor({ y: d.getFullYear(), m: d.getMonth() }); }} className="h-7 px-2 rounded-md hover:bg-muted text-[12px] text-muted-foreground">Hoy</button>
            <button onClick={() => setCursor((c) => ({ y: c.m === 11 ? c.y + 1 : c.y, m: (c.m + 1) % 12 }))} className="h-7 w-7 grid place-items-center rounded-md hover:bg-muted text-muted-foreground"><ChevronRight size={15} /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 text-[10.5px] uppercase tracking-wide text-muted-foreground/70 border-b border-border">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => <div key={d} className="px-2 py-1.5 text-center">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => (
            <div key={i} className={`min-h-[92px] border-b border-r border-border p-1 ${day === todayStr ? 'bg-muted/40' : ''} ${!day ? 'bg-muted/20' : ''}`}>
              {day && (
                <>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] ${day === todayStr ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>{Number(day.slice(-2))}</span>
                    <button onClick={() => onNew(`${day}T12:00`)} className="opacity-0 hover:opacity-100 focus:opacity-100 text-muted-foreground/50 hover:text-foreground text-[13px] leading-none" title="Nuevo">+</button>
                  </div>
                  <div className="space-y-1 mt-1">
                    {(byDay.get(day) || []).slice(0, 3).map((it) => <ItemCard key={it.id} item={it} onOpen={onOpen} respName={respName} campaignName={campaignName} compact />)}
                    {(byDay.get(day) || []).length > 3 && <p className="text-[10px] text-muted-foreground/60 px-1">+{(byDay.get(day)!.length - 3)} más</p>}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Bandeja Sin fecha */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/80 mb-2">Sin fecha ({unscheduled.length})</p>
        <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
          {unscheduled.length === 0 ? <p className="text-[12px] text-muted-foreground/60">Todo tiene fecha.</p> : unscheduled.map((it) => <ItemCard key={it.id} item={it} onOpen={onOpen} respName={respName} campaignName={campaignName} />)}
        </div>
      </div>
    </div>
  );
}

// ── Kanban (columnas por status, drag & drop) ──
function KanbanView({ items, onOpen, onNew, onDrop, respName, campaignName }: { items: ContentItem[]; onOpen: (i: ContentItem) => void; onNew: (s: ContentStatus) => void; onDrop: (item: ContentItem, s: ContentStatus) => void; respName: (id?: string | null) => string; campaignName: (id?: string | null) => string | null }) {
  const [drag, setDrag] = useState<ContentItem | null>(null);
  const [over, setOver] = useState<ContentStatus | null>(null);
  const byStatus = (s: ContentStatus) => items.filter((i) => i.status === s);
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3 min-w-[900px]">
        {KANBAN_STATUSES.map((s) => (
          <div key={s} onDragOver={(e) => { e.preventDefault(); setOver(s); }} onDragLeave={() => setOver((o) => (o === s ? null : o))}
            onDrop={() => { if (drag) onDrop(drag, s); setDrag(null); setOver(null); }}
            className={`w-[210px] shrink-0 rounded-lg border ${over === s ? 'border-border-mid bg-muted/40' : 'border-border bg-muted/20'}`}>
            <div className="flex items-center justify-between px-2.5 py-2 border-b border-border">
              <span className="text-[11.5px] font-semibold text-foreground flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${STATUS_TONE[s].split(' ')[0]}`} />{STATUS_LABEL[s]}</span>
              <span className="text-[11px] text-muted-foreground tabular-nums">{byStatus(s).length}</span>
            </div>
            <div className="p-1.5 space-y-1.5 min-h-[80px]">
              {byStatus(s).map((it) => (
                <div key={it.id} draggable onDragStart={() => setDrag(it)} onDragEnd={() => { setDrag(null); setOver(null); }} className={drag?.id === it.id ? 'opacity-40' : ''}>
                  <ItemCard item={it} onOpen={onOpen} respName={respName} campaignName={campaignName} compact />
                </div>
              ))}
              <button onClick={() => onNew(s)} className="w-full text-[11.5px] text-muted-foreground/60 hover:text-foreground py-1">+ Agregar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── List (tabla densa) ──
function ListView({ items, onOpen, respName, campaignName }: { items: ContentItem[]; onOpen: (i: ContentItem) => void; respName: (id?: string | null) => string; campaignName: (id?: string | null) => string | null }) {
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 }>({ k: 'updatedAt', dir: -1 });
  const sorted = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => { const av = (a as any)[sort.k] ?? '', bv = (b as any)[sort.k] ?? ''; return (av < bv ? -1 : av > bv ? 1 : 0) * sort.dir; });
    return arr;
  }, [items, sort]);
  const th = (k: string, label: string, cls = '') => <th onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : 1 }))} className={`px-3 py-2 font-medium text-[11px] uppercase tracking-wide text-muted-foreground/80 cursor-pointer select-none hover:text-foreground ${cls}`}>{label}{sort.k === k ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}</th>;
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead><tr className="border-b border-border bg-muted/40">{th('title', 'Contenido')}{th('campaignId', 'Campaña', 'hidden lg:table-cell')}{th('channel', 'Canal', 'hidden md:table-cell')}{th('format', 'Formato', 'hidden xl:table-cell')}{th('status', 'Estado')}{th('responsibleId', 'Responsable', 'hidden md:table-cell')}{th('scheduledAt', 'Fecha', 'hidden sm:table-cell')}{th('priority', 'Prioridad', 'hidden xl:table-cell')}{th('updatedAt', 'Actualizado', 'hidden xl:table-cell')}</tr></thead>
          <tbody>
            {sorted.map((it) => (
              <tr key={it.id} onClick={() => onOpen(it)} className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer">
                <td className="px-3 py-2.5 text-foreground font-medium max-w-[280px] truncate">{it.title}</td>
                <td className="px-3 py-2.5 text-muted-foreground hidden lg:table-cell truncate max-w-[140px]">{campaignName(it.campaignId) || '—'}</td>
                <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell">{CHANNEL_LABEL[it.channel]}</td>
                <td className="px-3 py-2.5 text-muted-foreground hidden xl:table-cell">{FORMAT_LABEL[it.format]}</td>
                <td className="px-3 py-2.5"><span className={`text-[10px] rounded-full px-2 py-0.5 ${STATUS_TONE[it.status]}`}>{STATUS_LABEL[it.status]}</span></td>
                <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell truncate max-w-[140px]">{it.responsibleId ? respName(it.responsibleId) : '—'}</td>
                <td className="px-3 py-2.5 text-muted-foreground tabular-nums hidden sm:table-cell whitespace-nowrap">{fmtDayTime(it.scheduledAt)}</td>
                <td className={`px-3 py-2.5 hidden lg:table-cell ${PRIORITY_TONE[it.priority]}`}>{PRIORITY_LABEL[it.priority]}</td>
                <td className="px-3 py-2.5 text-muted-foreground/70 tabular-nums hidden xl:table-cell whitespace-nowrap">{fmtDay(it.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
