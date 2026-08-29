'use client';

import { useState } from 'react';
import { X, Trash2, Plus, Check } from 'lucide-react';
import { type Template } from '@/lib/workflow/types';
import {
  type ContentChannel, type ContentFormat, type ContentPriority, type ContentPillar, type ContentObjective, type ChecklistItem,
  CHANNEL_LABEL, FORMAT_LABEL, PRIORITY_LABEL, PILLAR_LABEL, OBJECTIVE_LABEL, CHANNELS, FORMATS, PRIORITIES, PILLARS, OBJECTIVES, CHANNEL_FORMATS,
} from '@/lib/content/types';

const inputCls = 'w-full border border-border bg-card text-foreground rounded-lg px-2.5 py-1.5 text-[13px] focus:outline-none focus:border-border-mid';

export function TemplateDrawer({ initial, responsibles, onClose, onSave, onDelete }: {
  initial: Partial<Template>;
  responsibles: { id: string; name: string }[];
  onClose: () => void;
  onSave: (patch: Partial<Template>, id?: string) => Promise<boolean>;
  onDelete?: (id: string) => void;
}) {
  const [f, setF] = useState<Partial<Template>>(initial);
  const [saving, setSaving] = useState(false);
  const [cl, setCl] = useState('');
  const set = (patch: Partial<Template>) => setF((p) => ({ ...p, ...patch }));
  const isEdit = !!f.id;
  const checklist: ChecklistItem[] = (f.checklist as ChecklistItem[]) || [];
  const formats = CHANNEL_FORMATS[f.channel as ContentChannel] || FORMATS;

  async function submit() {
    if (!f.name?.trim()) { alert('El nombre es obligatorio.'); return; }
    setSaving(true);
    const patch = { ...f }; if (isEdit) (patch as any).expectedUpdatedAt = f.updatedAt;
    const ok = await onSave(patch, f.id); setSaving(false); if (ok) onClose();
  }
  const listEditor = (key: 'briefDo' | 'briefDont', label: string) => {
    const items: string[] = (f[key] as string[]) || [];
    return (
      <div>
        <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
        {items.map((it, i) => <div key={i} className="flex items-center gap-2 mb-1"><input className={inputCls} value={it} onChange={(e) => set({ [key]: items.map((x, idx) => idx === i ? e.target.value : x) } as any)} /><button onClick={() => set({ [key]: items.filter((_, idx) => idx !== i) } as any)} className="text-muted-foreground/50 hover:text-destructive"><X size={13} /></button></div>)}
        <button onClick={() => set({ [key]: [...items, ''] } as any)} className="text-[12px] text-muted-foreground hover:text-foreground flex items-center gap-1"><Plus size={12} /> Agregar</button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-lg bg-background h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background z-10">
          <h3 className="text-[15px] font-bold text-foreground">{isEdit ? 'Editar template' : 'Nuevo template'}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <label className="block text-[11px] text-muted-foreground">Nombre *<input className={inputCls} value={f.name || ''} onChange={(e) => set({ name: e.target.value })} autoFocus placeholder="Reel Producto" /></label>
          <label className="block text-[11px] text-muted-foreground">Patrón de título<input className={inputCls} value={f.titlePattern || ''} onChange={(e) => set({ titlePattern: e.target.value })} placeholder="Reel — [producto]" /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-muted-foreground">Canal<select className={inputCls} value={f.channel} onChange={(e) => { const ch = e.target.value as ContentChannel; set({ channel: ch, format: (CHANNEL_FORMATS[ch] || [])[0] || 'other' }); }}>{CHANNELS.map((c) => <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>)}</select></label>
            <label className="text-[11px] text-muted-foreground">Formato<select className={inputCls} value={f.format} onChange={(e) => set({ format: e.target.value as ContentFormat })}>{formats.map((c: ContentFormat) => <option key={c} value={c}>{FORMAT_LABEL[c]}</option>)}</select></label>
            <label className="text-[11px] text-muted-foreground">Pilar<select className={inputCls} value={f.contentPillar || ''} onChange={(e) => set({ contentPillar: (e.target.value || null) as ContentPillar })}><option value="">—</option>{PILLARS.map((p) => <option key={p} value={p}>{PILLAR_LABEL[p]}</option>)}</select></label>
            <label className="text-[11px] text-muted-foreground">Objetivo<select className={inputCls} value={f.objective || ''} onChange={(e) => set({ objective: (e.target.value || null) as ContentObjective })}><option value="">—</option>{OBJECTIVES.map((o) => <option key={o} value={o}>{OBJECTIVE_LABEL[o]}</option>)}</select></label>
            <label className="text-[11px] text-muted-foreground">Prioridad<select className={inputCls} value={f.priority} onChange={(e) => set({ priority: e.target.value as ContentPriority })}>{PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select></label>
          </div>
          <label className="block text-[11px] text-muted-foreground">Hook<textarea className={`${inputCls} resize-y`} rows={2} value={f.hook || ''} onChange={(e) => set({ hook: e.target.value })} /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-muted-foreground">CTA<input className={inputCls} value={f.cta || ''} onChange={(e) => set({ cta: e.target.value })} /></label>
            <label className="text-[11px] text-muted-foreground">Audiencia<input className={inputCls} value={f.audience || ''} onChange={(e) => set({ audience: e.target.value })} /></label>
          </div>
          <div className="grid grid-cols-2 gap-3">{listEditor('briefDo', 'Do')}{listEditor('briefDont', "Don't")}</div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-1">Checklist por defecto</p>
            {checklist.map((c) => <div key={c.id} className="flex items-center gap-2 mb-1"><span className="text-[13px] text-foreground flex-1">{c.label}</span><button onClick={() => set({ checklist: checklist.filter((x) => x.id !== c.id) })} className="text-muted-foreground/50 hover:text-destructive"><X size={13} /></button></div>)}
            <div className="flex gap-2"><input className={inputCls} value={cl} onChange={(e) => setCl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && cl.trim()) { set({ checklist: [...checklist, { id: 'c_' + Date.now().toString(36), label: cl.trim(), completed: false }] }); setCl(''); } }} placeholder="Ítem…" /><button onClick={() => { if (cl.trim()) { set({ checklist: [...checklist, { id: 'c_' + Date.now().toString(36), label: cl.trim(), completed: false }] }); setCl(''); } }} className="h-8 px-3 rounded-lg border border-border text-[12px] shrink-0">+</button></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-muted-foreground">Responsable por defecto<select className={inputCls} value={f.defaultResponsibleId || ''} onChange={(e) => set({ defaultResponsibleId: e.target.value || null })}><option value="">—</option>{responsibles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
            <label className="text-[11px] text-muted-foreground">Reviewer por defecto<select className={inputCls} value={f.defaultReviewerId || ''} onChange={(e) => set({ defaultReviewerId: e.target.value || null })}><option value="">—</option>{responsibles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
          </div>
          <label className="block text-[11px] text-muted-foreground">Notas<textarea className={`${inputCls} resize-y`} rows={2} value={f.notes || ''} onChange={(e) => set({ notes: e.target.value })} /></label>
          <div className="flex items-center gap-2 pt-2 pb-6">
            <button onClick={submit} disabled={saving || !f.name?.trim()} className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-[13px] font-semibold disabled:opacity-50">{saving ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear template'}</button>
            {isEdit && onDelete && <button onClick={() => onDelete(f.id!)} className="ml-auto text-[12px] text-muted-foreground hover:text-destructive flex items-center gap-1"><Trash2 size={13} /> Borrar</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
