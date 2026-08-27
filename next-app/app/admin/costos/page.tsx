'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  CostProfile, CostComponent, unitCostOf, isConfigured, normalizeProfiles,
  newComponentId, COST_TEMPLATES, profileFromTemplate,
} from '@/lib/cost-profiles';

const WP_SECRET_KEY = 'hype_admin_key';

type Product = { id: number; name: string; image: string; categories: string[]; price: number; profileId: string };
type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type ProfileFilter = 'all' | 'configured' | 'nocost' | 'incomplete';

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

export default function CostosPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed]     = useState(false);
  const [keyInput, setKeyInput] = useState('');

  const [profiles, setProfiles] = useState<CostProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);

  // Estado de guardado y despliegue por perfil.
  const [saveState, setSaveState] = useState<Record<string, SaveState>>({});
  const [open, setOpen]           = useState<Record<string, boolean>>({});

  const [profileSearch, setProfileSearch] = useState('');
  const [profileFilter, setProfileFilter] = useState<ProfileFilter>('all');
  const [showTemplates, setShowTemplates] = useState(false);

  // Sección productos (asignación perfil ↔ producto) — sin cambios de fondo.
  const [selected, setSelected]           = useState<Set<number>>(new Set());
  const [bulkProfileId, setBulkProfileId] = useState('');
  const [bulkSaving, setBulkSaving]       = useState(false);
  const [bulkMsg, setBulkMsg]             = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch]                 = useState('');
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(WP_SECRET_KEY);
    if (stored) { setAdminKey(stored); setAuthed(true); }
    // Deep-link "Productos sin costo" desde Dashboard/Finanzas.
    if (typeof window !== 'undefined' && window.location.hash === '#sin-costo') setOnlyUnassigned(true);
  }, []);

  const loadAll = useCallback(async (key: string) => {
    setLoading(true);
    try {
      const [profRes, prodRes] = await Promise.all([
        fetch('/api/admin/cost-profiles', { headers: { 'x-admin-key': key } }),
        fetch('/api/admin/product-costs', { headers: { 'x-admin-key': key } }),
      ]);
      if (profRes.status === 403 || prodRes.status === 403) { setAuthed(false); sessionStorage.removeItem(WP_SECRET_KEY); return; }
      const profData = await profRes.json();
      const prodData = await prodRes.json();
      // Normaliza legacy → V2 al leer (defensivo: el PHP ya normaliza, pero así
      // funciona aunque el deploy del PHP no esté todavía).
      setProfiles(normalizeProfiles(profData.profiles || []));
      setProducts(prodData.products || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed && adminKey) loadAll(adminKey);
  }, [authed, adminKey, loadAll]);

  function login() {
    sessionStorage.setItem(WP_SECRET_KEY, keyInput);
    setAdminKey(keyInput);
    setAuthed(true);
  }

  // ── Perfiles de costo (V2) ──────────────────────────────────────────────
  const setSave = (id: string, s: SaveState) => setSaveState(prev => ({ ...prev, [id]: s }));

  function patchProfile(id: string, fn: (p: CostProfile) => CostProfile) {
    setProfiles(prev => prev.map(p => {
      if (p.id !== id) return p;
      const next = fn(p);
      return { ...next, unitCost: unitCostOf(next.components) };
    }));
    setSave(id, 'idle');
  }

  const renameProfile = (id: string, name: string) => patchProfile(id, p => ({ ...p, name }));
  const renameComponent = (id: string, cid: string, label: string) =>
    patchProfile(id, p => ({ ...p, components: p.components.map(c => c.id === cid ? { ...c, label } : c) }));
  const setComponentAmount = (id: string, cid: string, raw: string) =>
    patchProfile(id, p => ({ ...p, components: p.components.map(c => c.id === cid ? { ...c, amount: Math.max(0, parseFloat(raw) || 0) } : c) }));
  const addComponent = (id: string) =>
    patchProfile(id, p => ({ ...p, components: [...p.components, { id: newComponentId(), label: '', amount: 0 }] }));
  const removeComponent = (id: string, cid: string) =>
    patchProfile(id, p => ({ ...p, components: p.components.filter(c => c.id !== cid) }));
  function moveComponent(id: string, idx: number, dir: -1 | 1) {
    patchProfile(id, p => {
      const arr = [...p.components];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return p;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return { ...p, components: arr };
    });
  }

  function addProfileFromTemplate(templateKey: string) {
    const t = COST_TEMPLATES.find(x => x.key === templateKey) || COST_TEMPLATES[COST_TEMPLATES.length - 1];
    const prof = profileFromTemplate(t, 'Nuevo perfil');
    setProfiles(prev => [prof, ...prev]);
    setOpen(prev => ({ ...prev, [prof.id]: true }));
    setSave(prof.id, 'idle');
    setShowTemplates(false);
  }

  async function removeProfile(id: string) {
    const p = profiles.find(x => x.id === id);
    if (products.some(pr => pr.profileId === id)) {
      if (!confirm(`Hay productos usando "${p?.name}". ¿Eliminar igual? Quedarán sin costo asignado.`)) return;
    }
    const next = profiles.filter(x => x.id !== id);
    setProfiles(next);
    await persist(next, id);
  }

  // Guardado por perfil: persiste el array completo (el endpoint reemplaza la
  // option) pero el feedback es de ESA card. Un único admin edita de a una card,
  // así que no hay riesgo de pisar cambios concurrentes.
  async function persist(list: CostProfile[], focusId: string) {
    setSave(focusId, 'saving');
    try {
      const res = await fetch('/api/admin/cost-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ profiles: list }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.profiles) setProfiles(normalizeProfiles(data.profiles));
      setSave(focusId, 'saved');
      setTimeout(() => setSave(focusId, 'idle'), 2500);
    } catch {
      setSave(focusId, 'error');
    }
  }
  const saveProfile = (id: string) => persist(profiles, id);

  // ── Productos ───────────────────────────────────────────────────────────
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => p.categories.forEach(c => set.add(c)));
    return [...set].sort();
  }, [products]);

  const visibleProducts = useMemo(() => products.filter(p => {
    if (categoryFilter !== 'all' && !p.categories.includes(categoryFilter)) return false;
    if (onlyUnassigned && p.profileId) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [products, categoryFilter, onlyUnassigned, search]);

  const assignedCount = products.filter(p => p.profileId).length;
  const usageCount = useMemo(() => {
    const m: Record<string, number> = {};
    products.forEach(p => { if (p.profileId) m[p.profileId] = (m[p.profileId] || 0) + 1; });
    return m;
  }, [products]);

  const visibleProfiles = useMemo(() => profiles.filter(p => {
    if (profileSearch && !p.name.toLowerCase().includes(profileSearch.toLowerCase())) return false;
    const configured = isConfigured(p);
    if (profileFilter === 'configured' && !configured) return false;
    if (profileFilter === 'nocost' && configured) return false;
    if (profileFilter === 'incomplete' && !(configured && p.components.some(c => !c.label.trim() || c.amount <= 0))) return false;
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name, 'es')), [profiles, profileSearch, profileFilter]);

  const noCostCount = profiles.filter(p => !isConfigured(p)).length;

  function toggleSelect(id: number) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleSelectAll() {
    setSelected(prev => prev.size === visibleProducts.length ? new Set() : new Set(visibleProducts.map(p => p.id)));
  }
  async function assignProfile(productIds: number[], profileId: string) {
    const res = await fetch('/api/admin/product-costs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ productIds, profileId }),
    });
    if (res.ok) setProducts(prev => prev.map(p => (productIds.includes(p.id) ? { ...p, profileId } : p)));
    return res.ok;
  }
  async function applyBulk() {
    if (selected.size === 0) return;
    setBulkSaving(true); setBulkMsg('');
    const ok = await assignProfile([...selected], bulkProfileId);
    setBulkMsg(ok ? `Asignado a ${selected.size} producto${selected.size > 1 ? 's' : ''}` : 'Error al asignar');
    setBulkSaving(false); setSelected(new Set());
    setTimeout(() => setBulkMsg(''), 3000);
  }
  const profileById = (id: string) => profiles.find(p => p.id === id);

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="bg-card border border-border p-8 w-full max-w-sm rounded-[10px]">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto mx-auto mb-6" />
          <p className="text-[13px] text-muted-foreground text-center mb-4">Clave de administrador</p>
          <input type="password" className="w-full border border-border-mid rounded-[8px] px-3 py-2 text-[13px] mb-3 bg-card text-foreground focus:outline-none focus:border-ring"
            placeholder="Clave admin" value={keyInput} onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()} autoFocus />
          <button onClick={login} className="w-full bg-primary text-primary-foreground rounded-[8px] py-2 text-[13px] font-semibold hover:opacity-90">Entrar</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-card border-b border-border px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-10">
        <div className="flex items-baseline gap-3">
          <span className="text-[15px] font-semibold text-foreground tracking-tight">Costos y márgenes</span>
          <span className="text-[12px] text-muted-foreground hidden sm:inline">{assignedCount} de {products.length} productos con costo</span>
        </div>
        <button onClick={() => { sessionStorage.removeItem(WP_SECRET_KEY); setAuthed(false); setAdminKey(''); }}
          className="text-[11px] text-muted-foreground/70 hover:text-foreground px-2 py-1 rounded hover:bg-muted">Salir</button>
      </div>

      <div className="max-w-[1180px] mx-auto px-4 py-6 space-y-8">
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[120px] bg-muted/40 rounded-[10px] animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* ── PERFILES DE COSTO ─────────────────────────────────────── */}
            <section>
              <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-[16px] font-semibold text-foreground tracking-tight">Perfiles de costo</h2>
                  <p className="text-[12.5px] text-muted-foreground mt-0.5 max-w-xl">
                    Cada perfil arma su propio costo con los componentes que realmente usa. El costo unitario es la suma — una sola fuente de verdad.
                  </p>
                </div>
                <div className="relative">
                  <button onClick={() => setShowTemplates(v => !v)}
                    className="text-[12.5px] font-semibold px-3.5 py-2 rounded-[8px] bg-primary text-primary-foreground hover:opacity-90">
                    + Nuevo perfil
                  </button>
                  {showTemplates && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowTemplates(false)} />
                      <div className="absolute right-0 mt-1.5 w-64 bg-popover border border-border rounded-[10px] shadow-lg z-20 overflow-hidden">
                        {COST_TEMPLATES.map(t => (
                          <button key={t.key} onClick={() => addProfileFromTemplate(t.key)}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-muted border-b border-border last:border-0">
                            <p className="text-[12.5px] font-medium text-foreground">{t.name}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{t.hint}</p>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Buscador + filtros */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <input value={profileSearch} onChange={e => setProfileSearch(e.target.value)} placeholder="Buscar perfil…"
                  className="border border-border bg-card text-foreground rounded-[8px] px-3 py-1.5 text-[12.5px] focus:outline-none focus:border-border-mid w-full sm:w-[220px]" />
                <div className="flex items-center gap-1 text-[12px]">
                  {([
                    ['all', `Todos (${profiles.length})`],
                    ['configured', 'Con costo'],
                    ['nocost', `Sin costo${noCostCount ? ` (${noCostCount})` : ''}`],
                    ['incomplete', 'Incompletos'],
                  ] as [ProfileFilter, string][]).map(([k, label]) => (
                    <button key={k} onClick={() => setProfileFilter(k)}
                      className={`px-2.5 py-1.5 rounded-[8px] border ${profileFilter === k ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:border-border-mid'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {visibleProfiles.length === 0 ? (
                <div className="text-[12.5px] text-muted-foreground text-center py-10 border border-dashed border-border rounded-[10px]">
                  {profiles.length === 0 ? 'No hay perfiles todavía. Creá el primero con “+ Nuevo perfil”.' : 'Ningún perfil coincide con el filtro.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {visibleProfiles.map(profile => {
                    const st = saveState[profile.id] || 'idle';
                    const isOpen = open[profile.id] ?? false;
                    const configured = isConfigured(profile);
                    const uses = usageCount[profile.id] || 0;
                    return (
                      <div key={profile.id} className="bg-card border border-border rounded-[10px] flex flex-col">
                        {/* Cabecera de la card (siempre visible) */}
                        <button onClick={() => setOpen(prev => ({ ...prev, [profile.id]: !isOpen }))}
                          className="flex items-center gap-2 px-4 pt-3.5 pb-3 text-left">
                          <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 text-muted-foreground/60 flex-none transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13.5px] font-semibold text-foreground truncate">{profile.name || 'Sin nombre'}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {configured ? `${profile.components.length} componente${profile.components.length > 1 ? 's' : ''}` : 'Sin costo'}
                              {uses > 0 && <span className="text-muted-foreground/60"> · {uses} producto{uses > 1 ? 's' : ''}</span>}
                            </p>
                          </div>
                          <div className="text-right flex-none">
                            <p className="text-[15px] font-bold text-foreground tabular-nums">{configured ? fmt(profile.unitCost) : '—'}</p>
                          </div>
                        </button>

                        {isOpen && (
                          <div className="px-4 pb-4 border-t border-border pt-3">
                            {/* Nombre editable */}
                            <label className="block text-[10.5px] uppercase tracking-wider text-muted-foreground/70 mb-1">Nombre</label>
                            <input value={profile.name} onChange={e => renameProfile(profile.id, e.target.value)}
                              className="w-full text-[13px] font-medium text-foreground border border-border bg-card rounded-[8px] px-2.5 py-1.5 mb-3 focus:outline-none focus:border-border-mid" />

                            {/* Componentes */}
                            <div className="space-y-1.5">
                              {profile.components.map((c, idx) => (
                                <ComponentRow key={c.id} c={c} idx={idx} total={profile.components.length}
                                  onLabel={v => renameComponent(profile.id, c.id, v)}
                                  onAmount={v => setComponentAmount(profile.id, c.id, v)}
                                  onRemove={() => removeComponent(profile.id, c.id)}
                                  onMove={dir => moveComponent(profile.id, idx, dir)} />
                              ))}
                              {profile.components.length === 0 && (
                                <p className="text-[11.5px] text-muted-foreground text-center py-3 border border-dashed border-border rounded-[8px]">
                                  Perfil vacío — sin costo conocido. Agregá un componente.
                                </p>
                              )}
                            </div>

                            <button onClick={() => addComponent(profile.id)}
                              className="mt-2 text-[12px] font-medium text-foreground/80 hover:text-foreground flex items-center gap-1.5">
                              <span className="grid place-items-center w-4 h-4 rounded-full border border-border-mid text-[11px] leading-none">+</span> Agregar costo
                            </button>

                            {/* Total */}
                            <div className="flex items-baseline justify-between mt-3 pt-3 border-t border-border">
                              <span className="text-[11.5px] text-muted-foreground">Costo unitario</span>
                              <span className="text-[16px] font-bold text-foreground tabular-nums">{fmt(profile.unitCost)}</span>
                            </div>

                            {/* Acciones */}
                            <div className="flex items-center gap-2 mt-3">
                              <button onClick={() => saveProfile(profile.id)} disabled={st === 'saving'}
                                className="text-[12px] font-semibold px-3 py-1.5 rounded-[8px] bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
                                {st === 'saving' ? 'Guardando…' : 'Guardar'}
                              </button>
                              <span className={`text-[11.5px] ${st === 'saved' ? 'text-success' : st === 'error' ? 'text-destructive' : 'text-transparent'}`}>
                                {st === 'saved' ? 'Guardado' : st === 'error' ? 'Error al guardar' : '·'}
                              </span>
                              <button onClick={() => removeProfile(profile.id)}
                                className="ml-auto text-[11.5px] text-muted-foreground/70 hover:text-destructive">Eliminar perfil</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── PRODUCTOS ─────────────────────────────────────────────── */}
            <section id="sin-costo">
              <div className="bg-card border border-border rounded-[10px] overflow-hidden">
                <div className="px-4 sm:px-5 py-3 border-b border-border flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                  <h2 className="text-[15px] font-semibold text-foreground tracking-tight">Productos</h2>
                  <div className="flex flex-wrap gap-2">
                    <input type="text" placeholder="Buscar producto…" value={search} onChange={e => setSearch(e.target.value)}
                      className="border border-border bg-card text-foreground rounded-[8px] px-2.5 py-1.5 text-[12px] focus:outline-none focus:border-border-mid w-full sm:w-[160px]" />
                    <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                      className="border border-border bg-card text-foreground rounded-[8px] px-2.5 py-1.5 text-[12px] focus:outline-none focus:border-border-mid">
                      <option value="all">Todas las categorías</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button onClick={() => setOnlyUnassigned(v => !v)}
                      className={`text-[12px] font-medium px-2.5 py-1.5 rounded-[8px] border ${onlyUnassigned ? 'bg-warning-soft border-warning/40 text-warning' : 'border-border text-muted-foreground hover:border-border-mid'}`}>
                      Sin costo
                    </button>
                  </div>
                </div>

                {selected.size > 0 && (
                  <div className="flex items-center gap-3 px-4 sm:px-5 py-2.5 bg-primary text-primary-foreground">
                    <span className="text-[13px] font-medium">{selected.size} seleccionado{selected.size > 1 ? 's' : ''}</span>
                    <select value={bulkProfileId} onChange={e => setBulkProfileId(e.target.value)}
                      className="text-[12px] bg-card text-foreground rounded-[8px] px-2 py-1 focus:outline-none">
                      <option value="">Asignar perfil…</option>
                      {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <button onClick={applyBulk} disabled={!bulkProfileId || bulkSaving}
                      className="text-[12px] font-semibold bg-card text-foreground px-3 py-1 rounded-[8px] hover:bg-muted disabled:opacity-50">
                      {bulkSaving ? 'Aplicando…' : 'Aplicar'}
                    </button>
                    {bulkMsg && <span className="text-[11px] text-primary-foreground/70">{bulkMsg}</span>}
                    <button onClick={() => setSelected(new Set())} className="ml-auto text-[11px] text-primary-foreground/70 hover:text-primary-foreground">Cancelar</button>
                  </div>
                )}

                <div className="hidden lg:grid grid-cols-[32px_56px_1.5fr_110px_90px_1fr_90px_64px] gap-3 px-4 py-2 border-b border-border bg-muted/40">
                  <div><input type="checkbox" checked={selected.size > 0 && selected.size === visibleProducts.length} onChange={toggleSelectAll} className="cursor-pointer" /></div>
                  <div />
                  {['Producto', 'Categoría', 'Precio', 'Perfil de costo', 'Margen $', 'Margen %'].map((h, i) => (
                    <div key={h} className={`text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider ${i >= 2 && i !== 3 ? 'text-right' : ''} ${i === 2 || i === 4 ? '' : ''}`}>{h}</div>
                  ))}
                </div>

                {visibleProducts.map(product => {
                  const profile = profileById(product.profileId);
                  const hasCost = !!profile && isConfigured(profile);
                  const cost = profile?.unitCost ?? 0;
                  const margin = hasCost ? product.price - cost : null;
                  const marginPct = margin !== null && product.price > 0 ? (margin / product.price) * 100 : null;
                  return (
                    <div key={product.id}
                      className={`grid grid-cols-[24px_40px_1fr_auto] gap-x-3 gap-y-1 lg:gap-y-0 lg:grid-cols-[32px_56px_1.5fr_110px_90px_1fr_90px_64px] px-4 py-2.5 items-center border-b border-border hover:bg-muted/40 ${!product.profileId ? 'bg-warning-soft/30' : ''}`}>
                      <input type="checkbox" checked={selected.has(product.id)} onChange={() => toggleSelect(product.id)} className="cursor-pointer col-start-1 row-start-1 lg:col-start-auto lg:row-start-auto" />
                      {product.image
                        ? <img src={product.image} alt="" className="w-9 h-9 rounded-[6px] object-cover border border-border col-start-2 row-start-1 row-span-2 lg:row-span-1 lg:col-start-auto lg:row-start-auto" />
                        : <div className="w-9 h-9 rounded-[6px] bg-muted col-start-2 row-start-1 row-span-2 lg:row-span-1 lg:col-start-auto lg:row-start-auto" />}
                      <div className="text-[12.5px] font-medium text-foreground truncate col-start-3 row-start-1 lg:col-start-auto lg:row-start-auto">{product.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate col-start-3 col-span-2 row-start-2 lg:col-span-1 lg:col-start-auto lg:row-start-auto">{product.categories.join(', ')}</div>
                      <div className="text-[12.5px] text-foreground/80 text-right col-start-4 row-start-1 lg:col-start-auto lg:row-start-auto tabular-nums">{fmt(product.price)}</div>
                      <select value={product.profileId} onChange={e => assignProfile([product.id], e.target.value)}
                        className={`text-[12px] rounded-[8px] px-2 py-1 border bg-card focus:outline-none col-start-3 col-span-2 row-start-3 lg:col-span-1 lg:col-start-auto lg:row-start-auto ${product.profileId ? 'border-border text-foreground' : 'border-warning/40 text-warning font-medium'}`}>
                        <option value="">Sin asignar</option>
                        {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <div className={`text-[12.5px] text-right font-medium tabular-nums col-start-3 row-start-4 lg:col-start-auto lg:row-start-auto ${margin === null ? 'text-muted-foreground/50' : margin < 0 ? 'text-destructive' : 'text-foreground'}`}>{margin === null ? '—' : fmt(margin)}</div>
                      <div className={`text-[12.5px] text-right font-medium tabular-nums col-start-4 row-start-4 lg:col-start-auto lg:row-start-auto ${marginPct === null ? 'text-muted-foreground/50' : marginPct < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{marginPct === null ? '—' : `${marginPct.toFixed(0)}%`}</div>
                    </div>
                  );
                })}
                {visibleProducts.length === 0 && <div className="text-center py-14 text-[13px] text-muted-foreground">No hay productos que coincidan con el filtro.</div>}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

// Fila de componente: label editable, monto, reordenar, borrar.
function ComponentRow({ c, idx, total, onLabel, onAmount, onRemove, onMove }: {
  c: CostComponent; idx: number; total: number;
  onLabel: (v: string) => void; onAmount: (v: string) => void; onRemove: () => void; onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 group">
      <div className="flex flex-col flex-none">
        <button onClick={() => onMove(-1)} disabled={idx === 0} title="Subir"
          className="text-muted-foreground/40 hover:text-foreground disabled:opacity-20 h-3 leading-none"><svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 15l6-6 6 6" /></svg></button>
        <button onClick={() => onMove(1)} disabled={idx === total - 1} title="Bajar"
          className="text-muted-foreground/40 hover:text-foreground disabled:opacity-20 h-3 leading-none"><svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg></button>
      </div>
      <input value={c.label} onChange={e => onLabel(e.target.value)} placeholder="Nombre del costo"
        className="flex-1 min-w-0 text-[12.5px] text-foreground bg-transparent border border-transparent hover:border-border focus:border-border-mid rounded-[6px] px-2 py-1 focus:outline-none" />
      <div className="relative flex-none w-[104px]">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground/60">$</span>
        <input type="number" min={0} value={c.amount === 0 ? '' : c.amount} placeholder="0" onChange={e => onAmount(e.target.value)}
          className="w-full text-[12.5px] text-foreground text-right tabular-nums bg-card border border-border rounded-[6px] pl-5 pr-2 py-1 focus:outline-none focus:border-border-mid" />
      </div>
      <button onClick={onRemove} title="Eliminar" className="flex-none text-muted-foreground/30 hover:text-destructive p-1">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </button>
    </div>
  );
}
