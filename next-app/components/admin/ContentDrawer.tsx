'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Trash2, Check, Plus, MessageSquare, ClipboardList, FileText, ShieldCheck, Layers, Activity, Link2, AlertTriangle } from 'lucide-react';
import {
  type ContentItem, type ContentChannel, type ContentFormat, type ContentPriority, type ContentStatus,
  type ContentReference, type ChecklistItem, type AssetRevision, type ContentPillar, type ContentObjective, type ApprovalState,
  STATUS_LABEL, PRIORITY_LABEL, CHANNEL_LABEL, FORMAT_LABEL, PRODUCTION_STATUSES, CHANNELS, FORMATS, PRIORITIES, CHANNEL_FORMATS,
  APPROVAL_LABEL, APPROVAL_TONE, PILLAR_LABEL, OBJECTIVE_LABEL, PILLARS, OBJECTIVES,
} from '@/lib/content/types';
import { type ContentEvent, type ApprovalAction, APPROVAL_ACTION_LABEL } from '@/lib/workflow/types';
import { ProductMultiSelect } from '@/components/admin/ProductSearch';

export interface ContentRefs { responsibles: { id: string; name: string }[]; creators: { id: string; name: string }[]; campaigns: { id: string; name: string }[] }
export type SaveResult = { ok: boolean; conflict?: boolean; item?: ContentItem };

const inputCls = 'w-full border border-border bg-card text-foreground rounded-lg px-2.5 py-1.5 text-[13px] focus:outline-none focus:border-border-mid';
const localDT = (iso?: string | null) => { if (!iso) return ''; const d = new Date(iso); const off = d.getTimezoneOffset() * 60000; return new Date(d.getTime() - off).toISOString().slice(0, 16); };
const fmtDT = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }) : '—');

type Tab = 'general' | 'brief' | 'approval' | 'checklist' | 'assets' | 'comments' | 'activity';
const TABS: { id: Tab; label: string; Icon: any; needsId?: boolean }[] = [
  { id: 'general', label: 'General', Icon: FileText },
  { id: 'brief', label: 'Brief', Icon: ClipboardList },
  { id: 'approval', label: 'Aprobación', Icon: ShieldCheck, needsId: true },
  { id: 'checklist', label: 'Checklist', Icon: Check },
  { id: 'assets', label: 'Assets', Icon: Layers },
  { id: 'comments', label: 'Comentarios', Icon: MessageSquare, needsId: true },
  { id: 'activity', label: 'Actividad', Icon: Activity, needsId: true },
];

export function ContentDrawer({ initial, refs, headers, onClose, onSave, onArchive }: {
  initial: Partial<ContentItem>;
  refs: ContentRefs;
  headers: () => Record<string, string>;
  onClose: () => void;
  onSave: (patch: Partial<ContentItem>, id?: string) => Promise<SaveResult>;
  onArchive: (id: string) => void;
}) {
  const [f, setF] = useState<Partial<ContentItem>>(initial);
  const [tab, setTab] = useState<Tab>('general');
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [me, setMe] = useState<string>('');
  const set = (patch: Partial<ContentItem>) => setF((p) => ({ ...p, ...patch }));
  const isEdit = !!f.id;

  useEffect(() => { fetch('/api/admin/auth/me', { headers: headers() }).then((r) => r.ok ? r.json() : null).then((d) => { if (d?.id) setMe(String(d.id)); }).catch(() => {}); }, [headers]);

  const name = (list: { id: string; name: string }[], id?: string | null) => list.find((x) => x.id === id)?.name || (id || '—');

  async function submit() {
    if (!f.title?.trim()) { alert('El título es obligatorio.'); return; }
    setSaving(true);
    const patch: Partial<ContentItem> = { ...f };
    if (isEdit) (patch as any).expectedUpdatedAt = f.updatedAt;
    const r = await onSave(patch, f.id);
    setSaving(false);
    if (r.conflict) { setConflict(true); return; }
    if (r.ok) { if (!isEdit && r.item) { setF(r.item); } else onClose(); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-2xl bg-background h-full overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold text-foreground truncate">{isEdit ? (f.title || 'Contenido') : 'Nuevo contenido'}</h3>
            {isEdit && <ApprovalBadge state={f.approvalState} />}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 px-3 border-b border-border overflow-x-auto shrink-0">
          {TABS.map((t) => {
            const disabled = t.needsId && !isEdit;
            return (
              <button key={t.id} disabled={disabled} onClick={() => setTab(t.id)}
                className={`px-2.5 py-2 text-[12.5px] font-medium border-b-2 -mb-px whitespace-nowrap flex items-center gap-1.5 ${tab === t.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
                <t.Icon size={13} /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'general' && <GeneralTab f={f} set={set} refs={refs} headers={headers} name={name} />}
          {tab === 'brief' && <BriefTab f={f} set={set} />}
          {tab === 'approval' && isEdit && <ApprovalTab f={f} refs={refs} headers={headers} me={me} onChanged={(item) => setF(item)} />}
          {tab === 'checklist' && <ChecklistTab f={f} set={set} me={me} />}
          {tab === 'assets' && <AssetsTab f={f} set={set} me={me} />}
          {tab === 'comments' && isEdit && <CommentsTab entityId={f.id!} refs={refs} headers={headers} me={me} />}
          {tab === 'activity' && isEdit && <ActivityTab entityId={f.id!} refs={refs} headers={headers} />}
        </div>

        {/* Footer: guardar (aplica a General/Brief/Checklist/Assets; approval/comments guardan solos) */}
        <div className="flex items-center gap-2 px-5 py-3 border-t border-border shrink-0">
          <button onClick={submit} disabled={saving || !f.title?.trim()} className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-[13px] font-semibold disabled:opacity-50">{saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear'}</button>
          {isEdit && <button onClick={() => onArchive(f.id!)} className="ml-auto text-[12px] text-muted-foreground hover:text-destructive flex items-center gap-1"><Trash2 size={13} /> Archivar</button>}
        </div>
      </div>

      {conflict && <ConflictModal onReload={() => { setConflict(false); onClose(); }} onClose={() => setConflict(false)} />}
    </div>
  );
}

function ApprovalBadge({ state }: { state?: ApprovalState }) {
  const s = state || 'not_requested';
  return <span className={`inline-block text-[9.5px] rounded-full px-1.5 py-0.5 mt-1 ${APPROVAL_TONE[s]}`}>{APPROVAL_LABEL[s]}</span>;
}

// 409 UX — reemplaza el alert. Sin "sobrescribir igual".
function ConflictModal({ onReload, onClose }: { onReload: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 grid place-items-center px-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 text-warning mb-2"><AlertTriangle size={18} /><h4 className="text-[14px] font-bold text-foreground">Cambió mientras editabas</h4></div>
        <p className="text-[13px] text-muted-foreground mb-4">Otra persona guardó este contenido mientras lo tenías abierto. Para no pisar sus cambios, recargá y volvé a aplicar los tuyos.</p>
        <div className="flex gap-2">
          <button onClick={onReload} className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-[13px] font-semibold">Recargar</button>
          <button onClick={onClose} className="px-4 rounded-lg border border-border text-[13px] text-foreground">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

/* ── General ── */
function GeneralTab({ f, set, refs, headers, name }: any) {
  const [newRef, setNewRef] = useState('');
  const formats = CHANNEL_FORMATS[f.channel as ContentChannel] || FORMATS;
  function addRef() {
    const url = newRef.trim(); if (!url) return;
    try { new URL(url); } catch { alert('URL inválida.'); return; }
    set({ references: [...(f.references || []), { id: 'r_' + Date.now().toString(36), url } as ContentReference] }); setNewRef('');
  }
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <label className="block text-[11px] text-muted-foreground">Título *<input className={inputCls} value={f.title || ''} onChange={(e) => set({ title: e.target.value })} autoFocus /></label>
        <label className="block text-[11px] text-muted-foreground">Descripción<textarea className={`${inputCls} resize-y`} rows={2} value={f.description || ''} onChange={(e) => set({ description: e.target.value })} /></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] text-muted-foreground">Canal *<select className={inputCls} value={f.channel} onChange={(e) => { const ch = e.target.value as ContentChannel; set({ channel: ch, format: (CHANNEL_FORMATS[ch] || [])[0] || 'other' }); }}>{CHANNELS.map((c) => <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>)}</select></label>
          <label className="text-[11px] text-muted-foreground">Formato *<select className={inputCls} value={f.format} onChange={(e) => set({ format: e.target.value as ContentFormat })}>{formats.map((c: ContentFormat) => <option key={c} value={c}>{FORMAT_LABEL[c]}</option>)}</select></label>
          <label className="text-[11px] text-muted-foreground">Estado de producción<select className={inputCls} value={PRODUCTION_STATUSES.includes(f.status) ? f.status : 'in_production'} onChange={(e) => set({ status: e.target.value as ContentStatus })}>{PRODUCTION_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></label>
          <label className="text-[11px] text-muted-foreground">Prioridad<select className={inputCls} value={f.priority} onChange={(e) => set({ priority: e.target.value as ContentPriority })}>{PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select></label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] text-muted-foreground">Fecha/hora programada<input type="datetime-local" className={inputCls} value={localDT(f.scheduledAt)} onChange={(e) => set({ scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label>
          <label className="text-[11px] text-muted-foreground">Responsable<select className={inputCls} value={f.responsibleId || ''} onChange={(e) => set({ responsibleId: e.target.value || null })}><option value="">Sin responsable</option>{refs.responsibles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        </div>
      </div>

      {/* Bloqueo */}
      {f.status === 'blocked' && (
        <div className="space-y-2 bg-destructive/5 border border-destructive/20 rounded-lg p-3">
          <p className="text-[11px] uppercase tracking-wider text-destructive font-semibold flex items-center gap-1.5"><AlertTriangle size={12} /> Bloqueado</p>
          <label className="block text-[11px] text-muted-foreground">Motivo<input className={inputCls} value={f.blockedReason || ''} onChange={(e) => set({ blockedReason: e.target.value })} placeholder="Faltan fotos finales…" /></label>
          <label className="block text-[11px] text-muted-foreground">Depende de (IDs de contenido)<input className={inputCls} value={(f.blockedByContentIds || []).join(', ')} onChange={(e) => set({ blockedByContentIds: e.target.value.split(',').map((x: string) => parseInt(x.trim())).filter((n: number) => n > 0) })} placeholder="Ej: 2902" /></label>
        </div>
      )}

      <div className="space-y-3">
        <label className="block text-[11px] text-muted-foreground">Copy / Caption<textarea className={`${inputCls} resize-y`} rows={3} value={f.copy || ''} onChange={(e) => set({ copy: e.target.value })} /></label>
        <label className="block text-[11px] text-muted-foreground">Notas internas<textarea className={`${inputCls} resize-y`} rows={2} value={f.notes || ''} onChange={(e) => set({ notes: e.target.value })} /></label>
      </div>

      <div className="space-y-3">
        <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5"><Link2 size={12} /> Relaciones</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] text-muted-foreground">Campaña<select className={inputCls} value={f.campaignId || ''} onChange={(e) => set({ campaignId: e.target.value || null })}><option value="">—</option>{refs.campaigns.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="text-[11px] text-muted-foreground">Creador<select className={inputCls} value={f.creatorId || ''} onChange={(e) => set({ creatorId: e.target.value || null })}><option value="">—</option>{refs.creators.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        </div>
        {f.collaborationId && <p className="text-[10.5px] text-muted-foreground">Entregable de la colaboración {f.collaborationId}.</p>}
        <div><p className="text-[11px] text-muted-foreground mb-1">Productos</p><ProductMultiSelect value={f.productIds || []} onChange={(ids) => set({ productIds: ids })} headers={headers} /></div>
        <div>
          <p className="text-[11px] text-muted-foreground mb-1">Referencias</p>
          <div className="space-y-1 mb-1.5">{(f.references || []).map((r: ContentReference) => (
            <div key={r.id} className="flex items-center gap-2 text-[12px]"><a href={r.url} target="_blank" rel="noreferrer" className="text-foreground hover:underline truncate flex-1">{r.label || r.url}</a><button onClick={() => set({ references: (f.references || []).filter((x: ContentReference) => x.id !== r.id) })} className="text-muted-foreground/50 hover:text-destructive"><X size={13} /></button></div>
          ))}</div>
          <div className="flex gap-2"><input className={inputCls} value={newRef} onChange={(e) => setNewRef(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addRef()} placeholder="https://…" /><button onClick={addRef} className="h-8 px-3 rounded-lg border border-border text-[12px] text-foreground hover:bg-muted shrink-0">Agregar</button></div>
        </div>
      </div>
    </div>
  );
}

/* ── Brief ── */
function BriefTab({ f, set }: any) {
  const listEditor = (key: 'briefDo' | 'briefDont', label: string) => {
    const items: string[] = f[key] || [];
    return (
      <div>
        <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
        <div className="space-y-1 mb-1.5">{items.map((it, i) => (
          <div key={i} className="flex items-center gap-2"><input className={inputCls} value={it} onChange={(e) => set({ [key]: items.map((x, idx) => idx === i ? e.target.value : x) })} /><button onClick={() => set({ [key]: items.filter((_, idx) => idx !== i) })} className="text-muted-foreground/50 hover:text-destructive"><X size={13} /></button></div>
        ))}</div>
        <button onClick={() => set({ [key]: [...items, ''] })} className="text-[12px] text-muted-foreground hover:text-foreground flex items-center gap-1"><Plus size={12} /> Agregar</button>
      </div>
    );
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-muted-foreground">Pilar de contenido<select className={inputCls} value={f.contentPillar || ''} onChange={(e) => set({ contentPillar: (e.target.value || null) as ContentPillar })}><option value="">—</option>{PILLARS.map((p) => <option key={p} value={p}>{PILLAR_LABEL[p]}</option>)}</select></label>
        <label className="text-[11px] text-muted-foreground">Objetivo<select className={inputCls} value={f.objective || ''} onChange={(e) => set({ objective: (e.target.value || null) as ContentObjective })}><option value="">—</option>{OBJECTIVES.map((o) => <option key={o} value={o}>{OBJECTIVE_LABEL[o]}</option>)}</select></label>
      </div>
      <label className="block text-[11px] text-muted-foreground">Hook<textarea className={`${inputCls} resize-y`} rows={2} value={f.hook || ''} onChange={(e) => set({ hook: e.target.value })} placeholder="Primeros 3 segundos…" /></label>
      <label className="block text-[11px] text-muted-foreground">Mensaje clave<textarea className={`${inputCls} resize-y`} rows={2} value={f.keyMessage || ''} onChange={(e) => set({ keyMessage: e.target.value })} /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-muted-foreground">CTA<input className={inputCls} value={f.cta || ''} onChange={(e) => set({ cta: e.target.value })} placeholder="Disponible en la web" /></label>
        <label className="text-[11px] text-muted-foreground">Audiencia<input className={inputCls} value={f.audience || ''} onChange={(e) => set({ audience: e.target.value })} /></label>
      </div>
      <div className="grid grid-cols-2 gap-3">{listEditor('briefDo', 'Do')}{listEditor('briefDont', "Don't")}</div>
      <label className="block text-[11px] text-muted-foreground">Requisitos adicionales<textarea className={`${inputCls} resize-y`} rows={2} value={f.additionalRequirements || ''} onChange={(e) => set({ additionalRequirements: e.target.value })} /></label>
    </div>
  );
}

/* ── Approval (guarda directo vía endpoint dedicado) ── */
function ApprovalTab({ f, refs, headers, me, onChanged }: any) {
  const [history, setHistory] = useState<ContentEvent[]>([]);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const state: ApprovalState = f.approvalState || 'not_requested';

  const load = useCallback(() => {
    fetch(`/api/admin/events?entityType=content&entityId=${f.id}&kind=approval`, { headers: headers() }).then((r) => r.json()).then((d) => setHistory(d.items || [])).catch(() => {});
  }, [f.id, headers]);
  useEffect(() => { load(); }, [load]);

  async function act(action: ApprovalAction) {
    if (action === 'changes_requested' && !comment.trim()) { alert('Pedir cambios requiere un comentario.'); return; }
    setBusy(true);
    const r = await fetch(`/api/admin/content/${f.id}/approval`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() }, body: JSON.stringify({ action, actorId: me, comment: comment.trim() || undefined, reviewerId: f.reviewerId || undefined, approverId: f.approverId || undefined }) });
    setBusy(false);
    if (r.ok) { const d = await r.json(); onChanged(d.item); setComment(''); load(); }
    else { const d = await r.json().catch(() => ({})); alert(d.error || 'No se pudo aplicar la acción.'); }
  }
  const name = (id?: string | null) => refs.responsibles.find((x: any) => x.id === id)?.name || (id || '—');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className={`text-[12px] rounded-full px-2.5 py-1 ${APPROVAL_TONE[state]}`}>{APPROVAL_LABEL[state]}</span>
        {f.approvedAt && state === 'approved' && <span className="text-[11px] text-muted-foreground">Aprobado {fmtDT(f.approvedAt)}</span>}
        {f.reviewRequestedAt && state === 'pending_review' && <span className="text-[11px] text-muted-foreground">Pedido {fmtDT(f.reviewRequestedAt)}</span>}
      </div>
      <p className="text-[10.5px] text-muted-foreground/70">Aprobar no publica ni programa: son procesos distintos.</p>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-muted-foreground">Reviewer<select className={inputCls} value={f.reviewerId || ''} onChange={(e) => onChanged({ ...f, reviewerId: e.target.value || null })}><option value="">—</option>{refs.responsibles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        <label className="text-[11px] text-muted-foreground">Approver<select className={inputCls} value={f.approverId || ''} onChange={(e) => onChanged({ ...f, approverId: e.target.value || null })}><option value="">—</option>{refs.responsibles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
      </div>

      <textarea className={`${inputCls} resize-y`} rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comentario (obligatorio al pedir cambios)…" />
      <div className="flex flex-wrap gap-2">
        {(state === 'not_requested' || state === 'changes_requested') && <button disabled={busy} onClick={() => act('review_requested')} className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold disabled:opacity-50">Solicitar revisión</button>}
        {state === 'pending_review' && <><button disabled={busy} onClick={() => act('approved')} className="h-8 px-3 rounded-lg bg-success text-white text-[12.5px] font-semibold disabled:opacity-50">Aprobar</button><button disabled={busy} onClick={() => act('changes_requested')} className="h-8 px-3 rounded-lg border border-destructive/40 text-destructive text-[12.5px] font-semibold disabled:opacity-50">Pedir cambios</button></>}
        {state === 'approved' && <button disabled={busy} onClick={() => act('reopened')} className="h-8 px-3 rounded-lg border border-border text-foreground text-[12.5px] font-medium disabled:opacity-50">Reabrir revisión</button>}
      </div>

      <div>
        <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground/70 mb-2">Historial</p>
        {history.length === 0 ? <p className="text-[12px] text-muted-foreground/60">Sin acciones todavía.</p>
          : <div className="space-y-1.5">{history.slice().reverse().map((e) => (
              <div key={e.id} className="text-[12px] flex items-start gap-2">
                <span className="text-muted-foreground/60 tabular-nums shrink-0 w-[92px]">{fmtDT(e.createdAt)}</span>
                <span className="text-foreground"><b>{name(e.actorId)}</b> {APPROVAL_ACTION_LABEL[e.action as ApprovalAction] || e.action}{e.body ? <span className="text-muted-foreground"> — “{e.body}”</span> : ''}</span>
              </div>
            ))}</div>}
      </div>
    </div>
  );
}

/* ── Checklist ── */
function ChecklistTab({ f, set, me }: any) {
  const items: ChecklistItem[] = f.checklist || [];
  const done = items.filter((i) => i.completed).length;
  const [label, setLabel] = useState('');
  const toggle = (id: string) => set({ checklist: items.map((i) => i.id === id ? { ...i, completed: !i.completed, completedAt: !i.completed ? new Date().toISOString() : null, completedBy: !i.completed ? me : null } : i) });
  const add = () => { if (!label.trim()) return; set({ checklist: [...items, { id: 'c_' + Date.now().toString(36), label: label.trim(), completed: false }] }); setLabel(''); };
  return (
    <div className="space-y-3">
      {items.length > 0 && <p className="text-[12px] text-muted-foreground tabular-nums">{done} / {items.length} completados</p>}
      <div className="space-y-1">{items.map((i) => (
        <div key={i.id} className="flex items-center gap-2 group">
          <button onClick={() => toggle(i.id)} className={`h-4 w-4 rounded border grid place-items-center shrink-0 ${i.completed ? 'bg-success border-success text-success-foreground' : 'border-border-mid'}`}>{i.completed && <Check size={11} />}</button>
          <span className={`text-[13px] flex-1 ${i.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{i.label}</span>
          <button onClick={() => set({ checklist: items.filter((x) => x.id !== i.id) })} className="text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100"><X size={13} /></button>
        </div>
      ))}</div>
      <div className="flex gap-2"><input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Nuevo ítem…" /><button onClick={add} className="h-8 px-3 rounded-lg border border-border text-[12px] text-foreground hover:bg-muted shrink-0">Agregar</button></div>
    </div>
  );
}

/* ── Assets / Revisions ── */
function AssetsTab({ f, set, me }: any) {
  const revs: AssetRevision[] = f.assetRevisions || [];
  const [url, setUrl] = useState('');
  const add = () => {
    const u = url.trim(); if (!u) return;
    try { new URL(u); } catch { alert('URL inválida.'); return; }
    const n = (revs.reduce((m, r) => Math.max(m, r.revisionNumber || 0), 0)) + 1;
    set({ assetRevisions: [...revs, { id: 'rev_' + Date.now().toString(36), revisionNumber: n, url: u, uploadedAt: new Date().toISOString(), uploadedBy: me, approved: false }] }); setUrl('');
  };
  const markApproved = (id: string) => set({ assetRevisions: revs.map((r) => ({ ...r, approved: r.id === id })), approvedRevision: id });
  const markFinal = (id: string) => set({ currentRevision: id });
  return (
    <div className="space-y-3">
      <p className="text-[10.5px] text-muted-foreground/70">Revisiones de assets por URL (Drive, WeTransfer…). Marcá la aprobada y la final para saber cuál usar.</p>
      <div className="space-y-1.5">{revs.map((r) => (
        <div key={r.id} className="flex items-center gap-2 bg-muted/40 rounded-lg px-2.5 py-1.5">
          <span className="text-[11px] font-semibold text-foreground tabular-nums shrink-0">V{r.revisionNumber}</span>
          <a href={r.url} target="_blank" rel="noreferrer" className="text-[12px] text-foreground hover:underline truncate flex-1">{r.url}</a>
          {f.approvedRevision === r.id && <span className="text-[9.5px] rounded-full px-1.5 py-0.5 bg-success-soft text-success shrink-0">Aprobada</span>}
          {f.currentRevision === r.id && <span className="text-[9.5px] rounded-full px-1.5 py-0.5 bg-secondary text-secondary-foreground shrink-0">Final</span>}
          <button onClick={() => markApproved(r.id)} title="Marcar aprobada" className="text-muted-foreground/60 hover:text-success shrink-0"><Check size={13} /></button>
          <button onClick={() => markFinal(r.id)} title="Marcar final" className="text-[10.5px] text-muted-foreground/60 hover:text-foreground shrink-0">Final</button>
          <button onClick={() => set({ assetRevisions: revs.filter((x) => x.id !== r.id) })} className="text-muted-foreground/40 hover:text-destructive shrink-0"><X size={13} /></button>
        </div>
      ))}</div>
      <div className="flex gap-2"><input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="https://drive.google.com/…" /><button onClick={add} className="h-8 px-3 rounded-lg border border-border text-[12px] text-foreground hover:bg-muted shrink-0">Subir V{(revs.reduce((m, r) => Math.max(m, r.revisionNumber || 0), 0)) + 1}</button></div>
    </div>
  );
}

/* ── Comments (append-only, resolvable) ── */
function CommentsTab({ entityId, refs, headers, me }: any) {
  const [items, setItems] = useState<ContentEvent[] | null>(null);
  const [body, setBody] = useState('');
  const load = useCallback(() => { fetch(`/api/admin/events?entityType=content&entityId=${entityId}&kind=comment`, { headers: headers() }).then((r) => r.json()).then((d) => setItems(d.items || [])).catch(() => setItems([])); }, [entityId, headers]);
  useEffect(() => { load(); }, [load]);
  const mentionIds = useMemo(() => refs.responsibles.concat(refs.creators), [refs]);
  const name = (id?: string | null) => mentionIds.find((x: any) => x.id === id)?.name || (id || '—');

  async function post() {
    if (!body.trim()) return;
    const mentions = mentionIds.filter((p: any) => new RegExp('@' + p.name.split(' ')[0], 'i').test(body)).map((p: any) => p.id);
    const r = await fetch('/api/admin/events', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() }, body: JSON.stringify({ entityType: 'content', entityId, kind: 'comment', actorId: me, body: body.trim(), mentions }) });
    if (r.ok) { setBody(''); load(); }
  }
  async function resolve(id: string, resolved: boolean) { await fetch(`/api/admin/events/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() }, body: JSON.stringify({ resolved, actorId: me }) }); load(); }
  async function del(id: string) { await fetch(`/api/admin/events/${id}`, { method: 'DELETE', headers: headers() }); load(); }

  return (
    <div className="space-y-3">
      {items === null ? <p className="text-[12px] text-muted-foreground/60">Cargando…</p>
        : items.length === 0 ? <p className="text-[12px] text-muted-foreground/60">Sin comentarios. Usá @ para mencionar.</p>
        : <div className="space-y-2">{items.map((c) => (
            <div key={c.id} className={`rounded-lg px-3 py-2 ${c.resolvedAt ? 'bg-muted/30 opacity-70' : 'bg-muted/50'}`}>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-0.5"><b className="text-foreground">{name(c.actorId)}</b><span className="tabular-nums">{fmtDT(c.createdAt)}</span>{c.resolvedAt && <span className="text-success">· resuelto</span>}</div>
              <p className="text-[13px] text-foreground whitespace-pre-wrap">{c.body}</p>
              <div className="flex items-center gap-3 mt-1">
                <button onClick={() => resolve(c.id, !c.resolvedAt)} className="text-[11px] text-muted-foreground hover:text-foreground">{c.resolvedAt ? 'Reabrir' : 'Resolver'}</button>
                <button onClick={() => del(c.id)} className="text-[11px] text-muted-foreground/60 hover:text-destructive">Borrar</button>
              </div>
            </div>
          ))}</div>}
      <div className="flex gap-2"><textarea className={`${inputCls} resize-y`} rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escribí un comentario… @nombre para mencionar" /><button onClick={post} disabled={!body.trim()} className="h-8 px-3 self-end rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold disabled:opacity-50 shrink-0">Enviar</button></div>
    </div>
  );
}

/* ── Activity (approval + comments + activity, cronológico) ── */
function ActivityTab({ entityId, refs, headers }: any) {
  const [items, setItems] = useState<ContentEvent[] | null>(null);
  useEffect(() => { fetch(`/api/admin/events?entityType=content&entityId=${entityId}`, { headers: headers() }).then((r) => r.json()).then((d) => setItems(d.items || [])).catch(() => setItems([])); }, [entityId, headers]);
  const all = refs.responsibles.concat(refs.creators);
  const name = (id?: string | null) => all.find((x: any) => x.id === id)?.name || (id || '—');
  const verb = (e: ContentEvent) => e.kind === 'approval' ? (APPROVAL_ACTION_LABEL[e.action as ApprovalAction] || e.action) : e.kind === 'comment' ? 'comentó' : (e.action || 'actualizó');
  return (
    <div className="space-y-2">
      {items === null ? <p className="text-[12px] text-muted-foreground/60">Cargando…</p>
        : items.length === 0 ? <p className="text-[12px] text-muted-foreground/60">Sin actividad registrada.</p>
        : items.slice().reverse().map((e) => (
          <div key={e.id} className="text-[12.5px] flex items-start gap-2">
            <span className="text-muted-foreground/60 tabular-nums shrink-0 w-[92px]">{fmtDT(e.createdAt)}</span>
            <span className="text-foreground"><b>{name(e.actorId)}</b> {verb(e)}{e.body ? <span className="text-muted-foreground"> — “{e.body.slice(0, 80)}”</span> : ''}</span>
          </div>
        ))}
    </div>
  );
}
