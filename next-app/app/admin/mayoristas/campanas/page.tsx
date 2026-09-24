'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { arDate, type WholesaleCampaign, type CampaignPreview, type EffectiveStatus } from '@/lib/wholesale-campaigns';
import type { CampaignResults } from '@/lib/wholesale-campaign-results';

// Campañas mayoristas (Wholesale Campaigns V1 — C3). Lista, editor, preview
// financiero con Woo en vivo, activación con gate CRITICAL y resultados desde
// las órdenes. El precio final siempre lo calcula el servidor: acá solo se
// configura. Nunca toca regular_price ni sale_price.

const WP_SECRET_KEY = 'hype_admin_key';
type Listed = WholesaleCampaign & { effectiveStatus: EffectiveStatus };
type Product = { id: number; name: string; image: string; categories: string[]; regularPrice: number | null; wholesale: boolean; wholesalePrice: number | null; profileId: string };

const fmt = (n: number | null | undefined) => n == null ? '—' : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const pct = (n: number | null | undefined) => n == null ? '—' : `${Math.round(n * 100)}%`;
const STATUS_LABEL: Record<EffectiveStatus, string> = { draft: 'Borrador', scheduled: 'Programada', active: 'Activa', ended: 'Terminada' };
const STATUS_STYLE: Record<EffectiveStatus, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  scheduled: 'bg-warning-soft text-warning border-warning/40',
  active: 'bg-success-soft text-success border-success/30',
  ended: 'text-muted-foreground/70 border-border',
};
const RISK_STYLE: Record<string, string> = {
  OK: 'bg-success-soft text-success border-success/30', RISK: 'bg-warning-soft text-warning border-warning/40',
  CRITICAL: 'bg-destructive/10 text-destructive border-destructive/40', COST_UNKNOWN: 'bg-muted text-muted-foreground border-border', NOT_WHOLESALE: 'text-muted-foreground/50 border-transparent',
};
const PRESETS = [{ key: '20', label: '20% EXTRA', discount: 0.2 }, { key: '15', label: '15% EXTRA', discount: 0.15 }, { key: '10', label: '10% EXTRA', discount: 0.1 }];

// Fecha AR ↔ input datetime-local (Argentina es UTC-3 fijo).
const toLocalInput = (iso: string) => { const d = new Date(new Date(iso).getTime() - 3 * 3600000); return d.toISOString().slice(0, 16); };
const fromLocalInput = (v: string) => `${v.length === 16 ? v + ':00' : v}-03:00`;
const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

function blankCampaign(): WholesaleCampaign {
  const now = new Date();
  const ymd = now.toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
  return {
    id: `wc_${ymd.slice(0, 7)}_nueva`, name: 'Nueva campaña', status: 'draft',
    startsAt: arDate(ymd), endsAt: arDate(ymd, 'end'),
    badge: 'LIQUIDACIÓN', headline: 'HYPE WHOLESALE — PRIVATE STOCK SALE', text: 'Selected archive pieces. Unidades limitadas. Sin reposición.',
    minOrder: null, groups: PRESETS.map(p => ({ ...p })), items: [], createdAt: now.toISOString(), updatedAt: now.toISOString(), history: [],
  };
}

export default function CampanasPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [keyInput, setKeyInput] = useState('');

  const [list, setList] = useState<Listed[]>([]);
  const [overlaps, setOverlaps] = useState<{ productId: number; campaigns: string[] }[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<WholesaleCampaign | null>(null);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState<CampaignPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<{ results: CampaignResults; stockSnapshot: Record<string, number | null> | null; ordersScanned: number } | null>(null);
  const [tab, setTab] = useState<'editor' | 'resultados'>('editor');
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const headers = useMemo(() => ({ 'x-admin-key': adminKey, 'Content-Type': 'application/json' }), [adminKey]);

  useEffect(() => {
    const stored = sessionStorage.getItem(WP_SECRET_KEY);
    if (stored) { setAdminKey(stored); setAuthed(true); }
  }, []);

  const loadAll = useCallback(async (key: string) => {
    setLoading(true);
    try {
      const h = { 'x-admin-key': key };
      const [cRes, pRes] = await Promise.all([fetch('/api/admin/wholesale-campaigns', { headers: h }), fetch('/api/admin/product-costs', { headers: h })]);
      if (cRes.status === 403 || pRes.status === 403) { setAuthed(false); sessionStorage.removeItem(WP_SECRET_KEY); return; }
      const c = await cRes.json(); const p = await pRes.json();
      setList(c.campaigns ?? []); setOverlaps(c.overlaps ?? []); setProducts((p.products ?? []).filter((x: Product) => x.wholesale));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { if (authed && adminKey) loadAll(adminKey); }, [authed, adminKey, loadAll]);

  function login() {
    if (!keyInput.trim()) return;
    sessionStorage.setItem(WP_SECRET_KEY, keyInput.trim());
    setAdminKey(keyInput.trim()); setAuthed(true);
  }

  // Preview financiero: se recalcula (con debounce) cada vez que cambia la campaña editada.
  const runPreview = useCallback(async (c: WholesaleCampaign) => {
    if (!c.items.length) { setPreview(null); return; }
    setPreviewing(true);
    try {
      const res = await fetch('/api/admin/wholesale-campaigns/preview', { method: 'POST', headers, body: JSON.stringify({ campaign: c }) });
      const data = await res.json();
      setPreview(res.ok ? data.preview : null);
      if (!res.ok) setMsg(data.error || 'No se pudo calcular el preview');
    } finally { setPreviewing(false); }
  }, [headers]);

  function update(patch: Partial<WholesaleCampaign>) {
    setEditing(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      setDirty(true);
      if (previewTimer.current) clearTimeout(previewTimer.current);
      previewTimer.current = setTimeout(() => runPreview(next), 700);
      return next;
    });
  }

  function open(c: WholesaleCampaign | null) {
    const next = c ? JSON.parse(JSON.stringify(c)) as WholesaleCampaign : blankCampaign();
    setEditing(next); setDirty(false); setPreview(null); setResults(null); setMsg(''); setTab('editor');
    if (next.items.length) runPreview(next);
  }

  async function save(statusOverride?: WholesaleCampaign['status']) {
    if (!editing) return;
    const c = { ...editing, ...(statusOverride ? { status: statusOverride } : {}) };
    setSaving('saving'); setMsg('');
    try {
      const res = await fetch('/api/admin/wholesale-campaigns', { method: 'POST', headers, body: JSON.stringify({ campaigns: [c] }) });
      const data = await res.json();
      if (res.status === 409) { setSaving('error'); setMsg(`No se activó: ${(data.blockers ?? []).map((b: any) => `${b.name} — ${b.reason}`).join('; ')}`); return; }
      if (!res.ok) { setSaving('error'); setMsg(data.error + (data.problems ? ': ' + data.problems.map((p: any) => p.problems.map((q: any) => q.message).join(', ')).join('; ') : '')); return; }
      setList(data.campaigns ?? []); setOverlaps(data.overlaps ?? []);
      const saved = (data.campaigns as Listed[]).find(x => x.id === c.id);
      if (saved) setEditing(saved);
      setDirty(false); setSaving('saved');
      setTimeout(() => setSaving('idle'), 2000);
    } catch (e: any) { setSaving('error'); setMsg(e.message); }
  }

  async function remove(id: string) {
    if (!confirm('¿Borrar la campaña? No afecta las órdenes ya creadas.')) return;
    const res = await fetch('/api/admin/wholesale-campaigns', { method: 'POST', headers, body: JSON.stringify({ deleteIds: [id] }) });
    const data = await res.json();
    if (res.ok) { setList(data.campaigns ?? []); setEditing(null); }
  }

  async function loadResults(id: string) {
    setResults(null); setTab('resultados');
    const res = await fetch(`/api/admin/wholesale-campaigns/${id}/results`, { headers });
    if (res.ok) setResults(await res.json()); else setMsg('No se pudieron leer los resultados');
  }

  const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const previewRowById = useMemo(() => new Map((preview?.rows ?? []).map(r => [r.productId, r])), [preview]);
  const itemIds = useMemo(() => new Set((editing?.items ?? []).map(i => i.productId)), [editing]);
  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products.filter(p => !itemIds.has(p.id) && p.name.toLowerCase().includes(q)).slice(0, 12);
  }, [products, search, itemIds]);

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="bg-card border border-border p-8 w-full max-w-sm rounded-[10px]">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto mx-auto mb-6" />
          <p className="text-[13px] text-muted-foreground text-center mb-4">Clave de administrador</p>
          <input type="password" className="w-full border border-border-mid rounded-[8px] px-3 py-2 text-[13px] mb-3 bg-card text-foreground focus:outline-none focus:border-ring" placeholder="Clave admin" value={keyInput} onChange={e => setKeyInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} autoFocus />
          <button onClick={login} className="w-full bg-primary text-primary-foreground rounded-[8px] py-2 text-[13px] font-semibold hover:opacity-90">Entrar</button>
        </div>
      </div>
    );
  }

  const canActivate = !!editing && editing.items.length > 0 && !!preview && preview.activationBlockers.length === 0 && !previewing;
  const listed = editing ? list.find(x => x.id === editing.id) : undefined;

  return (
    <div>
      <div className="bg-card border-b border-border px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-10">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <a href="/admin/mayoristas" className="text-[12px] text-muted-foreground hover:text-foreground">← Clientes mayoristas</a>
          <span className="text-[14px] font-semibold text-foreground">Campañas mayoristas</span>
          <span className="text-[12px] text-muted-foreground hidden sm:inline">wholesale = PVP × 0,5 × (1 − extra). Nunca toca precios de Woo.</span>
        </div>
        <button onClick={() => open(null)} className="text-[12px] font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:opacity-90">+ Nueva campaña</button>
      </div>

      <div className="px-4 sm:px-6 py-5 space-y-6 max-w-[1400px]">
        {/* Lista */}
        <section className="bg-card border border-border rounded-[10px] overflow-hidden">
          {loading ? <div className="p-6 text-[13px] text-muted-foreground">Cargando…</div> : list.length === 0 ? (
            <div className="p-6 text-[13px] text-muted-foreground">Todavía no hay campañas. Creá la primera con “+ Nueva campaña”.</div>
          ) : (
            <div className="divide-y divide-border">
              {list.map(c => (
                <div key={c.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-muted/40 ${editing?.id === c.id ? 'bg-muted/40' : ''}`}>
                  <span className={`text-[10.5px] font-semibold tracking-wide px-2 py-0.5 rounded-[6px] border ${STATUS_STYLE[c.effectiveStatus]}`}>{STATUS_LABEL[c.effectiveStatus]}</span>
                  <button onClick={() => open(c)} className="text-[13px] font-semibold text-foreground hover:underline">{c.name}</button>
                  <span className="text-[12px] text-muted-foreground">{c.startsAt.slice(0, 10)} → {c.endsAt.slice(0, 10)} · {c.items.length} productos · {c.groups.map(g => Math.round(g.discount * 100) + '%').join(' / ')}</span>
                  {overlaps.some(o => o.campaigns.includes(c.id)) && <span className="text-[11px] text-warning">solapa productos con otra campaña activa</span>}
                  <div className="ml-auto flex items-center gap-2">
                    <button onClick={() => { open(c); loadResults(c.id); }} className="text-[12px] text-muted-foreground hover:text-foreground">Resultados</button>
                    <button onClick={() => open(c)} className="text-[12px] font-medium text-foreground">Editar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {editing && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setTab('editor')} className={`text-[12px] font-medium px-3 py-1.5 rounded-[8px] border ${tab === 'editor' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>Editor</button>
              <button onClick={() => loadResults(editing.id)} className={`text-[12px] font-medium px-3 py-1.5 rounded-[8px] border ${tab === 'resultados' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>Resultados</button>
              {listed && <span className={`ml-2 text-[10.5px] font-semibold tracking-wide px-2 py-0.5 rounded-[6px] border ${STATUS_STYLE[listed.effectiveStatus]}`}>{STATUS_LABEL[listed.effectiveStatus]}</span>}
              {msg && <span className="text-[12px] text-destructive">{msg}</span>}
            </div>

            {tab === 'editor' && (
              <div className="grid lg:grid-cols-[1fr_380px] gap-4 items-start">
                <div className="space-y-4">
                  {/* Datos */}
                  <div className="bg-card border border-border rounded-[10px] p-4 grid sm:grid-cols-2 gap-3">
                    <Field label="Nombre"><input className={inp} value={editing.name} onChange={e => update({ name: e.target.value, ...(editing.history.length === 0 && !listed ? { id: `wc_${editing.startsAt.slice(0, 7)}_${slugify(e.target.value) || 'nueva'}` } : {}) })} /></Field>
                    <Field label="Id (no cambia después de guardar)"><input className={inp} value={editing.id} disabled={!!listed} onChange={e => update({ id: e.target.value })} /></Field>
                    <Field label="Badge"><input className={inp} value={editing.badge} onChange={e => update({ badge: e.target.value })} placeholder="LIQUIDACIÓN" /></Field>
                    <Field label="Mínimo propio (vacío = general)"><input className={inp} type="number" value={editing.minOrder ?? ''} onChange={e => update({ minOrder: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
                    <Field label="Headline" full><input className={inp} value={editing.headline} onChange={e => update({ headline: e.target.value })} /></Field>
                    <Field label="Texto" full><textarea className={inp + ' min-h-[64px]'} value={editing.text} onChange={e => update({ text: e.target.value })} /></Field>
                    <Field label="Inicio (hora Argentina)"><input className={inp} type="datetime-local" value={toLocalInput(editing.startsAt)} onChange={e => update({ startsAt: fromLocalInput(e.target.value) })} /></Field>
                    <Field label="Fin (hora Argentina)"><input className={inp} type="datetime-local" value={toLocalInput(editing.endsAt)} onChange={e => update({ endsAt: fromLocalInput(e.target.value) })} /></Field>
                  </div>

                  {/* Grupos */}
                  <div className="bg-card border border-border rounded-[10px] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[12px] font-semibold text-foreground">Grupos de descuento</p>
                      <div className="flex gap-1">
                        {PRESETS.map(p => <button key={p.key} onClick={() => !editing.groups.some(g => g.key === p.key) && update({ groups: [...editing.groups, { ...p }] })} className="text-[11px] px-2 py-1 rounded-[6px] border border-border text-muted-foreground hover:border-border-mid">+ {p.label}</button>)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editing.groups.map(g => (
                        <div key={g.key} className="flex items-center gap-2 border border-border rounded-[8px] px-2 py-1">
                          <input className="w-24 text-[12px] bg-transparent focus:outline-none" value={g.label} onChange={e => update({ groups: editing.groups.map(x => x.key === g.key ? { ...x, label: e.target.value } : x) })} />
                          <input className="w-14 text-[12px] bg-transparent text-right focus:outline-none tabular-nums" type="number" min={0} max={60} value={Math.round(g.discount * 100)} onChange={e => update({ groups: editing.groups.map(x => x.key === g.key ? { ...x, discount: Math.min(0.6, Math.max(0, Number(e.target.value) / 100)) } : x) })} /><span className="text-[11px] text-muted-foreground">%</span>
                          <button onClick={() => update({ groups: editing.groups.filter(x => x.key !== g.key), items: editing.items.filter(i => i.group !== g.key) })} className="text-[11px] text-muted-foreground hover:text-destructive">×</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Productos */}
                  <div className="bg-card border border-border rounded-[10px] overflow-hidden">
                    <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2">
                      <p className="text-[12px] font-semibold text-foreground">Productos ({editing.items.length})</p>
                      <div className="relative ml-auto">
                        <input className={inp + ' w-64'} placeholder="Buscar producto para agregar…" value={search} onChange={e => setSearch(e.target.value)} />
                        {candidates.length > 0 && (
                          <div className="absolute z-20 mt-1 w-80 bg-card border border-border rounded-[8px] shadow-lg max-h-72 overflow-auto">
                            {candidates.map(p => (
                              <button key={p.id} onClick={() => { update({ items: [...editing.items, { productId: p.id, group: editing.groups[0]?.key ?? '' }] }); setSearch(''); }} className="w-full text-left px-3 py-2 text-[12px] hover:bg-muted flex justify-between gap-2">
                                <span className="truncate">{p.name}</span><span className="text-muted-foreground tabular-nums">{fmt(p.wholesalePrice)}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <label className="text-[11px] text-muted-foreground cursor-pointer border border-border rounded-[6px] px-2 py-1 hover:border-border-mid">
                        Cargar selección JSON
                        <input type="file" accept="application/json" className="hidden" onChange={async e => {
                          const f = e.target.files?.[0]; if (!f) return;
                          try { const j = JSON.parse(await f.text()); const c = j.campaign ?? j; update({ items: c.items ?? editing.items, groups: c.groups ?? editing.groups, ...(c.name ? { name: c.name } : {}), ...(c.headline ? { headline: c.headline } : {}), ...(c.text ? { text: c.text } : {}), ...(c.badge ? { badge: c.badge } : {}), ...(c.startsAt ? { startsAt: c.startsAt } : {}), ...(c.endsAt ? { endsAt: c.endsAt } : {}) }); }
                          catch { setMsg('JSON inválido'); }
                        }} />
                      </label>
                    </div>
                    <div className="hidden lg:grid grid-cols-[1fr_120px_80px_70px_90px_90px_110px_28px] gap-2 px-4 py-2 text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40">
                      <div>Producto</div><div>Grupo</div><div>Extra %</div><div className="text-right">Stock</div><div className="text-right">WS</div><div className="text-right">Promo</div><div>Riesgo</div><div />
                    </div>
                    {editing.items.length === 0 && <div className="px-4 py-6 text-[12px] text-muted-foreground">Sin productos. Buscá arriba o cargá el JSON de la selección.</div>}
                    {editing.items.map(it => {
                      const p = productById.get(it.productId); const row = previewRowById.get(it.productId);
                      const group = editing.groups.find(g => g.key === it.group);
                      return (
                        <div key={it.productId} className="grid grid-cols-2 lg:grid-cols-[1fr_120px_80px_70px_90px_90px_110px_28px] gap-2 px-4 py-2 items-center border-t border-border text-[12px]">
                          <div className="truncate col-span-2 lg:col-span-1 font-medium text-foreground">{p?.name ?? row?.name ?? `#${it.productId}`}{it.note && <span className="ml-2 text-[11px] text-muted-foreground">{it.note}</span>}</div>
                          <select value={it.group} onChange={e => update({ items: editing.items.map(x => x.productId === it.productId ? { ...x, group: e.target.value } : x) })} className="text-[12px] rounded-[6px] px-2 py-1 border border-border bg-card">
                            {editing.groups.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
                          </select>
                          <input className="text-[12px] rounded-[6px] px-2 py-1 border border-border bg-card w-full tabular-nums" type="number" placeholder={group ? String(Math.round(group.discount * 100)) : ''} value={it.discount != null ? Math.round(it.discount * 100) : ''} onChange={e => update({ items: editing.items.map(x => x.productId === it.productId ? { ...x, discount: e.target.value === '' ? undefined : Math.min(0.6, Math.max(0, Number(e.target.value) / 100)) } : x) })} />
                          <div className="text-right tabular-nums text-muted-foreground">{row ? (row.stock ?? 's/g') : '…'}</div>
                          <div className="text-right tabular-nums">{fmt(row?.wsRegular ?? p?.wholesalePrice)}</div>
                          <div className="text-right tabular-nums font-semibold">{row ? fmt(row.wsPromo) : '…'}</div>
                          <div className="flex items-center gap-1">
                            {row && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-[5px] border ${RISK_STYLE[row.risk]}`}>{row.risk === 'NOT_WHOLESALE' ? '—' : row.risk}</span>}
                            {row?.risk === 'CRITICAL' && <label className="text-[10px] text-destructive flex items-center gap-1"><input type="checkbox" checked={!!it.acceptCritical} onChange={e => update({ items: editing.items.map(x => x.productId === it.productId ? { ...x, acceptCritical: e.target.checked } : x) })} />acepto</label>}
                          </div>
                          <button onClick={() => update({ items: editing.items.filter(x => x.productId !== it.productId) })} className="text-muted-foreground hover:text-destructive">×</button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Preview + acciones */}
                <div className="space-y-3 lg:sticky lg:top-16">
                  <div className="bg-card border border-border rounded-[10px] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[12px] font-semibold text-foreground">Preview financiero</p>
                      <span className="text-[11px] text-muted-foreground">{previewing ? 'calculando…' : preview ? 'Woo en vivo' : '—'}</span>
                    </div>
                    {preview ? (
                      <div className="text-[12.5px] space-y-1 tabular-nums">
                        <Row k="Productos / unidades" v={`${preview.totals.products} / ${preview.totals.units}`} />
                        <Row k="Valor a mayorista normal" v={fmt(preview.totals.valueNormal)} />
                        <Row k="Valor promo" v={fmt(preview.totals.valuePromo)} strong />
                        <Row k="Descuento otorgado" v={`−${fmt(preview.totals.discountTotal)}`} />
                        <Row k={`COGS conocido (${preview.totals.productsWithCost}/${preview.totals.products})`} v={fmt(preview.totals.cogsKnown)} />
                        <Row k="Margen conocido" v={`${fmt(preview.totals.marginKnown)} · ${pct(preview.totals.marginKnownPct)}`} />
                        <div className="pt-2 mt-2 border-t border-border space-y-1">
                          {Object.entries(preview.byGroup).map(([k, g]) => <Row key={k} k={`${editing.groups.find(x => x.key === k)?.label ?? k}`} v={`${g.products} prod · ${g.units} u · ${fmt(g.valuePromo)}`} />)}
                        </div>
                        <div className="pt-2 mt-2 border-t border-border flex flex-wrap gap-1.5">
                          <Chip n={preview.costUnknown.length} label="COST_UNKNOWN" cls={RISK_STYLE.COST_UNKNOWN} />
                          <Chip n={preview.risk.length} label="RISK" cls={RISK_STYLE.RISK} />
                          <Chip n={preview.critical.length} label="CRITICAL" cls={RISK_STYLE.CRITICAL} />
                          {preview.excluded.length > 0 && <Chip n={preview.excluded.length} label="fuera del mayorista" cls={RISK_STYLE.NOT_WHOLESALE} />}
                          {preview.unmanaged.length > 0 && <Chip n={preview.unmanaged.length} label="sin gestión de stock" cls={RISK_STYLE.NOT_WHOLESALE} />}
                        </div>
                        {preview.activationBlockers.length > 0 && <p className="text-[11.5px] text-destructive mt-2">Bloquea la activación: {preview.activationBlockers.map(b => b.name).join(', ')}. Tildá “acepto” en cada uno para incluirlos igual.</p>}
                      </div>
                    ) : <p className="text-[12px] text-muted-foreground">Agregá productos para ver unidades, valor y margen.</p>}
                  </div>

                  <div className="bg-card border border-border rounded-[10px] p-4 flex flex-wrap gap-2">
                    <button onClick={() => save()} disabled={saving === 'saving'} className="text-[12px] font-semibold px-3 py-1.5 rounded-[8px] bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">{saving === 'saving' ? 'Guardando…' : saving === 'saved' ? 'Guardado' : dirty ? 'Guardar cambios' : 'Guardar'}</button>
                    {editing.status !== 'active' && <button onClick={() => save('active')} disabled={!canActivate || saving === 'saving'} title={!canActivate ? 'Necesita productos y un preview sin CRITICAL pendientes' : ''} className="text-[12px] font-semibold px-3 py-1.5 rounded-[8px] border border-success/40 text-success bg-success-soft hover:opacity-90 disabled:opacity-40">Activar</button>}
                    {editing.status === 'active' && <button onClick={() => save('draft')} className="text-[12px] font-semibold px-3 py-1.5 rounded-[8px] border border-warning/40 text-warning bg-warning-soft">Desactivar (a borrador)</button>}
                    {editing.status === 'active' && <button onClick={() => save('ended')} className="text-[12px] font-medium px-3 py-1.5 rounded-[8px] border border-border text-muted-foreground">Terminar ahora</button>}
                    <button onClick={() => open({ ...editing, id: editing.id + '-copia', name: editing.name + ' (copia)', status: 'draft', history: [], activatedAt: null, endedAt: null })} className="text-[12px] font-medium px-3 py-1.5 rounded-[8px] border border-border text-muted-foreground">Duplicar</button>
                    {listed && <button onClick={() => remove(editing.id)} className="ml-auto text-[12px] text-muted-foreground hover:text-destructive">Borrar</button>}
                    <p className="w-full text-[11px] text-muted-foreground mt-1">Activar corre el preview con Woo en vivo, guarda la foto de stock y deja la campaña vigente entre sus fechas. Al vencer vuelve sola al precio normal.</p>
                  </div>

                  {editing.history.length > 0 && (
                    <div className="bg-card border border-border rounded-[10px] p-4 text-[11.5px] text-muted-foreground space-y-1">
                      {editing.history.slice(-6).reverse().map((h, i) => <div key={i}>{h.at.slice(0, 16).replace('T', ' ')} · {h.from} → {h.to}{h.by ? ` · ${h.by}` : ''}{(h as any).stockSnapshot ? ' · foto de stock' : ''}</div>)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'resultados' && (
              <div className="bg-card border border-border rounded-[10px] p-4">
                {!results ? <p className="text-[12px] text-muted-foreground">Leyendo órdenes de Woo…</p> : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                      <Kpi k="Revenue" v={fmt(results.results.revenue)} />
                      <Kpi k="Pedidos" v={String(results.results.orders)} />
                      <Kpi k="Unidades" v={String(results.results.units)} />
                      <Kpi k="AOV" v={fmt(results.results.aov)} />
                      <Kpi k="Descuento otorgado" v={fmt(results.results.discountTotal)} />
                      <Kpi k="Margen conocido" v={`${fmt(results.results.marginKnown)}${results.results.unitsCostUnknown ? ` · ${results.results.unitsCostUnknown} u s/costo` : ''}`} />
                      <Kpi k="First-time" v={String(results.results.firstTimeBuyers.length)} />
                      <Kpi k="Reactivados" v={String(results.results.reactivated.length)} />
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[12px]">
                      {Object.entries(results.results.byGroup).map(([k, g]) => (
                        <div key={k} className="border border-border rounded-[8px] p-3"><p className="font-semibold">{editing.groups.find(x => x.key === k)?.label ?? k}</p><p className="text-muted-foreground">{g.orders} pedidos · {g.units} u · {fmt(g.revenue)} · desc. {fmt(g.discount)}</p></div>
                      ))}
                      <div className="border border-border rounded-[8px] p-3"><p className="font-semibold">Sin promo (mixtos)</p><p className="text-muted-foreground">{results.results.noPromo.units} u · {fmt(results.results.noPromo.revenue)}</p></div>
                      <div className="border border-border rounded-[8px] p-3"><p className="font-semibold">Pendientes de pago</p><p className="text-muted-foreground">{results.results.pending.orders} pedidos · {fmt(results.results.pending.total)} (no suman)</p></div>
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold mb-1">Stock liquidado por producto</p>
                      <div className="text-[12px] divide-y divide-border">
                        {results.results.products.map(p => {
                          const snap = results.stockSnapshot?.[String(p.productId)];
                          return <div key={p.productId} className="flex justify-between gap-3 py-1"><span className="truncate">{p.name}{p.group ? <span className="ml-2 text-[10.5px] text-muted-foreground">{editing.groups.find(x => x.key === p.group)?.label ?? p.group}</span> : null}</span><span className="tabular-nums text-muted-foreground whitespace-nowrap">{p.units} u{snap != null ? ` de ${snap}` : ''} · {fmt(p.revenue)}</span></div>;
                        })}
                        {results.results.products.length === 0 && <p className="text-muted-foreground py-2">Todavía no hay pedidos pagados bajo esta campaña.</p>}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Calculado desde {results.ordersScanned} órdenes mayoristas de Woo (pagadas = processing/completed). Órdenes #{results.results.paidOrderIds.join(', #') || '—'}.</p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

const inp = 'w-full text-[12.5px] rounded-[8px] px-2.5 py-1.5 border border-border bg-card text-foreground focus:outline-none focus:border-ring';
function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <label className={`block ${full ? 'sm:col-span-2' : ''}`}><span className="block text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1">{label}</span>{children}</label>;
}
function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return <div className="flex justify-between gap-3"><span className="text-muted-foreground">{k}</span><span className={strong ? 'font-semibold text-foreground' : ''}>{v}</span></div>;
}
function Chip({ n, label, cls }: { n: number; label: string; cls: string }) {
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-[5px] border ${cls}`}>{n} {label}</span>;
}
function Kpi({ k, v }: { k: string; v: string }) {
  return <div className="border border-border rounded-[8px] p-3"><p className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{k}</p><p className="text-[14px] font-semibold tabular-nums text-foreground">{v}</p></div>;
}
