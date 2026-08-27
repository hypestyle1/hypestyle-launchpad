'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Pencil, RefreshCw, Users, CalendarClock, AlertTriangle } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import {
  type Campaign, type CreatorCollaboration, type CampaignStatus,
  CAMPAIGN_STATUS_LABEL, CAMPAIGN_TYPE_LABEL, CAMPAIGN_STATUS_TONE, COLLAB_STATUS_LABEL, COLLAB_STATUS_TONE,
  blankCollaboration,
} from '@/lib/campaigns/types';
import { type ContentItem, STATUS_LABEL, STATUS_TONE, CHANNEL_LABEL, FORMAT_LABEL } from '@/lib/content/types';
import { CampaignDrawer } from '@/components/admin/CampaignDrawer';
import { CollaborationDrawer } from '@/components/admin/CollaborationDrawer';
import { ContentDrawer, type ContentRefs } from '@/components/admin/ContentDrawer';
import { ProductMultiSelect } from '@/components/admin/ProductSearch';

const fmtDay = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }) : '—');
const fmtDayTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }) : 'Sin fecha');

type Tab = 'overview' | 'content' | 'creators' | 'products';

export default function CampaignDetailPage() {
  const { autorizado, headers, puede, ingresarConClave } = useAdminAuth();
  const [keyInput, setKeyInput] = useState('');
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [collabs, setCollabs] = useState<CreatorCollaboration[]>([]);
  const [refs, setRefs] = useState<ContentRefs>({ responsibles: [], creators: [], campaigns: [] });
  const [state, setState] = useState<'loading' | 'ok' | 'error' | 'notfound'>('loading');
  const [tab, setTab] = useState<Tab>('overview');

  const [editCampaign, setEditCampaign] = useState(false);
  const [editContent, setEditContent] = useState<Partial<ContentItem> | null>(null);
  const [editCollab, setEditCollab] = useState<Partial<CreatorCollaboration> | null>(null);

  const load = useCallback(async () => {
    if (!puede('creadores')) return;
    setState('loading');
    try {
      const [c, ct, co] = await Promise.all([
        fetch(`/api/admin/campaigns/${id}`, { headers: headers() }).then((r) => r.json()),
        fetch(`/api/admin/content?campaignId=${id}`, { headers: headers() }).then((r) => r.json()),
        fetch(`/api/admin/collaborations?campaignId=${id}`, { headers: headers() }).then((r) => r.json()),
      ]);
      if (!c.item) { setState('notfound'); return; }
      setCampaign(c.item); setContent(ct.items || []); setCollabs(co.items || []); setState('ok');
    } catch { setState('error'); }
  }, [headers, puede, id]);

  useEffect(() => { if (autorizado) load(); }, [autorizado, load]);
  useEffect(() => { if (autorizado) fetch('/api/admin/content/refs', { headers: headers() }).then((r) => r.ok ? r.json() : null).then((d) => d && setRefs(d)).catch(() => {}); }, [autorizado, headers]);

  const nameOf = (list: { id: string; name: string }[], v?: string | null) => list.find((x) => x.id === v)?.name || (v ? v : '—');
  const creatorName = (v?: string | null) => nameOf(refs.creators, v);
  const responsibleName = (v?: string | null) => nameOf(refs.responsibles, v);

  async function saveCampaign(patch: Partial<Campaign>) {
    const res = await fetch(`/api/admin/campaigns/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() }, body: JSON.stringify(patch) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.conflict ? 'La campaña cambió en otra sesión. Recargá.' : (d.error || 'Error')); return false; }
    await load(); return true;
  }
  async function saveContent(patch: Partial<ContentItem>, cid?: string) {
    const url = cid ? `/api/admin/content/${cid}` : '/api/admin/content';
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() }, body: JSON.stringify(patch) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.conflict ? 'El contenido cambió en otra sesión. Recargá.' : (d.error || 'Error')); return false; }
    await load(); return true;
  }
  async function archiveContent(cid: string) {
    if (!confirm('¿Archivar este contenido?')) return;
    await fetch(`/api/admin/content/${cid}`, { method: 'DELETE', headers: headers() });
    setEditContent(null); load();
  }
  async function saveCollab(patch: Partial<CreatorCollaboration>, cid?: string): Promise<CreatorCollaboration | null> {
    const url = cid ? `/api/admin/collaborations/${cid}` : '/api/admin/collaborations';
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() }, body: JSON.stringify(patch) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.conflict ? 'La colaboración cambió en otra sesión. Recargá.' : (d.error || 'Error')); return null; }
    const d = await res.json(); await load(); return d.item as CreatorCollaboration;
  }
  async function archiveCollab(cid: string) {
    if (!confirm('¿Archivar esta colaboración?')) return;
    await fetch(`/api/admin/collaborations/${cid}`, { method: 'DELETE', headers: headers() });
    setEditCollab(null); load();
  }

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

  const s = campaign?.stats;
  const overdueCollabs = collabs.filter((c) => c.overdue).length;

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-6">
      <Link href="/admin/content/campaigns" className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground mb-4"><ArrowLeft size={14} /> Campañas</Link>

      {state === 'loading' ? <div className="h-[400px] bg-muted/40 rounded-lg animate-pulse" />
        : state === 'notfound' ? <div className="bg-card border border-border rounded-lg p-10 text-center text-[13px] text-muted-foreground">Campaña no encontrada.</div>
        : state === 'error' ? <div className="bg-card border border-border rounded-lg p-10 text-center text-[13px] text-destructive">No se pudo cargar. <button onClick={load} className="underline">Reintentar</button></div>
        : campaign && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-foreground">{campaign.name}</h1>
                <span className={`text-[11px] rounded-full px-2 py-0.5 ${CAMPAIGN_STATUS_TONE[campaign.status as CampaignStatus]}`}>{CAMPAIGN_STATUS_LABEL[campaign.status as CampaignStatus]}</span>
              </div>
              <p className="text-[13px] text-muted-foreground mt-1">
                {CAMPAIGN_TYPE_LABEL[campaign.type]} · Lanzamiento {fmtDay(campaign.launchAt)}
                {typeof campaign.daysToLaunch === 'number' && campaign.daysToLaunch >= 0 && campaign.status !== 'completed' && campaign.status !== 'cancelled' && <span className="text-foreground font-medium"> · {campaign.daysToLaunch === 0 ? 'lanza hoy' : `en ${campaign.daysToLaunch} días`}</span>}
                {' '}· Owner {responsibleName(campaign.ownerId)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setEditCampaign(true)} className="h-9 px-3 rounded-lg border border-border bg-card text-[13px] text-foreground hover:bg-muted flex items-center gap-1.5"><Pencil size={13} /> Editar</button>
              <button onClick={load} className="h-9 w-9 grid place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"><RefreshCw size={14} /></button>
            </div>
          </div>

          {/* Overview KPIs — todo derivado */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-5">
            {[
              ['Contenido', s?.content ?? 0], ['Programado', s?.scheduled ?? 0], ['Publicado', s?.published ?? 0],
              ['Para revisar', s?.review ?? 0], ['Pendientes', s?.pending ?? 0], ['Creadores', s?.creators ?? 0],
              ['Días a lanzar', typeof campaign.daysToLaunch === 'number' ? Math.max(0, campaign.daysToLaunch) : '—'],
            ].map(([label, val]) => (
              <div key={label as string} className="bg-card border border-border rounded-lg px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70">{label}</p>
                <p className="text-[19px] font-bold text-foreground tabular-nums mt-0.5">{val as any}</p>
              </div>
            ))}
          </div>

          {overdueCollabs > 0 && (
            <div className="flex items-center gap-2 bg-warning-soft text-warning rounded-lg px-3 py-2 mb-4 text-[12.5px]"><AlertTriangle size={14} /> {overdueCollabs} colaboración{overdueCollabs === 1 ? '' : 'es'} con deadline vencido.</div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-border mb-4">
            {([['overview', 'Resumen'], ['content', `Contenido (${content.length})`], ['creators', `Creadores (${collabs.length})`], ['products', `Productos (${campaign.productIds?.length || 0})`]] as [Tab, string][]).map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-[13px] font-medium border-b-2 -mb-px ${tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{label}</button>
            ))}
          </div>

          {tab === 'overview' && (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                {campaign.objective && <Section title="Objetivo"><p className="text-[13px] text-foreground whitespace-pre-wrap">{campaign.objective}</p></Section>}
                {campaign.description && <Section title="Descripción"><p className="text-[13px] text-foreground whitespace-pre-wrap">{campaign.description}</p></Section>}
                {campaign.notes && <Section title="Notas"><p className="text-[13px] text-muted-foreground whitespace-pre-wrap">{campaign.notes}</p></Section>}
                {(campaign.references || []).length > 0 && (
                  <Section title="Referencias"><div className="space-y-1">{campaign.references!.map((r) => <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="block text-[12.5px] text-foreground hover:underline truncate">{r.label || r.url}</a>)}</div></Section>
                )}
              </div>
              <Section title="Fechas">
                <div className="space-y-2 text-[12.5px]">
                  {[['Inicio', campaign.startAt], ['Lanzamiento', campaign.launchAt], ['Fin', campaign.endAt]].map(([l, v]) => (
                    <div key={l as string} className="flex items-center justify-between"><span className="text-muted-foreground">{l}</span><span className="text-foreground tabular-nums">{fmtDayTime(v as string)}</span></div>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {tab === 'content' && (
            <div>
              <div className="flex justify-end mb-3">
                <button onClick={() => setEditContent({ title: '', channel: 'instagram', format: 'reel', status: 'idea', priority: 'medium', campaignId: id })} className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold flex items-center gap-1.5"><Plus size={13} /> Crear contenido</button>
              </div>
              {content.length === 0 ? <Empty text="Todavía no hay contenido en esta campaña." />
                : <div className="bg-card border border-border rounded-lg divide-y divide-border">
                    {content.map((c) => (
                      <button key={c.id} onClick={() => setEditContent(c)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-muted/40">
                        <span className={`text-[9.5px] rounded-full px-1.5 py-0.5 ${STATUS_TONE[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                        <span className="min-w-0 flex-1 text-[13px] text-foreground truncate">{c.title}</span>
                        <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:inline">{CHANNEL_LABEL[c.channel]} · {FORMAT_LABEL[c.format]}</span>
                        {c.creatorId && <span className="text-[11px] text-muted-foreground/70 shrink-0 hidden md:inline truncate max-w-[110px]">{creatorName(c.creatorId)}</span>}
                        <span className="text-[11px] text-muted-foreground/70 tabular-nums shrink-0 hidden lg:inline">{fmtDayTime(c.scheduledAt)}</span>
                      </button>
                    ))}
                  </div>}
            </div>
          )}

          {tab === 'creators' && (
            <div>
              <div className="flex justify-end mb-3">
                <button onClick={() => setEditCollab(blankCollaboration('', id))} className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold flex items-center gap-1.5"><Plus size={13} /> Nueva colaboración</button>
              </div>
              {collabs.length === 0 ? <Empty text="Todavía no hay colaboraciones en esta campaña." />
                : <div className="grid gap-2 sm:grid-cols-2">
                    {collabs.map((c) => (
                      <button key={c.id} onClick={() => setEditCollab(c)} className="text-left bg-card border border-border rounded-lg p-3 hover:border-border-mid">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-semibold text-foreground truncate">{creatorName(c.creatorId)}</span>
                          <span className={`text-[10px] rounded-full px-1.5 py-0.5 shrink-0 ${COLLAB_STATUS_TONE[c.status]}`}>{COLLAB_STATUS_LABEL[c.status]}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                          <span className="tabular-nums">{c.counts?.expected ?? 0} esperados</span>
                          <span className="tabular-nums">{c.counts?.received ?? 0} recibidos</span>
                          <span className="tabular-nums">{c.counts?.published ?? 0} publicados</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                          <CalendarClock size={12} className={c.overdue ? 'text-warning' : 'text-muted-foreground/60'} />
                          <span className={c.overdue ? 'text-warning font-medium' : 'text-muted-foreground'}>{c.dueAt ? `Due ${fmtDay(c.dueAt)}` : 'Sin deadline'}{c.overdue ? ' · vencido' : ''}</span>
                        </div>
                      </button>
                    ))}
                  </div>}
            </div>
          )}

          {tab === 'products' && (
            <Section title="Productos de la campaña">
              <ProductMultiSelect value={campaign.productIds || []} onChange={(ids) => saveCampaign({ productIds: ids, expectedUpdatedAt: campaign.updatedAt } as any)} headers={headers} />
              <p className="text-[11px] text-muted-foreground/60 mt-2">IDs Woo reales. Se guardan al agregar/quitar.</p>
            </Section>
          )}
        </>
      )}

      {editCampaign && campaign && <CampaignDrawer initial={campaign} responsibles={refs.responsibles} headers={headers} onClose={() => setEditCampaign(false)} onSave={saveCampaign} />}
      {editContent && <ContentDrawer initial={editContent} refs={refs} headers={headers} onClose={() => setEditContent(null)} onSave={saveContent} onArchive={archiveContent} />}
      {editCollab && <CollaborationDrawer initial={editCollab} creators={refs.creators} campaigns={refs.campaigns} responsibles={refs.responsibles} lockCampaign headers={headers} onClose={() => setEditCollab(null)} onSave={saveCollab} onArchive={archiveCollab} onOpenContent={(cid) => { const item = content.find((x) => x.id === cid); if (item) { setEditCollab(null); setEditContent(item); } }} />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground/70 mb-2">{title}</p>
      {children}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="bg-card border border-dashed border-border rounded-lg p-10 text-center text-[13px] text-muted-foreground">{text}</div>;
}
