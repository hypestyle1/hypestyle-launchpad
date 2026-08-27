'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, Trash2, Plus, ExternalLink } from 'lucide-react';
import {
  type CreatorCollaboration, type CollaborationStatus, type CompensationType,
  COLLAB_STATUS_LABEL, COLLAB_STATUSES, COMPENSATION_LABEL, COMPENSATION_TYPES,
} from '@/lib/campaigns/types';
import {
  type ContentItem, type ContentChannel, type ContentFormat,
  CHANNEL_LABEL, FORMAT_LABEL, STATUS_LABEL, STATUS_TONE, CHANNELS, CHANNEL_FORMATS,
} from '@/lib/content/types';
import { ItemsSentEditor, type SentItem } from '@/components/admin/ProductSearch';

const inputCls = 'w-full border border-border bg-card text-foreground rounded-lg px-2.5 py-1.5 text-[13px] focus:outline-none focus:border-border-mid';
const localDT = (iso?: string | null) => { if (!iso) return ''; const d = new Date(iso); const off = d.getTimezoneOffset() * 60000; return new Date(d.getTime() - off).toISOString().slice(0, 16); };
const fmtDayTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }) : 'Sin fecha');

type Ref = { id: string; name: string };

export function CollaborationDrawer({ initial, creators, campaigns, responsibles, lockCreator, lockCampaign, headers, onClose, onSave, onArchive, onOpenContent }: {
  initial: Partial<CreatorCollaboration>;
  creators: Ref[]; campaigns: Ref[]; responsibles: Ref[];
  lockCreator?: boolean; lockCampaign?: boolean;
  headers: () => Record<string, string>;
  onClose: () => void;
  onSave: (patch: Partial<CreatorCollaboration>, id?: string) => Promise<CreatorCollaboration | null>;
  onArchive?: (id: string) => void;
  onOpenContent?: (id: string) => void;
}) {
  const [f, setF] = useState<Partial<CreatorCollaboration>>(initial);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<CreatorCollaboration>) => setF((p) => ({ ...p, ...patch }));
  const isEdit = !!f.id;
  const comp = f.compensation || { type: 'gifting' as CompensationType };
  const setComp = (patch: Partial<typeof comp>) => set({ compensation: { ...comp, ...patch } });

  // Deliverables = ContentItems ligados por collaborationId (fuente única).
  const [deliverables, setDeliverables] = useState<ContentItem[] | null>(null);
  const loadDeliverables = useCallback(async (cid: string) => {
    try {
      const r = await fetch(`/api/admin/content?collaborationId=${cid}`, { headers: headers() });
      const d = await r.json();
      setDeliverables(Array.isArray(d.items) ? d.items : []);
    } catch { setDeliverables([]); }
  }, [headers]);
  useEffect(() => { if (f.id) loadDeliverables(f.id); }, [f.id, loadDeliverables]);

  async function submit() {
    if (!f.creatorId) { alert('El creator es obligatorio.'); return; }
    setSaving(true);
    const patch: Partial<CreatorCollaboration> = { ...f };
    if (isEdit) (patch as any).expectedUpdatedAt = f.updatedAt;
    const saved = await onSave(patch, f.id);
    setSaving(false);
    if (saved) { if (!isEdit) setF(saved); else set({ updatedAt: saved.updatedAt }); } // tras crear: quedarse en edición para cargar entregables
  }

  // Alta rápida de entregable → crea un ContentItem real ligado a la colaboración.
  const [nd, setNd] = useState<{ title: string; channel: ContentChannel; format: ContentFormat; scheduledAt: string; priority: string }>({ title: '', channel: 'instagram', format: 'reel', scheduledAt: '', priority: 'medium' });
  const [adding, setAdding] = useState(false);
  async function addDeliverable() {
    if (!nd.title.trim() || !f.id) return;
    setAdding(true);
    const body = {
      title: nd.title.trim(), channel: nd.channel, format: nd.format, status: 'idea', priority: nd.priority,
      scheduledAt: nd.scheduledAt ? new Date(nd.scheduledAt).toISOString() : null,
      campaignId: f.campaignId || null, creatorId: f.creatorId || null, collaborationId: f.id,
    };
    const r = await fetch('/api/admin/content', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() }, body: JSON.stringify(body) });
    setAdding(false);
    if (r.ok) { setNd({ title: '', channel: nd.channel, format: nd.format, scheduledAt: '', priority: 'medium' }); loadDeliverables(f.id); }
    else { const d = await r.json().catch(() => ({})); alert(d.error || 'No se pudo crear el entregable.'); }
  }

  const counts = f.counts || { expected: deliverables?.filter((d) => d.status !== 'cancelled').length || 0, received: 0, published: 0 };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-lg bg-background h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background z-10">
          <h3 className="text-[15px] font-bold text-foreground">{isEdit ? 'Colaboración' : 'Nueva colaboración'}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-muted-foreground">Creator *<select className={inputCls} value={f.creatorId || ''} disabled={lockCreator} onChange={(e) => set({ creatorId: e.target.value })}><option value="">Elegí…</option>{creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className="text-[11px] text-muted-foreground">Campaña<select className={inputCls} value={f.campaignId || ''} disabled={lockCampaign} onChange={(e) => set({ campaignId: e.target.value || null })}><option value="">Sin campaña</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className="text-[11px] text-muted-foreground">Estado<select className={inputCls} value={f.status} onChange={(e) => set({ status: e.target.value as CollaborationStatus })}>{COLLAB_STATUSES.map((s) => <option key={s} value={s}>{COLLAB_STATUS_LABEL[s]}</option>)}</select></label>
            <label className="text-[11px] text-muted-foreground">Responsable<select className={inputCls} value={f.responsibleId || ''} onChange={(e) => set({ responsibleId: e.target.value || null })}><option value="">—</option>{responsibles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
          </div>

          <div className="space-y-3 pt-1">
            <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground/70">Acuerdo y envío</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-muted-foreground">Deadline (contenido)<input type="datetime-local" className={inputCls} value={localDT(f.dueAt)} onChange={(e) => set({ dueAt: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label>
              <label className="text-[11px] text-muted-foreground">Acordado<input type="datetime-local" className={inputCls} value={localDT(f.agreedAt)} onChange={(e) => set({ agreedAt: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label>
              <label className="text-[11px] text-muted-foreground">Fecha de envío<input type="datetime-local" className={inputCls} value={localDT(f.shipmentDate)} onChange={(e) => set({ shipmentDate: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label>
              <label className="text-[11px] text-muted-foreground">Entregado<input type="datetime-local" className={inputCls} value={localDT(f.deliveredAt)} onChange={(e) => set({ deliveredAt: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label>
              <label className="text-[11px] text-muted-foreground">Tracking<input className={inputCls} value={f.trackingNumber || ''} onChange={(e) => set({ trackingNumber: e.target.value })} placeholder="Nº de seguimiento" /></label>
              <label className="text-[11px] text-muted-foreground">Correo<input className={inputCls} value={f.carrier || ''} onChange={(e) => set({ carrier: e.target.value })} placeholder="Andreani…" /></label>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground/70">Prendas enviadas</p>
            <p className="text-[10.5px] text-muted-foreground/60">Registro operativo — no descuenta stock de Woo.</p>
            <ItemsSentEditor value={(f.itemsSent as SentItem[]) || []} onChange={(items) => set({ itemsSent: items })} headers={headers} />
          </div>

          <div className="space-y-2 pt-1">
            <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground/70">Compensación</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-muted-foreground">Tipo<select className={inputCls} value={comp.type} onChange={(e) => setComp({ type: e.target.value as CompensationType })}>{COMPENSATION_TYPES.map((t) => <option key={t} value={t}>{COMPENSATION_LABEL[t]}</option>)}</select></label>
              {(comp.type === 'paid' || comp.type === 'gifting_paid') && (
                <label className="text-[11px] text-muted-foreground">Monto<input type="number" min={0} className={inputCls} value={comp.amount ?? ''} onChange={(e) => setComp({ amount: e.target.value === '' ? undefined : Math.max(0, parseFloat(e.target.value)) })} placeholder="ARS" /></label>
              )}
            </div>
            <p className="text-[10.5px] text-muted-foreground/50">El acuerdo se registra operativamente. No genera gasto en Finanzas todavía.</p>
          </div>

          {isEdit && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground/70">Entregables</p>
                <span className="text-[11px] text-muted-foreground">{counts.expected} esperados · {counts.received} recibidos · {counts.published} publicados</span>
              </div>
              <div className="space-y-1">
                {deliverables === null ? <p className="text-[12px] text-muted-foreground/60">Cargando…</p>
                  : deliverables.length === 0 ? <p className="text-[12px] text-muted-foreground/60">Sin entregables. Agregá los que espera el creator.</p>
                  : deliverables.map((d) => (
                    <button key={d.id} onClick={() => onOpenContent?.(d.id)} className="w-full flex items-center gap-2 text-left bg-muted/40 rounded-lg px-2.5 py-1.5 hover:bg-muted/70">
                      <span className={`text-[9.5px] rounded-full px-1.5 py-0.5 ${STATUS_TONE[d.status]}`}>{STATUS_LABEL[d.status]}</span>
                      <span className="min-w-0 flex-1 text-[12.5px] text-foreground truncate">{d.title}</span>
                      <span className="text-[10.5px] text-muted-foreground shrink-0">{CHANNEL_LABEL[d.channel]} · {FORMAT_LABEL[d.format]}</span>
                      <span className="text-[10.5px] text-muted-foreground/70 tabular-nums shrink-0 hidden sm:inline">{fmtDayTime(d.scheduledAt)}</span>
                      {onOpenContent && <ExternalLink size={12} className="text-muted-foreground/50 shrink-0" />}
                    </button>
                  ))}
              </div>
              {/* alta rápida */}
              <div className="border border-dashed border-border rounded-lg p-2.5 space-y-2">
                <input className={inputCls} value={nd.title} onChange={(e) => setNd((s) => ({ ...s, title: e.target.value }))} placeholder="Título del entregable (Reel, Story 1…)" onKeyDown={(e) => e.key === 'Enter' && addDeliverable()} />
                <div className="grid grid-cols-2 gap-2">
                  <select className={inputCls} value={nd.channel} onChange={(e) => { const ch = e.target.value as ContentChannel; setNd((s) => ({ ...s, channel: ch, format: (CHANNEL_FORMATS[ch] || [])[0] || 'other' })); }}>{CHANNELS.map((c) => <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>)}</select>
                  <select className={inputCls} value={nd.format} onChange={(e) => setNd((s) => ({ ...s, format: e.target.value as ContentFormat }))}>{(CHANNEL_FORMATS[nd.channel] || []).map((c) => <option key={c} value={c}>{FORMAT_LABEL[c]}</option>)}</select>
                  <label className="text-[10.5px] text-muted-foreground col-span-2">Fecha (opcional)<input type="datetime-local" className={inputCls} value={nd.scheduledAt} onChange={(e) => setNd((s) => ({ ...s, scheduledAt: e.target.value }))} /></label>
                </div>
                <button onClick={addDeliverable} disabled={!nd.title.trim() || adding} className="w-full h-8 rounded-lg border border-border text-[12px] text-foreground hover:bg-muted disabled:opacity-50 flex items-center justify-center gap-1"><Plus size={13} /> Agregar entregable</button>
              </div>
            </div>
          )}

          <label className="block text-[11px] text-muted-foreground pt-1">Notas<textarea className={`${inputCls} resize-y`} rows={2} value={f.notes || ''} onChange={(e) => set({ notes: e.target.value })} /></label>

          <div className="flex items-center gap-2 pt-2 pb-6">
            <button onClick={submit} disabled={saving || !f.creatorId} className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-[13px] font-semibold disabled:opacity-50">{saving ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear colaboración'}</button>
            {!isEdit && <span className="text-[11px] text-muted-foreground">Guardá para cargar entregables.</span>}
            {isEdit && onArchive && <button onClick={() => onArchive(f.id!)} className="ml-auto text-[12px] text-muted-foreground hover:text-destructive flex items-center gap-1"><Trash2 size={13} /> Archivar</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
