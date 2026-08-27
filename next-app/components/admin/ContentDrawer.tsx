'use client';

import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import {
  type ContentItem, type ContentChannel, type ContentFormat, type ContentPriority, type ContentStatus, type ContentReference,
  STATUS_LABEL, PRIORITY_LABEL, CHANNEL_LABEL, FORMAT_LABEL, ALL_STATUSES, CHANNELS, FORMATS, PRIORITIES, CHANNEL_FORMATS,
} from '@/lib/content/types';
import { ProductMultiSelect } from '@/components/admin/ProductSearch';

export interface ContentRefs { responsibles: { id: string; name: string }[]; creators: { id: string; name: string }[]; campaigns: { id: string; name: string }[] }

// Drawer create/edit de un ContentItem. Única fuente de edición del deliverable:
// se usa en Content OS y desde Campaign/Collaboration (mismo ID, misma pieza).
export function ContentDrawer({ initial, refs, headers, onClose, onSave, onArchive }: {
  initial: Partial<ContentItem>;
  refs: ContentRefs;
  headers: () => Record<string, string>;
  onClose: () => void;
  onSave: (patch: Partial<ContentItem>, id?: string) => Promise<boolean>;
  onArchive: (id: string) => void;
}) {
  const [f, setF] = useState<Partial<ContentItem>>(initial);
  const [saving, setSaving] = useState(false);
  const [newRef, setNewRef] = useState('');
  const set = (patch: Partial<ContentItem>) => setF((p) => ({ ...p, ...patch }));
  const isEdit = !!f.id;
  const inputCls = 'w-full border border-border bg-card text-foreground rounded-lg px-2.5 py-1.5 text-[13px] focus:outline-none focus:border-border-mid';
  const localDT = (iso?: string | null) => { if (!iso) return ''; const d = new Date(iso); const off = d.getTimezoneOffset() * 60000; return new Date(d.getTime() - off).toISOString().slice(0, 16); };

  async function submit() {
    if (!f.title?.trim()) { alert('El título es obligatorio.'); return; }
    setSaving(true);
    const patch: Partial<ContentItem> = { ...f };
    if (isEdit) (patch as any).expectedUpdatedAt = f.updatedAt;
    const ok = await onSave(patch, f.id); setSaving(false);
    if (ok) onClose();
  }
  function addRef() {
    const url = newRef.trim(); if (!url) return;
    try { new URL(url); } catch { alert('URL inválida.'); return; }
    const ref: ContentReference = { id: 'r_' + Date.now().toString(36), url };
    set({ references: [...(f.references || []), ref] }); setNewRef('');
  }
  const formats = CHANNEL_FORMATS[f.channel as ContentChannel] || FORMATS;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-lg bg-background h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background z-10">
          <h3 className="text-[15px] font-bold text-foreground">{isEdit ? 'Editar contenido' : 'Nuevo contenido'}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="space-y-3">
            <label className="block text-[11px] text-muted-foreground">Título *<input className={inputCls} value={f.title || ''} onChange={(e) => set({ title: e.target.value })} autoFocus /></label>
            <label className="block text-[11px] text-muted-foreground">Descripción (qué hay que hacer)<textarea className={`${inputCls} resize-y`} rows={2} value={f.description || ''} onChange={(e) => set({ description: e.target.value })} /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-muted-foreground">Canal *<select className={inputCls} value={f.channel} onChange={(e) => { const ch = e.target.value as ContentChannel; set({ channel: ch, format: (CHANNEL_FORMATS[ch] || [])[0] || 'other' }); }}>{CHANNELS.map((c) => <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>)}</select></label>
              <label className="text-[11px] text-muted-foreground">Formato *<select className={inputCls} value={f.format} onChange={(e) => set({ format: e.target.value as ContentFormat })}>{formats.map((c) => <option key={c} value={c}>{FORMAT_LABEL[c]}</option>)}</select></label>
              <label className="text-[11px] text-muted-foreground">Estado<select className={inputCls} value={f.status} onChange={(e) => set({ status: e.target.value as ContentStatus })}>{ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></label>
              <label className="text-[11px] text-muted-foreground">Prioridad<select className={inputCls} value={f.priority} onChange={(e) => set({ priority: e.target.value as ContentPriority })}>{PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select></label>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground/70">Planificación</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-muted-foreground">Fecha/hora programada<input type="datetime-local" className={inputCls} value={localDT(f.scheduledAt)} onChange={(e) => set({ scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label>
              <label className="text-[11px] text-muted-foreground">Responsable<select className={inputCls} value={f.responsibleId || ''} onChange={(e) => set({ responsibleId: e.target.value || null })}><option value="">Sin responsable</option>{refs.responsibles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground/70">Contenido</p>
            <label className="block text-[11px] text-muted-foreground">Copy / Caption<textarea className={`${inputCls} resize-y`} rows={4} value={f.copy || ''} onChange={(e) => set({ copy: e.target.value })} placeholder="Texto que se publica…" /></label>
            <label className="block text-[11px] text-muted-foreground">Notas internas<textarea className={`${inputCls} resize-y`} rows={2} value={f.notes || ''} onChange={(e) => set({ notes: e.target.value })} /></label>
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">Referencias</p>
              <div className="space-y-1 mb-1.5">
                {(f.references || []).map((r) => (
                  <div key={r.id} className="flex items-center gap-2 text-[12px]">
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-foreground hover:underline truncate flex-1">{r.label || r.url}</a>
                    <button onClick={() => set({ references: (f.references || []).filter((x) => x.id !== r.id) })} className="text-muted-foreground/50 hover:text-destructive"><X size={13} /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input className={inputCls} value={newRef} onChange={(e) => setNewRef(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addRef()} placeholder="https://…" />
                <button onClick={addRef} className="h-8 px-3 rounded-lg border border-border text-[12px] text-foreground hover:bg-muted shrink-0">Agregar</button>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground/70">Relaciones</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-muted-foreground">Campaña<select className={inputCls} value={f.campaignId || ''} onChange={(e) => set({ campaignId: e.target.value || null })}><option value="">—</option>{refs.campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <label className="text-[11px] text-muted-foreground">Creador<select className={inputCls} value={f.creatorId || ''} onChange={(e) => set({ creatorId: e.target.value || null })}><option value="">—</option>{refs.creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            </div>
            {f.collaborationId && <p className="text-[10.5px] text-muted-foreground">Entregable de una colaboración (ID {f.collaborationId}). El vínculo se mantiene al guardar.</p>}
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">Productos</p>
              <ProductMultiSelect value={f.productIds || []} onChange={(ids) => set({ productIds: ids })} headers={headers} />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 pb-6">
            <button onClick={submit} disabled={saving || !f.title?.trim()} className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-[13px] font-semibold disabled:opacity-50">{saving ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear'}</button>
            {isEdit && <button onClick={() => onArchive(f.id!)} className="ml-auto text-[12px] text-muted-foreground hover:text-destructive flex items-center gap-1"><Trash2 size={13} /> Archivar</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
