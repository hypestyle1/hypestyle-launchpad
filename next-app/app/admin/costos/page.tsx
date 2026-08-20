'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';

const WP_SECRET_KEY = 'hype_admin_key';

const COMPONENT_FIELDS: { key: string; label: string }[] = [
  { key: 'tela',          label: 'Tela' },
  { key: 'corte',         label: 'Corte' },
  { key: 'confeccion',    label: 'Confección' },
  { key: 'estampa',       label: 'Estampa' },
  { key: 'avios',         label: 'Avíos' },
  { key: 'planchaybolsa', label: 'Plancha y bolsa' },
  { key: 'ecommerce',     label: 'Ecommerce' },
  { key: 'tarjetayperfume', label: 'Tarjeta y perfume' },
];

type CostProfile = { id: string; name: string; components: Record<string, number>; unitCost: number };
type Product = { id: number; name: string; image: string; categories: string[]; price: number; profileId: string };

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

function newProfileId() {
  return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function sumComponents(components: Record<string, number>) {
  return Object.values(components).reduce((s, v) => s + (Number(v) || 0), 0);
}

export default function CostosPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed]     = useState(false);
  const [keyInput, setKeyInput] = useState('');

  const [profiles, setProfiles]           = useState<CostProfile[]>([]);
  const [products, setProducts]           = useState<Product[]>([]);
  const [loading, setLoading]             = useState(true);
  const [savingProfiles, setSavingProfiles] = useState(false);
  const [profilesMsg, setProfilesMsg]     = useState('');

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
      setProfiles(profData.profiles || []);
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

  // ── Perfiles de costo ──────────────────────────────────────────────────
  function updateProfileField(id: string, field: 'name' | string, value: string, isComponent: boolean) {
    setProfiles(prev => prev.map(p => {
      if (p.id !== id) return p;
      if (!isComponent) return { ...p, name: value };
      const components = { ...p.components, [field]: parseFloat(value) || 0 };
      return { ...p, components, unitCost: sumComponents(components) };
    }));
  }

  function addProfile() {
    const components = Object.fromEntries(COMPONENT_FIELDS.map(f => [f.key, 0]));
    setProfiles(prev => [...prev, { id: newProfileId(), name: 'Nuevo perfil', components, unitCost: 0 }]);
  }

  function removeProfile(id: string) {
    if (products.some(p => p.profileId === id)) {
      if (!confirm('Hay productos usando este perfil. ¿Eliminar igual? Quedarán sin costo asignado.')) return;
    }
    setProfiles(prev => prev.filter(p => p.id !== id));
  }

  async function saveProfiles() {
    setSavingProfiles(true);
    setProfilesMsg('');
    const res = await fetch('/api/admin/cost-profiles', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body:    JSON.stringify({ profiles }),
    });
    if (res.ok) {
      const data = await res.json();
      setProfiles(data.profiles || profiles);
      setProfilesMsg('✓ Guardado');
    } else {
      setProfilesMsg('Error al guardar');
    }
    setSavingProfiles(false);
    setTimeout(() => setProfilesMsg(''), 3000);
  }

  // ── Productos ───────────────────────────────────────────────────────────
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => p.categories.forEach(c => set.add(c)));
    return [...set].sort();
  }, [products]);

  const visibleProducts = useMemo(() => {
    return products.filter(p => {
      if (categoryFilter !== 'all' && !p.categories.includes(categoryFilter)) return false;
      if (onlyUnassigned && p.profileId) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, categoryFilter, onlyUnassigned, search]);

  const assignedCount = products.filter(p => p.profileId).length;

  function toggleSelect(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected(prev =>
      prev.size === visibleProducts.length ? new Set() : new Set(visibleProducts.map(p => p.id))
    );
  }

  async function assignProfile(productIds: number[], profileId: string) {
    const res = await fetch('/api/admin/product-costs', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body:    JSON.stringify({ productIds, profileId }),
    });
    if (res.ok) {
      setProducts(prev => prev.map(p => (productIds.includes(p.id) ? { ...p, profileId } : p)));
    }
    return res.ok;
  }

  async function onRowProfileChange(id: number, profileId: string) {
    await assignProfile([id], profileId);
  }

  async function applyBulk() {
    if (selected.size === 0) return;
    setBulkSaving(true);
    setBulkMsg('');
    const ok = await assignProfile([...selected], bulkProfileId);
    setBulkMsg(ok ? `✓ Asignado a ${selected.size} producto${selected.size > 1 ? 's' : ''}` : 'Error al asignar');
    setBulkSaving(false);
    setSelected(new Set());
    setTimeout(() => setBulkMsg(''), 3000);
  }

  const profileById = (id: string) => profiles.find(p => p.id === id);

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto mx-auto mb-6" />
          <p className="text-[13px] text-gray-500 text-center mb-4">Clave de administrador</p>
          <input
            type="password"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-black"
            placeholder="Clave admin"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            autoFocus
          />
          <button onClick={login} className="w-full bg-black text-white rounded-md py-2 text-[13px] font-semibold hover:bg-gray-900">
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-10">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-6 w-auto" />
          <span className="text-gray-300">|</span>
          <span className="text-[14px] font-semibold text-gray-900">Costos</span>
          <Link href="/admin/pedidos" className="text-[12px] text-gray-400 hover:text-black ml-1">Pedidos →</Link>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[12px] text-gray-500 font-medium">
            {assignedCount} de {products.length} productos con costo asignado
          </span>
          <button
            onClick={() => { sessionStorage.removeItem(WP_SECRET_KEY); setAuthed(false); setAdminKey(''); }}
            className="text-[11px] text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
          >
            Salir
          </button>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 py-5 space-y-5">
        {loading ? (
          <div className="text-center py-20 text-[13px] text-gray-400">Cargando...</div>
        ) : (
          <>
            {/* Perfiles de costo */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h2 className="text-[14px] font-semibold text-gray-900">Perfiles de costo</h2>
                  <p className="text-[12px] text-gray-400 mt-0.5">
                    Costo de fabricación por tela/construcción — un perfil cubre todos los productos que salen de esa misma tela, sin importar el diseño.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {profilesMsg && <span className={`text-[11px] ${profilesMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>{profilesMsg}</span>}
                  <button
                    onClick={addProfile}
                    className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-400 text-gray-700"
                  >
                    + Nuevo perfil
                  </button>
                  <button
                    onClick={saveProfiles}
                    disabled={savingProfiles}
                    className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    {savingProfiles ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
                {profiles.map(profile => (
                  <div key={profile.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        value={profile.name}
                        onChange={e => updateProfileField(profile.id, 'name', e.target.value, false)}
                        className="flex-1 text-[13px] font-semibold text-gray-900 border-0 border-b border-transparent hover:border-gray-200 focus:border-gray-400 focus:outline-none px-0 py-0.5"
                      />
                      <button
                        onClick={() => removeProfile(profile.id)}
                        className="text-gray-300 hover:text-red-500 flex-none"
                        title="Eliminar perfil"
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {COMPONENT_FIELDS.map(f => (
                        <label key={f.key} className="text-[10.5px] text-gray-400">
                          {f.label}
                          <input
                            type="number"
                            value={profile.components[f.key] ?? 0}
                            onChange={e => updateProfileField(profile.id, f.key, e.target.value, true)}
                            className="block w-full mt-0.5 border border-gray-200 rounded px-1.5 py-1 text-[12px] text-gray-800 focus:outline-none focus:border-gray-400"
                          />
                        </label>
                      ))}
                    </div>
                    <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-gray-100">
                      <span className="text-[11px] text-gray-400">Costo unitario</span>
                      <span className="text-[14px] font-bold text-gray-900">{fmt(sumComponents(profile.components))}</span>
                    </div>
                  </div>
                ))}
                {profiles.length === 0 && (
                  <div className="text-[12px] text-gray-400 col-span-full text-center py-6">
                    No hay perfiles todavía. Creá el primero con &quot;+ Nuevo perfil&quot;.
                  </div>
                )}
              </div>
            </div>

            {/* Productos */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <h2 className="text-[14px] font-semibold text-gray-900">Productos</h2>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    placeholder="Buscar producto..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px] focus:outline-none focus:border-gray-400 w-full sm:w-[160px]"
                  />
                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px] focus:outline-none focus:border-gray-400"
                  >
                    <option value="all">Todas las categorías</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button
                    onClick={() => setOnlyUnassigned(v => !v)}
                    className={`text-[12px] font-medium px-2.5 py-1.5 rounded-lg border ${
                      onlyUnassigned ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-200 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    Solo sin costo
                  </button>
                </div>
              </div>

              {/* Bulk bar */}
              {selected.size > 0 && (
                <div className="flex items-center gap-3 px-5 py-2.5 bg-black text-white">
                  <span className="text-[13px] font-medium">{selected.size} seleccionado{selected.size > 1 ? 's' : ''}</span>
                  <select
                    value={bulkProfileId}
                    onChange={e => setBulkProfileId(e.target.value)}
                    className="text-[12px] bg-white text-black rounded px-2 py-1 focus:outline-none"
                  >
                    <option value="">Asignar perfil...</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button
                    onClick={applyBulk}
                    disabled={!bulkProfileId || bulkSaving}
                    className="text-[12px] font-semibold bg-white text-black px-3 py-1 rounded hover:bg-gray-100 disabled:opacity-50"
                  >
                    {bulkSaving ? 'Aplicando...' : 'Aplicar'}
                  </button>
                  {bulkMsg && <span className="text-[11px] text-gray-200">{bulkMsg}</span>}
                  <button onClick={() => setSelected(new Set())} className="ml-auto text-[11px] text-gray-400 hover:text-white">
                    Cancelar
                  </button>
                </div>
              )}

              {/* Table header */}
              <div className="hidden lg:grid grid-cols-[32px_60px_1.5fr_100px_80px_1fr_90px_70px] gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50">
                <div>
                  <input type="checkbox" checked={selected.size > 0 && selected.size === visibleProducts.length} onChange={toggleSelectAll} className="rounded border-gray-300 cursor-pointer" />
                </div>
                <div />
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Producto</div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Categoría</div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Precio</div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Perfil de costo</div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Margen $</div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Margen %</div>
              </div>

              {visibleProducts.map(product => {
                const profile = profileById(product.profileId);
                const cost    = profile?.unitCost ?? 0;
                const margin  = product.profileId ? product.price - cost : null;
                const marginPct = margin !== null && product.price > 0 ? (margin / product.price) * 100 : null;
                return (
                  <div
                    key={product.id}
                    className={`grid grid-cols-[24px_40px_1fr_auto] gap-x-3 gap-y-1 lg:gap-y-3 lg:grid-cols-[32px_60px_1.5fr_100px_80px_1fr_90px_70px] px-4 py-2.5 items-center border-b border-gray-50 hover:bg-gray-50 ${
                      !product.profileId ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <input type="checkbox" checked={selected.has(product.id)} onChange={() => toggleSelect(product.id)} className="rounded border-gray-300 cursor-pointer col-start-1 row-start-1 lg:col-start-auto lg:row-start-auto" />
                    {product.image ? (
                      <img src={product.image} alt="" className="w-9 h-9 rounded-md object-cover border border-gray-100 col-start-2 row-start-1 row-span-2 lg:row-span-1 lg:col-start-auto lg:row-start-auto" />
                    ) : (
                      <div className="w-9 h-9 rounded-md bg-gray-100 col-start-2 row-start-1 row-span-2 lg:row-span-1 lg:col-start-auto lg:row-start-auto" />
                    )}
                    <div className="text-[12.5px] font-medium text-gray-900 truncate col-start-3 row-start-1 lg:col-start-auto lg:row-start-auto">{product.name}</div>
                    <div className="text-[11px] text-gray-500 truncate col-start-3 col-span-2 row-start-2 lg:col-span-1 lg:col-start-auto lg:row-start-auto">{product.categories.join(', ')}</div>
                    <div className="text-[12.5px] text-gray-700 text-right col-start-4 row-start-1 lg:col-start-auto lg:row-start-auto">{fmt(product.price)}</div>
                    <select
                      value={product.profileId}
                      onChange={e => onRowProfileChange(product.id, e.target.value)}
                      className={`text-[12px] rounded-lg px-2 py-1 border focus:outline-none col-start-3 col-span-2 row-start-3 lg:col-span-1 lg:col-start-auto lg:row-start-auto ${
                        product.profileId ? 'border-gray-200 text-gray-800' : 'border-amber-300 text-amber-700 font-medium'
                      }`}
                    >
                      <option value="">Sin asignar</option>
                      {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div className={`text-[12.5px] text-right font-medium col-start-3 row-start-4 lg:col-start-auto lg:row-start-auto ${margin === null ? 'text-gray-300' : margin < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {margin === null ? '—' : fmt(margin)}
                    </div>
                    <div className={`text-[12.5px] text-right font-medium col-start-4 row-start-4 lg:col-start-auto lg:row-start-auto ${marginPct === null ? 'text-gray-300' : marginPct < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {marginPct === null ? '—' : `${marginPct.toFixed(0)}%`}
                    </div>
                  </div>
                );
              })}

              {visibleProducts.length === 0 && (
                <div className="text-center py-16 text-[13px] text-gray-400">No hay productos que coincidan con el filtro.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
