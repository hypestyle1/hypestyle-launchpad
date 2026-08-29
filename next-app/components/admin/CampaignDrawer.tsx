'use client';

import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import {
  type Campaign, type CampaignStatus, type CampaignType,
  CAMPAIGN_STATUS_LABEL, CAMPAIGN_TYPE_LABEL, CAMPAIGN_STATUSES, CAMPAIGN_TYPES,
} from '@/lib/campaigns/types';
import type { ContentReference } from '@/lib/content/types';
import { ProductMultiSelect } from '@/components/admin/ProductSearch';

const inputCls = 'w-full border border-border bg-card text-foreground rounded-lg px-2.5 py-1.5 text-[13px] focus:outline-none focus:border-border-mid';
const localDT = (iso?: string | null) => { if (!iso) return ''; const d = new Date(iso); const off = d.getTimezoneOffset() * 60000; return new Date(d.getTime() - off).toISOString().slice(0, 16); };

export function CampaignDrawer({ initial, responsibles, headers, onClose, onSave, onArchive }: {
  initial: Partial<Campaign>;
  responsibles: { id: string; name: string }[];
  headers: () => Record<string, string>;
  onClose: () => void;
  onSave: (patch: Partial<Campaign>, id?: string) => Promise<boolean>;
  onArchive?: (id: string) => void;
}) {
  const [f, setF] = useState<Partial<Campaign>>(initial);
  const [saving, setSaving] = useState(false);
  const [newRef, setNewRef] = useState('');
  const set = (patch: Partial<Campaign>) => setF((p) => ({ ...p, ...patch }));
  const isEdit = !!f.id;

  async function submit() {
    if (!f.name?.trim()) { alert('El nombre es obligatorio.'); return; }
    setSaving(true);
    const patch: Partial<Campaign> = { ...f };
    if (isEdit) (patch as any).expectedUpdatedAt = f.updatedAt;
    const ok = await onSave(patch, f.id); setSaving(false);
    if (ok) onClose();
  }
  function addRef() {
    const url = newRef.trim(); if (!url) return;
    try { new URL(url); } catch { alert('URL inválida.'); return; }
    set({ references: [...(f.references || []), { id: 'r_' + Date.now().toString(36), url } as ContentReference] }); setNewRef('');
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-lg bg-background h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background z-10">
          <h3 className="text-[15px] font-bold text-foreground">{isEdit ? 'Editar campaña' : 'Nueva campaña'}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="space-y-3">
            <label className="block text-[11px] text-muted-foreground">Nombre *<input className={inputCls} value={f.name || ''} onChange={(e) => set({ name: e.target.value })} autoFocus placeholder="Faith Collection" /></label>
            <label className="block text-[11px] text-muted-foreground">Descripción<textarea className={`${inputCls} resize-y`} rows={2} value={f.description || ''} onChange={(e) => set({ description: e.target.value })} /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-muted-foreground">Tipo<select className={inputCls} value={f.type} onChange={(e) => set({ type: e.target.value as CampaignType })}>{CAMPAIGN_TYPES.map((t) => <option key={t} value={t}>{CAMPAIGN_TYPE_LABEL[t]}</option>)}</select></label>
              <label className="text-[11px] text-muted-foreground">Estado<select className={inputCls} value={f.status} onChange={(e) => set({ status: e.target.value as CampaignStatus })}>{CAMPAIGN_STATUSES.map((s) => <option key={s} value={s}>{CAMPAIGN_STATUS_LABEL[s]}</option>)}</select></label>
              <label className="text-[11px] text-muted-foreground col-span-2">Owner<select className={inputCls} value={f.ownerId || ''} onChange={(e) => set({ ownerId: e.target.value || null })}><option value="">Sin owner</option>{responsibles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground/70">Fechas (ninguna obligatoria)</p>
            <div className="grid grid-cols-3 gap-2">
              <label className="text-[11px] text-muted-foreground">Inicio<input type="datetime-local" className={inputCls} value={localDT(f.startAt)} onChange={(e) => set({ startAt: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label>
              <label className="text-[11px] text-muted-foreground">Lanzamiento<input type="datetime-local" className={inputCls} value={localDT(f.launchAt)} onChange={(e) => set({ launchAt: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label>
              <label className="text-[11px] text-muted-foreground">Fin<input type="datetime-local" className={inputCls} value={localDT(f.endAt)} onChange={(e) => set({ endAt: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground/70">Productos</p>
            <ProductMultiSelect value={f.productIds || []} onChange={(ids) => set({ productIds: ids })} headers={headers} />
          </div>

          <div className="space-y-3 pt-1">
            <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground/70">Detalle</p>
            <label className="block text-[11px] text-muted-foreground">Objetivo<textarea className={`${inputCls} resize-y`} rows={2} value={f.objective || ''} onChange={(e) => set({ objective: e.target.value })} placeholder="Qué buscamos con esta campaña…" /></label>
            <label className="block text-[11px] text-muted-foreground">Notas<textarea className={`${inputCls} resize-y`} rows={2} value={f.notes || ''} onChange={(e) => set({ notes: e.target.value })} /></label>
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

          <div className="flex items-center gap-2 pt-2 pb-6">
            <button onClick={submit} disabled={saving || !f.name?.trim()} className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-[13px] font-semibold disabled:opacity-50">{saving ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear campaña'}</button>
            {isEdit && onArchive && <button onClick={() => onArchive(f.id!)} className="ml-auto text-[12px] text-muted-foreground hover:text-destructive flex items-center gap-1"><Trash2 size={13} /> Archivar</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
