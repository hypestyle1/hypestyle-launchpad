'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, CalendarClock } from 'lucide-react';
import {
  type CreatorCollaboration, COLLAB_STATUS_LABEL, COLLAB_STATUS_TONE, blankCollaboration,
} from '@/lib/campaigns/types';
import { type ContentItem, STATUS_LABEL, STATUS_TONE, CHANNEL_LABEL, FORMAT_LABEL } from '@/lib/content/types';
import { CollaborationDrawer } from '@/components/admin/CollaborationDrawer';
import { ContentDrawer, type ContentRefs } from '@/components/admin/ContentDrawer';

const fmtDay = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }) : '—');

// Panel de colaboraciones + contenido de UN creator. Todo derivado de las
// colecciones reales (collaborations/content por creatorId) — sin historial duplicado.
export function CreatorCollaborations({ creatorId, headers }: { creatorId: string; headers: () => Record<string, string> }) {
  const [collabs, setCollabs] = useState<CreatorCollaboration[] | null>(null);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [refs, setRefs] = useState<ContentRefs>({ responsibles: [], creators: [], campaigns: [] });
  const [editCollab, setEditCollab] = useState<Partial<CreatorCollaboration> | null>(null);
  const [editContent, setEditContent] = useState<Partial<ContentItem> | null>(null);

  const load = useCallback(async () => {
    try {
      const [co, ct] = await Promise.all([
        fetch(`/api/admin/collaborations?creatorId=${creatorId}`, { headers: headers() }).then((r) => r.json()),
        fetch(`/api/admin/content?creatorId=${creatorId}`, { headers: headers() }).then((r) => r.json()),
      ]);
      setCollabs(Array.isArray(co.items) ? co.items : []);
      setContent(Array.isArray(ct.items) ? ct.items : []);
    } catch { setCollabs([]); }
  }, [creatorId, headers]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch('/api/admin/content/refs', { headers: headers() }).then((r) => r.ok ? r.json() : null).then((d) => d && setRefs(d)).catch(() => {}); }, [headers]);

  const campaignName = (v?: string | null) => refs.campaigns.find((c) => c.id === v)?.name || (v ? `#${v}` : 'Sin campaña');

  async function saveCollab(patch: Partial<CreatorCollaboration>, id?: string): Promise<CreatorCollaboration | null> {
    const url = id ? `/api/admin/collaborations/${id}` : '/api/admin/collaborations';
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() }, body: JSON.stringify(patch) });
    if (res.status === 501) { alert((await res.json()).error); return null; }
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.conflict ? 'La colaboración cambió en otra sesión. Recargá.' : (d.error || 'Error')); return null; }
    const d = await res.json(); await load(); return d.item as CreatorCollaboration;
  }
  async function archiveCollab(id: string) {
    if (!confirm('¿Archivar esta colaboración?')) return;
    await fetch(`/api/admin/collaborations/${id}`, { method: 'DELETE', headers: headers() });
    setEditCollab(null); load();
  }
  async function saveContent(patch: Partial<ContentItem>, id?: string) {
    const url = id ? `/api/admin/content/${id}` : '/api/admin/content';
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() }, body: JSON.stringify(patch) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.conflict ? 'El contenido cambió en otra sesión. Recargá.' : (d.error || 'Error')); return false; }
    await load(); return true;
  }
  async function archiveContent(id: string) { await fetch(`/api/admin/content/${id}`, { method: 'DELETE', headers: headers() }); setEditContent(null); load(); }

  return (
    <div className="border-t border-border pt-3 mt-1 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70">Colaboraciones {collabs && `(${collabs.length})`}</p>
        <button onClick={() => setEditCollab(blankCollaboration(creatorId, null))} className="h-7 px-2.5 rounded-lg border border-border bg-card text-[11.5px] text-foreground hover:bg-muted flex items-center gap-1"><Plus size={12} /> Nueva</button>
      </div>

      {collabs === null ? <p className="text-[12px] text-muted-foreground/60">Cargando…</p>
        : collabs.length === 0 ? <p className="text-[12px] text-muted-foreground/60">Sin colaboraciones registradas.</p>
        : <div className="space-y-1.5">
            {collabs.map((c) => (
              <button key={c.id} onClick={() => setEditCollab(c)} className="w-full text-left bg-card border border-border rounded-lg px-2.5 py-2 hover:border-border-mid">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-medium text-foreground truncate">{campaignName(c.campaignId)}</span>
                  <span className={`text-[10px] rounded-full px-1.5 py-0.5 shrink-0 ${COLLAB_STATUS_TONE[c.status]}`}>{COLLAB_STATUS_LABEL[c.status]}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10.5px] text-muted-foreground">
                  <span>{(c.itemsSent || []).reduce((n, i) => n + (i.quantity || 1), 0)} prendas</span>
                  <span className="tabular-nums">{c.counts?.expected ?? 0}/{c.counts?.received ?? 0}/{c.counts?.published ?? 0} esp/rec/pub</span>
                  <span className={`inline-flex items-center gap-1 ${c.overdue ? 'text-warning font-medium' : ''}`}><CalendarClock size={11} />{c.dueAt ? fmtDay(c.dueAt) : 'sin due'}{c.overdue ? ' · vencido' : ''}</span>
                </div>
              </button>
            ))}
          </div>}

      {content.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-1.5">Contenido ({content.length})</p>
          <div className="space-y-1">
            {content.slice(0, 8).map((c) => (
              <button key={c.id} onClick={() => setEditContent(c)} className="w-full flex items-center gap-2 text-left bg-muted/40 rounded-lg px-2.5 py-1.5 hover:bg-muted/70">
                <span className={`text-[9.5px] rounded-full px-1.5 py-0.5 ${STATUS_TONE[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                <span className="min-w-0 flex-1 text-[12px] text-foreground truncate">{c.title}</span>
                <span className="text-[10.5px] text-muted-foreground shrink-0">{CHANNEL_LABEL[c.channel]} · {FORMAT_LABEL[c.format]}</span>
              </button>
            ))}
          </div>
          {content.length > 8 && <Link href={`/admin/content?creatorId=${creatorId}`} className="text-[11px] text-muted-foreground hover:text-foreground mt-1 inline-block">Ver los {content.length} en Content OS →</Link>}
        </div>
      )}

      {editCollab && <CollaborationDrawer initial={editCollab} creators={refs.creators} campaigns={refs.campaigns} responsibles={refs.responsibles} lockCreator headers={headers} onClose={() => setEditCollab(null)} onSave={saveCollab} onArchive={archiveCollab} onOpenContent={(cid) => { const item = content.find((x) => x.id === cid); if (item) { setEditCollab(null); setEditContent(item); } }} />}
      {editContent && <ContentDrawer initial={editContent} refs={refs} headers={headers} onClose={() => setEditContent(null)} onSave={saveContent} onArchive={archiveContent} />}
    </div>
  );
}
