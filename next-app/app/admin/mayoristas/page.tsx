'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const WP_SECRET_KEY = 'hype_admin_key';

const EMPTY = {
  email: '', password: '', first_name: '', last_name: '', company: '',
  address_1: '', city: '', state: '', postcode: '', phone: '', min_order: '',
};

type Mayorista = {
  id: number; email: string; name: string; company: string; phone: string; city: string;
  minOrderOverride: string | null; active: boolean; createdAt: string;
  orderCount: number; totalSpent: number;
  lastOrderAt: string | null; lastLogin: string | null; loginCount: number;
};

function randomPassword() {
  return Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 10);
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function fmtRelative(s: string | null) {
  if (!s) return null;
  const diffMs = Date.now() - new Date(s).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months}m`;
  return `hace ${Math.floor(months / 12)}a`;
}

function waLink(phone: string, name: string) {
  const digits = phone.replace(/\D/g, '');
  const clean  = digits.startsWith('0') ? digits.slice(1) : digits;
  const intl   = clean.startsWith('54') ? clean : '549' + clean;
  const msg    = encodeURIComponent(`Hola ${name}, te escribimos de Hype `);
  return `https://wa.me/${intl}?text=${msg}`;
}

type FilterMode = 'all' | 'never-ordered' | 'never-logged-in';
const FILTER_LABELS: Record<FilterMode, string> = {
  all: 'Todos',
  'never-ordered': 'Nunca compró',
  'never-logged-in': 'Nunca entró',
};

type SortKey = 'name' | 'orderCount' | 'totalSpent' | 'lastOrderAt' | 'lastLogin';
const SORT_LABELS: Record<SortKey, string> = {
  name: 'Cliente',
  orderCount: 'Pedidos',
  totalSpent: 'Total',
  lastOrderAt: 'Último pedido',
  lastLogin: 'Último ingreso',
};

function csvEscape(value: string | number): string {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(rows: Mayorista[]) {
  const headers = ['Cliente', 'Empresa', 'Email', 'Teléfono', 'Ciudad', 'Pedidos', 'Total gastado', 'Último pedido', 'Último ingreso', 'Veces ingresó', 'Mínimo propio', 'Estado', 'Cliente desde'];
  const lines = [headers.join(',')];
  for (const m of rows) {
    lines.push([
      m.name, m.company, m.email, m.phone, m.city,
      m.orderCount, m.totalSpent, m.lastOrderAt ?? '', m.lastLogin ?? '', m.loginCount,
      m.minOrderOverride ?? '', m.active ? 'Activo' : 'Revocado', m.createdAt,
    ].map(csvEscape).join(','));
  }
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mayoristas-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function SortableTh({ label, sortKey, current, dir, onClick, align = 'left' }: {
  label: string; sortKey: SortKey; current: SortKey; dir: 'asc' | 'desc';
  onClick: (key: SortKey) => void; align?: 'left' | 'right';
}) {
  const active = current === sortKey;
  return (
    <th className={`px-4 py-2.5 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button onClick={() => onClick(sortKey)} className={`inline-flex items-center gap-0.5 hover:text-black transition-colors ${active ? 'text-black' : ''}`}>
        {label}
        <span className="text-[9px]">{active ? (dir === 'desc' ? '▼' : '▲') : ''}</span>
      </button>
    </th>
  );
}

export default function MayoristasAdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed]     = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [created, setCreated]   = useState<{ email: string; password: string } | null>(null);
  const [globalMin, setGlobalMin]         = useState<number | null>(null);
  const [globalMinInput, setGlobalMinInput] = useState('');
  const [savingMin, setSavingMin]         = useState(false);
  const [mayoristas, setMayoristas]   = useState<Mayorista[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [togglingId, setTogglingId]   = useState<number | null>(null);
  const [minInputs, setMinInputs]     = useState<Record<number, string>>({});
  const [savingMinId, setSavingMinId] = useState<number | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortKey, setSortKey]       = useState<SortKey>('totalSpent');
  const [sortDir, setSortDir]       = useState<'asc' | 'desc'>('desc');

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const visibleMayoristas = useMemo(() => {
    const filtered = mayoristas.filter(m => {
      if (filterMode === 'never-ordered') return m.orderCount === 0;
      if (filterMode === 'never-logged-in') return m.loginCount === 0;
      return true;
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === 'name') return dir * (a.company || a.name).localeCompare(b.company || b.name);
      if (sortKey === 'lastOrderAt') return dir * (new Date(a.lastOrderAt || 0).getTime() - new Date(b.lastOrderAt || 0).getTime());
      if (sortKey === 'lastLogin') return dir * (new Date(a.lastLogin || 0).getTime() - new Date(b.lastLogin || 0).getTime());
      return dir * ((a[sortKey] as number) - (b[sortKey] as number));
    });
  }, [mayoristas, filterMode, sortKey, sortDir]);

  useEffect(() => {
    const stored = sessionStorage.getItem(WP_SECRET_KEY);
    if (stored) { setAdminKey(stored); setAuthed(true); }
  }, []);

  useEffect(() => {
    setForm(f => f.password ? f : { ...f, password: randomPassword() });
  }, []);

  const fetchList = useCallback(async (key: string) => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/admin/mayoristas', { headers: { 'x-admin-key': key } });
      if (res.ok) {
        const data = await res.json();
        const list: Mayorista[] = data.mayoristas || [];
        setMayoristas(list);
        setMinInputs(Object.fromEntries(list.map(m => [m.id, m.minOrderOverride ?? ''])));
      }
    } finally {
      setLoadingList(false);
    }
  }, []);

  async function saveClientMin(m: Mayorista) {
    const raw = (minInputs[m.id] ?? '').trim();
    const minOrder = raw === '' ? null : Number(raw);
    if (minOrder !== null && (!Number.isFinite(minOrder) || minOrder < 0)) return;
    setSavingMinId(m.id);
    try {
      const res = await fetch(`/api/admin/mayoristas/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ minOrder }),
      });
      if (res.ok) {
        setMayoristas(prev => prev.map(x => x.id === m.id ? { ...x, minOrderOverride: minOrder === null ? null : String(minOrder) } : x));
      }
    } finally {
      setSavingMinId(null);
    }
  }

  useEffect(() => {
    if (!authed || !adminKey) return;
    fetchList(adminKey);
    fetch('/api/admin/mayorista-settings', { headers: { 'x-admin-key': adminKey } })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (typeof data?.minOrder === 'number') {
          setGlobalMin(data.minOrder);
          setGlobalMinInput(String(data.minOrder));
        }
      })
      .catch(() => {});
  }, [authed, adminKey, fetchList]);

  async function saveGlobalMin() {
    const value = Number(globalMinInput);
    if (!Number.isFinite(value) || value < 0) return;
    setSavingMin(true);
    try {
      const res = await fetch('/api/admin/mayorista-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ minOrder: value }),
      });
      if (res.ok) setGlobalMin(value);
    } finally {
      setSavingMin(false);
    }
  }

  async function toggleActive(m: Mayorista) {
    setTogglingId(m.id);
    try {
      const res = await fetch(`/api/admin/mayoristas/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ active: !m.active }),
      });
      if (res.ok) {
        setMayoristas(prev => prev.map(x => x.id === m.id ? { ...x, active: !m.active } : x));
      }
    } finally {
      setTogglingId(null);
    }
  }

  function login() {
    sessionStorage.setItem(WP_SECRET_KEY, keyInput);
    setAdminKey(keyInput);
    setAuthed(true);
  }

  function field(key: keyof typeof EMPTY) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/mayorista-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'No se pudo crear el cliente');
      setCreated({ email: form.email, password: form.password });
      setForm({ ...EMPTY, password: randomPassword() });
      fetchList(adminKey);
    } catch (err: any) {
      setError(err.message || 'Error al crear el cliente');
    } finally {
      setSaving(false);
    }
  }

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
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-6 w-auto" />
          <span className="text-gray-300">|</span>
          <span className="text-[14px] font-semibold text-gray-900">Clientes mayoristas</span>
          <Link href="/admin/pedidos" className="text-[12px] text-gray-400 hover:text-black ml-1">← Pedidos</Link>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="text-[12px] font-semibold bg-black text-white px-3 py-1.5 rounded-md hover:bg-gray-900"
        >
          {showForm ? 'Cerrar' : '+ Nuevo cliente'}
        </button>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <p className="text-[13px] font-semibold text-gray-900">Pedido mínimo general</p>
          <p className="text-[12px] text-gray-500 mt-0.5">Se aplica a todos los clientes salvo que tengan un mínimo propio cargado al crearlos.</p>
          <div className="flex gap-2 mt-3 max-w-xs">
            <input
              type="number"
              min={0}
              value={globalMinInput}
              onChange={e => setGlobalMinInput(e.target.value)}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-black"
            />
            <button
              onClick={saveGlobalMin}
              disabled={savingMin || globalMinInput === String(globalMin)}
              className="text-[12px] font-semibold bg-black text-white px-4 rounded-md hover:bg-gray-900 disabled:opacity-40"
            >
              {savingMin ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
          {globalMin != null && <p className="text-[11px] text-gray-400 mt-2">Actual: ${globalMin.toLocaleString('es-AR')}</p>}
        </div>

        {showForm && (
          <div className="mb-6">
            {created && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-[13px]">
                <p className="font-semibold text-green-800">Cliente creado ✓</p>
                <p className="text-green-700 mt-1">Pasale estos datos para que entre a <code>/mayoristas</code>:</p>
                <p className="mt-2 font-mono text-[12px] bg-white border border-green-200 rounded px-2 py-1">usuario: {created.email}</p>
                <p className="font-mono text-[12px] bg-white border border-green-200 rounded px-2 py-1 mt-1">contraseña: {created.password}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 max-w-lg">
              <div className="grid grid-cols-2 gap-3">
                <label className="col-span-2 text-[11px] font-medium text-gray-500">
                  Email (es el usuario de login)
                  <input type="email" required {...field('email')} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-black" />
                </label>
                <label className="col-span-2 text-[11px] font-medium text-gray-500">
                  Contraseña
                  <div className="flex gap-2 mt-1">
                    <input type="text" required {...field('password')} className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-black font-mono" />
                    <button type="button" onClick={() => setForm(f => ({ ...f, password: randomPassword() }))} className="text-[12px] text-gray-500 hover:text-black px-2 border border-gray-300 rounded-md">
                      Generar
                    </button>
                  </div>
                </label>
                <label className="text-[11px] font-medium text-gray-500">
                  Nombre
                  <input required {...field('first_name')} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-black" />
                </label>
                <label className="text-[11px] font-medium text-gray-500">
                  Apellido
                  <input {...field('last_name')} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-black" />
                </label>
                <label className="col-span-2 text-[11px] font-medium text-gray-500">
                  Local / empresa
                  <input {...field('company')} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-black" />
                </label>
                <label className="col-span-2 text-[11px] font-medium text-gray-500">
                  Dirección <span className="normal-case text-gray-400">(opcional — se la pide el sitio al cliente en su primer pedido)</span>
                  <input {...field('address_1')} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-black" />
                </label>
                <label className="text-[11px] font-medium text-gray-500">
                  Ciudad
                  <input {...field('city')} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-black" />
                </label>
                <label className="text-[11px] font-medium text-gray-500">
                  Provincia
                  <input {...field('state')} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-black" />
                </label>
                <label className="text-[11px] font-medium text-gray-500">
                  CP
                  <input {...field('postcode')} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-black" />
                </label>
                <label className="text-[11px] font-medium text-gray-500">
                  Teléfono
                  <input required {...field('phone')} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-black" />
                </label>
                <label className="col-span-2 text-[11px] font-medium text-gray-500">
                  Mínimo de pedido para este cliente (opcional)
                  <input type="number" min={0} placeholder={globalMin != null ? `Vacío = usa el general ($${globalMin.toLocaleString('es-AR')})` : 'Vacío = usa el general'} {...field('min_order')} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-black" />
                </label>
              </div>

              {error && <p className="text-[12px] text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-black text-white rounded-md py-2.5 text-[13px] font-semibold hover:bg-gray-900 disabled:opacity-50"
              >
                {saving ? 'Creando…' : 'Crear cliente mayorista'}
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-gray-900">{visibleMayoristas.length} cliente{visibleMayoristas.length !== 1 ? 's' : ''}</p>
              {loadingList && <span className="text-[11px] text-gray-400">Actualizando…</span>}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {(Object.keys(FILTER_LABELS) as FilterMode[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterMode(f)}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                      filterMode === f ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-500 hover:border-gray-400'
                    }`}
                  >
                    {FILTER_LABELS[f]}
                  </button>
                ))}
              </div>
              <button
                onClick={() => downloadCsv(visibleMayoristas)}
                disabled={visibleMayoristas.length === 0}
                className="text-[11px] font-semibold text-gray-600 hover:text-black px-2.5 py-1 border border-gray-300 rounded-full disabled:opacity-30"
              >
                ⬇ Exportar CSV
              </button>
            </div>
          </div>

          {visibleMayoristas.length === 0 && !loadingList ? (
            <p className="text-center py-12 text-[13px] text-gray-400">
              {mayoristas.length === 0 ? 'Todavía no creaste ningún cliente.' : 'Nadie coincide con este filtro.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    <SortableTh label="Cliente" sortKey="name" current={sortKey} dir={sortDir} onClick={toggleSort} />
                    <th className="text-left px-4 py-2.5">Contacto</th>
                    <th className="text-left px-4 py-2.5">Ciudad</th>
                    <SortableTh label="Pedidos" sortKey="orderCount" current={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                    <SortableTh label="Total" sortKey="totalSpent" current={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                    <SortableTh label="Último ingreso" sortKey="lastLogin" current={sortKey} dir={sortDir} onClick={toggleSort} />
                    <th className="text-left px-4 py-2.5">Mínimo propio</th>
                    <th className="text-left px-4 py-2.5">Estado</th>
                    <th className="text-right px-4 py-2.5">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMayoristas.map((m) => (
                    <tr key={m.id} className="border-t border-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{m.company || m.name}</p>
                        {m.company && <p className="text-[11px] text-gray-400">{m.name}</p>}
                        <p className="text-[10px] text-gray-400">desde {fmtDate(m.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <a href={`mailto:${m.email}`} className="block text-[12px] text-gray-600 hover:text-black truncate max-w-[180px]">{m.email}</a>
                        {m.phone && (
                          <a href={waLink(m.phone, m.name)} target="_blank" rel="noopener noreferrer" className="text-[12px] text-green-600 hover:text-green-700">
                            WhatsApp
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{m.city}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {m.orderCount}
                        {m.lastOrderAt && <p className="text-[10px] text-gray-400 font-normal">{fmtRelative(m.lastOrderAt)}</p>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{fmt(m.totalSpent)}</td>
                      <td className="px-4 py-3">
                        {m.loginCount > 0 ? (
                          <>
                            <p className="text-gray-700">{fmtRelative(m.lastLogin)}</p>
                            <p className="text-[10px] text-gray-400">{m.loginCount} ingreso{m.loginCount !== 1 ? 's' : ''}</p>
                          </>
                        ) : (
                          <span className="text-[11px] text-gray-400">nunca entró</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            value={minInputs[m.id] ?? ''}
                            onChange={e => setMinInputs(prev => ({ ...prev, [m.id]: e.target.value }))}
                            placeholder={globalMin != null ? `general ($${globalMin.toLocaleString('es-AR')})` : 'general'}
                            className="w-32 border border-gray-300 rounded-md px-2 py-1 text-[12px] focus:outline-none focus:border-black"
                          />
                          <button
                            onClick={() => saveClientMin(m)}
                            disabled={savingMinId === m.id || (minInputs[m.id] ?? '') === (m.minOrderOverride ?? '')}
                            className="text-[11px] font-semibold text-gray-500 hover:text-black px-2 py-1 border border-gray-300 rounded-md disabled:opacity-30"
                          >
                            {savingMinId === m.id ? '...' : 'Guardar'}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${m.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {m.active ? 'Activo' : 'Revocado'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => toggleActive(m)}
                          disabled={togglingId === m.id}
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border disabled:opacity-40 ${
                            m.active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-700 hover:bg-green-50'
                          }`}
                        >
                          {togglingId === m.id ? '...' : m.active ? 'Revocar' : 'Reactivar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
