'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

const WP_SECRET_KEY = 'hype_admin_key';
const WP_URL = 'https://lightpink-rook-704850.hostingersite.com';

type OrderItem = { name: string; quantity: number; size: string };
type Customer  = { first_name: string; last_name: string; email: string; phone: string };
type Order = {
  id: number; number: string; date: string; status: string;
  customer: Customer; items: OrderItem[];
  total: number; shipping_total: number; payment_method_title: string;
  tracking: string; notified: string; order_key: string;
};

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

const FILTERS = ['any','pending','processing','on-hold','enviado','completed','cancelled'];

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
       + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export default function PedidosPage() {
  const [adminKey, setAdminKey]     = useState('');
  const [authed, setAuthed]         = useState(false);
  const [keyInput, setKeyInput]     = useState('');
  const [orders, setOrders]         = useState<Order[]>([]);
  const [loading, setLoading]       = useState(false);
  const [filter, setFilter]         = useState('any');
  const [search, setSearch]         = useState('');
  const [total, setTotal]           = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [trackInputs, setTrackInputs] = useState<Record<number, string>>({});
  const [trackStatus, setTrackStatus] = useState<Record<number, string>>({});
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(WP_SECRET_KEY);
    if (stored) { setAdminKey(stored); setAuthed(true); }
  }, []);

  const fetchOrders = useCallback(async (key: string, f: string, q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: f, ...(q && { search: q }) });
      const res = await fetch(`/api/admin/orders?${params}`, {
        headers: { 'x-admin-key': key },
      });
      if (res.status === 403) { setAuthed(false); sessionStorage.removeItem(WP_SECRET_KEY); return; }
      const data = await res.json();
      setOrders(data.orders || []);
      setTotal(data.total || 0);
      const inputs: Record<number, string> = {};
      (data.orders || []).forEach((o: Order) => { inputs[o.id] = o.tracking || ''; });
      setTrackInputs(inputs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authed || !adminKey) return;
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => fetchOrders(adminKey, filter, search), 400);
  }, [authed, adminKey, filter, search, fetchOrders]);

  function login() {
    sessionStorage.setItem(WP_SECRET_KEY, keyInput);
    setAdminKey(keyInput);
    setAuthed(true);
  }

  async function saveTracking(order: Order) {
    const tracking = trackInputs[order.id] || '';
    setTrackStatus(s => ({ ...s, [order.id]: 'Guardando...' }));
    const res = await fetch('/api/admin/set-tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ orderId: order.id, trackingNumber: tracking }),
    });
    const data = await res.json();
    if (data.ok) {
      setTrackStatus(s => ({ ...s, [order.id]: data.notified ? '✓ Guardado · Email enviado' : '✓ Guardado' }));
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, tracking, notified: data.notified ? '1' : o.notified } : o));
    } else {
      setTrackStatus(s => ({ ...s, [order.id]: 'Error: ' + (data.error || 'desconocido') }));
    }
  }

  function exportCSV() {
    const key = encodeURIComponent(adminKey);
    window.open(
      `${WP_URL}/?hype_export=1&key=${key}&since=2026-05-10`,
      '_blank'
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto mx-auto mb-6" />
          <p className="text-[13px] text-gray-500 text-center mb-4">Ingresá la clave de administrador</p>
          <input
            type="password"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-black"
            placeholder="Clave admin"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
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
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/"><img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-6 w-auto" /></a>
          <span className="text-[13px] text-gray-400">/</span>
          <span className="text-[13px] font-semibold text-gray-800">Pedidos</span>
          {total > 0 && <span className="text-[11px] text-gray-400">{total} pedidos</span>}
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 text-[12px] font-medium text-gray-600 hover:text-black border border-gray-200 rounded-md px-3 py-1.5 hover:border-gray-400 transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Exportar Excel
        </button>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 py-6">
        {/* Filters + Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex gap-1 flex-wrap">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                  filter === f ? 'bg-black text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'
                }`}
              >
                {f === 'any' ? 'Todos' : STATUS_LABELS[f] ?? f}
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

        {/* Orders list */}
        {loading ? (
          <div className="text-center py-16 text-[13px] text-gray-400">Cargando pedidos...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-[13px] text-gray-400">No hay pedidos</div>
        ) : (
          <div className="space-y-2">
            {orders.map(order => (
              <div key={order.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Row */}
                <div
                  className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                >
                  {/* Order # + status */}
                  <div className="flex-none w-28">
                    <div className="text-[13px] font-bold text-black">#{order.number}</div>
                    <span className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>

                  {/* Customer */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-gray-900 truncate">
                      {order.customer.first_name} {order.customer.last_name}
                    </div>
                    <div className="text-[11px] text-gray-400 truncate">{order.customer.email}</div>
                  </div>

                  {/* Items */}
                  <div className="hidden md:block flex-1 min-w-0 text-[12px] text-gray-500 truncate">
                    {order.items.map((it, i) => (
                      <span key={i}>{i > 0 && ' · '}{it.name}{it.size ? ` ${it.size}` : ''} ×{it.quantity}</span>
                    ))}
                  </div>

                  {/* Tracking */}
                  <div className="hidden lg:block flex-none w-36 text-[11px]">
                    {order.tracking ? (
                      <div>
                        <span className={`font-mono ${order.notified ? 'text-green-600' : 'text-amber-600'}`}>
                          {order.notified ? '✓ ' : '⏳ '}{order.tracking}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-300">Sin despacho</span>
                    )}
                  </div>

                  {/* Total + date */}
                  <div className="flex-none text-right">
                    <div className="text-[13px] font-semibold text-gray-900">{fmt(order.total)}</div>
                    <div className="text-[11px] text-gray-400">{fmtDate(order.date)}</div>
                  </div>

                  {/* Chevron */}
                  <svg
                    className={`flex-none w-4 h-4 text-gray-400 transition-transform ${expandedId === order.id ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>

                {/* Expanded detail */}
                {expandedId === order.id && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-[#fafafa] grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Items */}
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">Productos</p>
                      {order.items.map((it, i) => (
                        <div key={i} className="text-[12px] text-gray-700 py-0.5">
                          {it.name}{it.size ? ` — Talle ${it.size}` : ''} <span className="text-gray-400">×{it.quantity}</span>
                        </div>
                      ))}
                      <div className="mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                        Envío: {fmt(order.shipping_total)} · {order.payment_method_title}
                      </div>
                    </div>

                    {/* Customer */}
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">Cliente</p>
                      <div className="text-[12px] text-gray-700 space-y-0.5">
                        <div className="font-medium">{order.customer.first_name} {order.customer.last_name}</div>
                        <div className="text-gray-500">{order.customer.email}</div>
                        <div className="text-gray-500">{order.customer.phone}</div>
                      </div>
                      <a
                        href={`${WP_URL}/wp-admin/post.php?post=${order.id}&action=edit`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-3 text-[11px] text-blue-600 hover:underline"
                      >
                        Ver en WooCommerce →
                      </a>
                    </div>

                    {/* Tracking */}
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">Seguimiento Andreani</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="flex-1 border border-gray-200 rounded-md px-2 py-1.5 text-[12px] font-mono focus:outline-none focus:border-gray-400"
                          placeholder="360002987658940"
                          value={trackInputs[order.id] ?? ''}
                          onChange={e => setTrackInputs(s => ({ ...s, [order.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && saveTracking(order)}
                        />
                        <button
                          onClick={() => saveTracking(order)}
                          className="px-3 py-1.5 bg-black text-white rounded-md text-[11px] font-semibold hover:bg-gray-800 whitespace-nowrap"
                        >
                          Guardar
                        </button>
                      </div>
                      {trackStatus[order.id] && (
                        <p className={`mt-1.5 text-[11px] ${trackStatus[order.id].startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
                          {trackStatus[order.id]}
                        </p>
                      )}
                      {(trackInputs[order.id] || order.tracking) && (
                        <a
                          href={`https://www.andreani.com/envio/${trackInputs[order.id] || order.tracking}`}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-block mt-2 text-[11px] text-blue-600 hover:underline"
                        >
                          🔗 Rastrear en Andreani →
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
