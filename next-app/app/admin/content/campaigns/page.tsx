'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Plus, Rocket } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import {
  type Campaign, type CampaignStatus, type CampaignType,
  CAMPAIGN_STATUS_LABEL, CAMPAIGN_TYPE_LABEL, CAMPAIGN_STATUSES, CAMPAIGN_TYPES, CAMPAIGN_STATUS_TONE,
  blankCampaign, progressText,
} from '@/lib/campaigns/types';
import { CampaignDrawer } from '@/components/admin/CampaignDrawer';

const fmtDay = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }) : '—');

export default function CampaignsPage() {
  const { autorizado, headers, puede, ingresarConClave } = useAdminAuth();
  const [keyInput, setKeyInput] = useState('');
  const [items, setItems] = useState<Campaign[] | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error' | 'notdeployed'>('loading');
  const [responsibles, setResponsibles] = useState<{ id: string; name: string }[]>([]);
  const [edit, setEdit] = useState<Partial<Campaign> | null>(null);
  const [filters, setFilters] = useState({ status: '', type: '', search: '' });

  const load = useCallback(async () => {
    if (!puede('creadores')) return;
    setState('loading');
    try {
      const qs = new URLSearchParams();
      if (filters.status) qs.set('status', filters.status);
      if (filters.type) qs.set('type', filters.type);
      if (filters.search) qs.set('search', filters.search);
      const res = await fetch(`/api/admin/campaigns?${qs}`, { headers: headers() });
      const d = await res.json();
      if (d.notDeployed) { setState('notdeployed'); setItems([]); return; }
      if (!res.ok) throw new Error();
      setItems(d.items || []); setState('ok');
    } catch { setState('error'); }
  }, [headers, puede, filters]);

  useEffect(() => { if (autorizado) load(); }, [autorizado, load]);
  useEffect(() => { if (autorizado) fetch('/api/admin/content/refs', { headers: headers() }).then((r) => r.ok ? r.json() : null).then((d) => d && setResponsibles(d.responsibles || [])).catch(() => {}); }, [autorizado, headers]);

  const ownerName = (id?: string | null) => responsibles.find((r) => r.id === id)?.name || (id ? id : '—');

  async function saveCampaign(patch: Partial<Campaign>, id?: string) {
    const url = id ? `/api/admin/campaigns/${id}` : '/api/admin/campaigns';
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() }, body: JSON.stringify(patch) });
    if (res.status === 501) { alert((await res.json()).error); return false; }
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.conflict ? 'La campaña cambió en otra sesión. Recargá.' : (d.error || 'Error al guardar')); return false; }
    await load(); return true;
  }
  async function archiveCampaign(id: string) {
    if (!confirm('¿Archivar esta campaña? Queda en la papelera, no se borra.')) return;
    await fetch(`/api/admin/campaigns/${id}`, { method: 'DELETE', headers: headers() });
    setEdit(null); load();
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

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-foreground">Campañas</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Drops, lanzamientos y colaboraciones. El contenido se organiza acá.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEdit(blankCampaign())} className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold flex items-center gap-1.5"><Plus size={14} /> Nueva campaña</button>
          <button onClick={load} title="Actualizar" className="h-9 w-9 grid place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-border-mid"><RefreshCw size={14} className={state === 'loading' ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} placeholder="Buscar…" className="h-8 border border-border bg-card text-foreground rounded-lg px-2.5 text-[12.5px] w-[160px] focus:outline-none focus:border-border-mid" />
        <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className="h-8 border border-border bg-card text-foreground rounded-lg px-2 text-[12px] focus:outline-none focus:border-border-mid">
          <option value="">Estado</option>{CAMPAIGN_STATUSES.map((s) => <option key={s} value={s}>{CAMPAIGN_STATUS_LABEL[s]}</option>)}
        </select>
        <select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))} className="h-8 border border-border bg-card text-foreground rounded-lg px-2 text-[12px] focus:outline-none focus:border-border-mid">
          <option value="">Tipo</option>{CAMPAIGN_TYPES.map((t) => <option key={t} value={t}>{CAMPAIGN_TYPE_LABEL[t]}</option>)}
        </select>
        {(filters.status || filters.type || filters.search) && <button onClick={() => setFilters({ status: '', type: '', search: '' })} className="text-[12px] text-muted-foreground hover:text-foreground">Limpiar</button>}
      </div>

      {!puede('creadores') ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-[13px] text-muted-foreground">Sin acceso a Contenido.</div>
      ) : state === 'notdeployed' ? (
        <div className="bg-warning-soft text-warning rounded-lg p-4 text-[13px]">El backend de Campañas (PHP 1.25.0) todavía no está desplegado. La UI está lista; al subir el mu-plugin, las campañas persisten server-side.</div>
      ) : state === 'error' ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-[13px] text-destructive">No se pudieron cargar las campañas. Reintentá.</div>
      ) : !items ? (
        <div className="h-[320px] bg-muted/40 rounded-lg animate-pulse" />
      ) : items.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-lg p-14 text-center">
          <Rocket size={26} className="mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-[14px] font-semibold text-foreground">Todavía no hay campañas.</p>
          <p className="text-[12.5px] text-muted-foreground mt-1">Creá un drop o lanzamiento y colgá el contenido y las colaboraciones.</p>
          <button onClick={() => setEdit(blankCampaign())} className="mt-4 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold">Crear primera campaña</button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead><tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground/80">
                <th className="px-3 py-2 text-left font-medium">Campaña</th>
                <th className="px-3 py-2 text-left font-medium">Estado</th>
                <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">Lanzamiento</th>
                <th className="px-3 py-2 text-left font-medium hidden md:table-cell">Owner</th>
                <th className="px-3 py-2 text-left font-medium hidden lg:table-cell">Creadores</th>
                <th className="px-3 py-2 text-left font-medium">Progreso</th>
              </tr></thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-3 py-2.5">
                      <Link href={`/admin/content/campaigns/${c.id}`} className="text-foreground font-medium hover:underline">{c.name}</Link>
                      <span className="block text-[10.5px] text-muted-foreground">{CAMPAIGN_TYPE_LABEL[c.type as CampaignType]}</span>
                    </td>
                    <td className="px-3 py-2.5"><span className={`text-[10px] rounded-full px-2 py-0.5 ${CAMPAIGN_STATUS_TONE[c.status as CampaignStatus]}`}>{CAMPAIGN_STATUS_LABEL[c.status as CampaignStatus]}</span></td>
                    <td className="px-3 py-2.5 text-muted-foreground tabular-nums hidden sm:table-cell whitespace-nowrap">
                      {fmtDay(c.launchAt)}{typeof c.daysToLaunch === 'number' && c.daysToLaunch >= 0 && c.status !== 'completed' && c.status !== 'cancelled' && <span className="text-[10.5px] text-muted-foreground/70"> · {c.daysToLaunch === 0 ? 'hoy' : `en ${c.daysToLaunch}d`}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell truncate max-w-[140px]">{ownerName(c.ownerId)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground tabular-nums hidden lg:table-cell">{c.stats?.creators || 0}</td>
                    <td className="px-3 py-2.5 text-muted-foreground text-[12px]">{progressText(c.stats)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {edit && <CampaignDrawer initial={edit} responsibles={responsibles} headers={headers} onClose={() => setEdit(null)} onSave={saveCampaign} onArchive={archiveCampaign} />}
    </div>
  );
}
