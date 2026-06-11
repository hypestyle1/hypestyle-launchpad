'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';

const WP_SECRET_KEY = 'hype_admin_key';

type OrderItem = { name: string; quantity: number; size: string; dorsalName?: string; dorsalNumber?: string };
type Customer  = { first_name: string; last_name: string; email: string; phone: string };
type Order = {
  id: number; number: string; date: string; status: string;
  customer: Customer; items: OrderItem[];
  total: number; shipping_total: number; payment_method_title: string;
  tracking: string; andreani: string; dispatched: boolean;
  notified: string; order_key: string;
  customer_note: string;
};

type Counts = { porDespachar: number; despachadoSinMarcar: number; pendientes: number; despachados: number };

const STATUS_LABELS: Record<string, string> = {
  pending:    'Pendiente',
  processing: 'Procesando',
  'on-hold':  'En espera',
  enviado:    'Enviado',
  completed:  'Completado',
  cancelled:  'Cancelado',
  refunded:   'Reembolsado',
  failed:     'Fallido',
};

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  'on-hold':  'bg-orange-100 text-orange-800',
  enviado:    'bg-green-100 text-green-700',
  completed:  'bg-emerald-100 text-emerald-800',
  cancelled:  'bg-red-100 text-red-700',
  refunded:   'bg-purple-100 text-purple-700',
  failed:     'bg-red-100 text-red-700',
};

const FILTERS = ['por-despachar','despachado-sin-marcar','pending','enviado','completed','cancelled','any'];
const FILTER_LABELS: Record<string, string> = {
  'por-despachar':         'Por despachar',
  'despachado-sin-marcar': 'Despachado sin marcar',
  any:                     'Todos',
};
const STATUS_OPTIONS = ['pending','processing','on-hold','enviado','completed','cancelled'];

// Los tabs 'por-despachar' y 'despachado-sin-marcar' consultan 'processing' en la API
// y se afinan en el cliente según tengan rótulo (prueba de despacho) o no.
const apiStatusFor = (f: string) =>
  (f === 'por-despachar' || f === 'despachado-sin-marcar') ? 'processing' : f;

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
       + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function daysSince(s: string) {
  return Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
}

function waLink(phone: string, name: string, orderNum: string) {
  const digits  = phone.replace(/\D/g, '');
  const clean   = digits.startsWith('0') ? digits.slice(1) : digits;
  const intl    = clean.startsWith('54') ? clean : '549' + clean;
  const msg     = encodeURIComponent(`Hola ${name}, te escribimos en relación a tu pedido #${orderNum} en Hypestyle. `);
  return `https://wa.me/${intl}?text=${msg}`;
}

export default function PedidosPage() {
  const [adminKey, setAdminKey]       = useState('');
  const [authed, setAuthed]           = useState(false);
  const [keyInput, setKeyInput]       = useState('');
  const [orders, setOrders]           = useState<Order[]>([]);
  const [loading, setLoading]         = useState(false);
  const [filter, setFilter]           = useState('por-despachar');
  const [counts, setCounts]           = useState<Counts | null>(null);
  const [search, setSearch]           = useState('');
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [selected, setSelected]       = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus]   = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [statusMap, setStatusMap]     = useState<Record<number, string>>({});
  const [cancelTarget, setCancelTarget]   = useState<Order | null>(null);
  const [cancelRestock, setCancelRestock] = useState(true);
  const [cancelNotify, setCancelNotify]   = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(WP_SECRET_KEY);
    if (stored) { setAdminKey(stored); setAuthed(true); }
  }, []);

  const fetchOrders = useCallback(async (key: string, f: string, q: string, p: number) => {
    setLoading(true);
    setSelected(new Set());
    try {
      const params = new URLSearchParams({ status: apiStatusFor(f), page: String(p), ...(q && { search: q }) });
      const res = await fetch(`/api/admin/orders?${params}`, { headers: { 'x-admin-key': key } });
      if (res.status === 403) { setAuthed(false); sessionStorage.removeItem(WP_SECRET_KEY); return; }
      const data = await res.json();
      setOrders(data.orders || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      const smap: Record<number, string> = {};
      (data.orders || []).forEach((o: Order) => { smap[o.id] = o.status; });
      setStatusMap(smap);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCounts = useCallback(async (key: string) => {
    try {
      const res = await fetch('/api/admin/orders/counts', { headers: { 'x-admin-key': key } });
      if (res.ok) setCounts(await res.json());
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    if (authed && adminKey) fetchCounts(adminKey);
  }, [authed, adminKey, fetchCounts]);

  useEffect(() => {
    if (!authed || !adminKey) return;
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setPage(1);
      fetchOrders(adminKey, filter, search, 1);
    }, 400);
  }, [authed, adminKey, filter, search, fetchOrders]);

  useEffect(() => {
    if (!authed || !adminKey) return;
    fetchOrders(adminKey, filter, search, page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function login() {
    sessionStorage.setItem(WP_SECRET_KEY, keyInput);
    setAdminKey(keyInput);
    setAuthed(true);
  }

  function toggleSelect(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll(visible: Order[]) {
    if (selected.size === visible.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visible.map(o => o.id)));
    }
  }

  async function postStatus(orderId: number, status: string) {
    setStatusMap(s => ({ ...s, [orderId]: status }));
    await fetch('/api/admin/set-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ orderId, status }),
    });
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  }

  async function changeStatus(orderId: number, status: string) {
    await postStatus(orderId, status);
    fetchCounts(adminKey);
  }

  // Al elegir "Cancelado" abrimos el modal (restock + mail); el resto se aplica directo.
  function onStatusSelect(order: Order, status: string) {
    if (status === 'cancelled') {
      setCancelRestock(true);
      setCancelNotify(!!order.customer.email);
      setCancelTarget(order);
    } else {
      changeStatus(order.id, status);
    }
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      const res = await fetch('/api/admin/cancel-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ orderId: cancelTarget.id, restock: cancelRestock, notify: cancelNotify }),
      });
      if (!res.ok) { alert('No se pudo cancelar el pedido'); return; }
      setStatusMap(s => ({ ...s, [cancelTarget.id]: 'cancelled' }));
      setOrders(prev => prev.map(o => o.id === cancelTarget.id ? { ...o, status: 'cancelled' } : o));
      fetchCounts(adminKey);
      setCancelTarget(null);
    } finally {
      setCancelLoading(false);
    }
  }

  async function applyBulk() {
    if (!bulkStatus || selected.size === 0) return;
    setBulkLoading(true);
    await Promise.all([...selected].map(id => postStatus(id, bulkStatus)));
    fetchCounts(adminKey);
    setBulkLoading(false);
    setSelected(new Set());
    setBulkStatus('');
  }

  // Vista afinada por rótulo para los tabs de despacho; el resto muestra lo cargado.
  const visibleOrders = filter === 'por-despachar'
    ? orders.filter(o => !o.dispatched)
    : filter === 'despachado-sin-marcar'
      ? orders.filter(o => o.dispatched)
      : orders;
  const revenue = visibleOrders.reduce((s, o) => s + o.total, 0);
  const headerCount = (filter === 'por-despachar' || filter === 'despachado-sin-marcar')
    ? visibleOrders.length : total;

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
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-6 w-auto" />
          <span className="text-gray-300">|</span>
          <span className="text-[14px] font-semibold text-gray-900">Pedidos</span>
          {headerCount > 0 && <span className="text-[12px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{headerCount}</span>}
          <Link href="/admin/newsletter" className="text-[12px] text-gray-400 hover:text-black ml-1">Newsletter →</Link>
        </div>
        <div className="flex items-center gap-2">
          {/* Stats globales reales */}
          {counts && counts.porDespachar > 0 && <span className="hidden sm:inline text-[11px] font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700">{counts.porDespachar} por despachar</span>}
          {counts && counts.despachadoSinMarcar > 0 && <span className="hidden sm:inline text-[11px] font-medium px-2 py-1 rounded-full bg-orange-100 text-orange-800">{counts.despachadoSinMarcar} sin marcar</span>}
          <span className="hidden md:inline text-[11px] text-gray-500 font-medium">{fmt(revenue)}</span>
          <button
            onClick={() => { sessionStorage.removeItem(WP_SECRET_KEY); setAuthed(false); setAdminKey(''); }}
            className="text-[11px] text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
          >
            Salir
          </button>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 py-5">
        {/* KPIs — conteos reales globales */}
        {counts && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {([
              { f: 'por-despachar',         n: counts.porDespachar,        label: 'Por despachar',          num: 'text-red-600',    active: 'border-red-400 ring-red-200' },
              { f: 'despachado-sin-marcar', n: counts.despachadoSinMarcar, label: 'Despachado sin marcar',  num: 'text-orange-600', active: 'border-orange-400 ring-orange-200' },
              { f: 'pending',               n: counts.pendientes,          label: 'Sin pagar',              num: 'text-yellow-600', active: 'border-yellow-400 ring-yellow-200' },
              { f: 'enviado',               n: counts.despachados,         label: 'Enviados',               num: 'text-green-600',  active: 'border-green-400 ring-green-200' },
            ]).map(k => (
              <button
                key={k.f}
                onClick={() => setFilter(k.f)}
                className={`text-left bg-white rounded-xl border p-3 transition-colors ${filter === k.f ? `${k.active} ring-1` : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className={`text-[22px] font-bold leading-none ${k.num}`}>{k.n}</div>
                <div className="text-[11px] text-gray-500 mt-1 font-medium">{k.label}</div>
              </button>
            ))}
          </div>
        )}

        {/* Filters + Search */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="flex gap-1 flex-wrap">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                  filter === f ? 'bg-black text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'
                }`}
              >
                {FILTER_LABELS[f] ?? STATUS_LABELS[f] ?? f}
              </button>
            ))}
          </div>
          <input
            type="text"
            className="flex-1 min-w-[180px] border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] bg-white focus:outline-none focus:border-gray-400"
            placeholder="Buscar por nombre, email u orden..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 mb-3 bg-black text-white px-4 py-2.5 rounded-lg">
            <span className="text-[13px] font-medium">{selected.size} seleccionado{selected.size > 1 ? 's' : ''}</span>
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value)}
              className="text-[12px] bg-white text-black rounded px-2 py-1 focus:outline-none"
            >
              <option value="">Cambiar estado...</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <button
              onClick={applyBulk}
              disabled={!bulkStatus || bulkLoading}
              className="text-[12px] font-semibold bg-white text-black px-3 py-1 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              {bulkLoading ? 'Aplicando...' : 'Aplicar'}
            </button>
            <button onClick={() => setSelected(new Set())} className="ml-auto text-[11px] text-gray-400 hover:text-white">
              Cancelar
            </button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center py-20 text-[13px] text-gray-400">Cargando pedidos...</div>
        ) : visibleOrders.length === 0 ? (
          <div className="text-center py-20 text-[13px] text-gray-400">No hay pedidos</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[32px_80px_1fr_1fr_100px_120px_80px] gap-3 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selected.size === visibleOrders.length && visibleOrders.length > 0}
                  onChange={() => toggleAll(visibleOrders)}
                  className="rounded border-gray-300 cursor-pointer"
                />
              </div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Orden</div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Cliente</div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden lg:block">Productos</div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Total</div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Estado</div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Fecha</div>
            </div>

            {/* Rows */}
            {visibleOrders.map((order, idx) => (
              <div
                key={order.id}
                className={`grid grid-cols-[32px_80px_1fr_1fr_100px_120px_80px] gap-3 px-4 py-3 items-center border-b border-gray-50 hover:bg-gray-50 transition-colors group ${
                  selected.has(order.id) ? 'bg-blue-50 hover:bg-blue-50' : ''
                } ${idx === visibleOrders.length - 1 ? 'border-b-0' : ''}`}
              >
                {/* Checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selected.has(order.id)}
                    onChange={() => toggleSelect(order.id)}
                    className="rounded border-gray-300 cursor-pointer"
                  />
                </div>

                {/* Order # */}
                <div>
                  <Link
                    href={`/admin/pedidos/${order.id}`}
                    className="text-[13px] font-bold text-black hover:underline"
                  >
                    #{order.number}
                  </Link>
                  {order.dispatched ? (
                    <div className="text-[10px] text-green-600 font-medium mt-0.5 truncate max-w-[80px]" title={order.tracking || order.andreani}>
                      ✓ Rótulo
                    </div>
                  ) : order.status === 'processing' ? (
                    <div className="text-[10px] text-red-600 font-semibold mt-0.5">Sin rótulo</div>
                  ) : null}
                </div>

                {/* Customer */}
                <div className="min-w-0">
                  <Link href={`/admin/pedidos/${order.id}`} className="text-[13px] font-medium text-gray-900 hover:underline truncate block">
                    {order.customer.first_name} {order.customer.last_name}
                  </Link>
                  {order.customer_note && (
                    <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 mt-0.5 truncate max-w-[260px]" title={order.customer_note}>
                      📝 {order.customer_note}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-gray-400 truncate">{order.customer.email}</span>
                    {order.customer.phone && (
                      <a
                        href={waLink(order.customer.phone, order.customer.first_name, order.number)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        title={`WhatsApp ${order.customer.phone}`}
                        className="flex-none opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-green-500 hover:fill-green-600" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </a>
                    )}
                  </div>
                </div>

                {/* Products */}
                <div className="hidden lg:block min-w-0 text-[12px] text-gray-500 truncate">
                  {order.items.map((it, i) => (
                    <span key={i}>{i > 0 && ' · '}{it.name.replace(/\s*—\s*Talle\s*\S+/i, '')}{it.size ? ` ${it.size}` : ''}{(it.dorsalNumber || it.dorsalName) ? ` [${it.dorsalNumber ? `#${it.dorsalNumber}` : ''}${it.dorsalName ? ` ${it.dorsalName}` : ''}]` : ''} ×{it.quantity}</span>
                  ))}
                </div>

                {/* Total */}
                <div className="text-right">
                  <div className="text-[13px] font-semibold text-gray-900">{fmt(order.total)}</div>
                  <div className="text-[11px] text-gray-400">{order.payment_method_title.replace('MercadoPago', 'MP')}</div>
                </div>

                {/* Status */}
                <div>
                  <select
                    value={statusMap[order.id] || order.status}
                    onChange={e => onStatusSelect(order, e.target.value)}
                    onClick={e => e.stopPropagation()}
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-300 ${
                      STATUS_COLORS[statusMap[order.id] || order.status] || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>

                {/* Date + antigüedad */}
                <div className="text-right">
                  <Link href={`/admin/pedidos/${order.id}`} className="text-[11px] text-gray-400 hover:text-black block">
                    {fmtDate(order.date)}
                  </Link>
                  {order.status === 'processing' && !order.dispatched && (
                    <div className={`text-[10px] font-semibold mt-0.5 ${daysSince(order.date) >= 3 ? 'text-red-600' : daysSince(order.date) >= 1 ? 'text-amber-600' : 'text-gray-400'}`}>
                      hace {daysSince(order.date)}d
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-[12px] font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Anterior
            </button>
            <span className="text-[12px] text-gray-500">Página {page} de {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-[12px] font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>

      {/* Modal de cancelación */}
      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !cancelLoading && setCancelTarget(null)}
        >
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-[15px] font-bold text-gray-900">Cancelar pedido #{cancelTarget.number}</h3>
            <p className="text-[12px] text-gray-500 mt-1">
              {cancelTarget.customer.first_name} {cancelTarget.customer.last_name} · {fmt(cancelTarget.total)}
            </p>
            <div className="mt-4 space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={cancelRestock} onChange={e => setCancelRestock(e.target.checked)} className="mt-0.5 rounded border-gray-300" />
                <span className="text-[13px] text-gray-800">
                  Restaurar stock
                  <span className="block text-[11px] text-gray-400">Devuelve las unidades de cada talle al inventario.</span>
                </span>
              </label>
              <label className={`flex items-start gap-2 ${cancelTarget.customer.email ? 'cursor-pointer' : 'opacity-50'}`}>
                <input
                  type="checkbox"
                  checked={cancelNotify}
                  disabled={!cancelTarget.customer.email}
                  onChange={e => setCancelNotify(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300"
                />
                <span className="text-[13px] text-gray-800">
                  Enviar mail al cliente
                  <span className="block text-[11px] text-gray-400">
                    {cancelTarget.customer.email ? `Mail de cancelación a ${cancelTarget.customer.email}` : 'El pedido no tiene email'}
                  </span>
                </span>
              </label>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setCancelTarget(null)} disabled={cancelLoading} className="flex-1 text-[13px] font-medium py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50">
                Volver
              </button>
              <button onClick={confirmCancel} disabled={cancelLoading} className="flex-1 text-[13px] font-semibold py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                {cancelLoading ? 'Cancelando...' : 'Cancelar pedido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
