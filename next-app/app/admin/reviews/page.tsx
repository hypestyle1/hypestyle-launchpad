'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

const WP_SECRET_KEY = 'hype_admin_key';

type Row = {
  id: number;
  order_id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  status: string;
  status_label: string;
  dispatched_at: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
  responded_at: string | null;
  reviewable_count: number;
  received_count: number;
  coupon_id: number | null;
  coupon_code_masked: string | null;
  fail_reason: string | null;
};

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'scheduled', label: 'Programada' },
  { value: 'sent', label: 'Enviada' },
  { value: 'responded', label: 'Respondida' },
  { value: 'failed', label: 'Fallida' },
  { value: 'cancelled', label: 'Cancelada' },
];

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  sent: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-orange-100 text-orange-800',
  responded: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

function fmtDate(s: string | null) {
  if (!s) return '—';
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function ReviewsDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed]     = useState(false);
  const [keyInput, setKeyInput] = useState('');

  const [rows, setRows]     = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal]   = useState(0);
  const [msg, setMsg]       = useState('');

  const [status, setStatus]     = useState(searchParams.get('status') || '');
  const [search, setSearch]     = useState(searchParams.get('search') || '');
  const [dispatchedFrom, setDispatchedFrom] = useState(searchParams.get('dispatched_from') || '');
  const [dispatchedTo, setDispatchedTo]     = useState(searchParams.get('dispatched_to') || '');
  const [sentFrom, setSentFrom] = useState(searchParams.get('sent_from') || '');
  const [sentTo, setSentTo]     = useState(searchParams.get('sent_to') || '');
  const [hasResponse, setHasResponse] = useState(searchParams.get('has_response') || '');
  const [hasCoupon, setHasCoupon]     = useState(searchParams.get('has_coupon') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const perPage = 20;

  const [cancelTarget, setCancelTarget] = useState<Row | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null); // bloquea doble click por fila
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(WP_SECRET_KEY);
    if (stored) { setAdminKey(stored); setAuthed(true); }
  }, []);

  function login() {
    sessionStorage.setItem(WP_SECRET_KEY, keyInput);
    setAdminKey(keyInput);
    setAuthed(true);
  }

  // Mantiene los filtros en la URL para poder volver atrás sin perderlos.
  const syncUrl = useCallback((p: number) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    if (dispatchedFrom) params.set('dispatched_from', dispatchedFrom);
    if (dispatchedTo) params.set('dispatched_to', dispatchedTo);
    if (sentFrom) params.set('sent_from', sentFrom);
    if (sentTo) params.set('sent_to', sentTo);
    if (hasResponse) params.set('has_response', hasResponse);
    if (hasCoupon) params.set('has_coupon', hasCoupon);
    if (p > 1) params.set('page', String(p));
    router.replace(`/admin/reviews${params.toString() ? '?' + params.toString() : ''}`, { scroll: false });
  }, [status, search, dispatchedFrom, dispatchedTo, sentFrom, sentTo, hasResponse, hasCoupon, router]);

  const fetchRows = useCallback(async (p: number) => {
    if (!adminKey) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: String(perPage) });
      if (status) params.set('status', status);
      if (search) params.set('search', search);
      if (dispatchedFrom) params.set('dispatched_from', dispatchedFrom);
      if (dispatchedTo) params.set('dispatched_to', dispatchedTo);
      if (sentFrom) params.set('sent_from', sentFrom);
      if (sentTo) params.set('sent_to', sentTo);
      if (hasResponse) params.set('has_response', hasResponse);
      if (hasCoupon) params.set('has_coupon', hasCoupon);

      const res = await fetch(`/api/admin/reviews?${params}`, { headers: { 'x-admin-key': adminKey } });
      if (res.status === 403) { setAuthed(false); sessionStorage.removeItem(WP_SECRET_KEY); return; }
      const data = await res.json();
      setRows(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setMsg('Error al cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  }, [adminKey, status, search, dispatchedFrom, dispatchedTo, sentFrom, sentTo, hasResponse, hasCoupon]);

  // Filtros (no la búsqueda de texto) → refetch inmediato + reset a página 1.
  useEffect(() => {
    if (!authed || !adminKey) return;
    setPage(1);
    syncUrl(1);
    fetchRows(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, adminKey, status, dispatchedFrom, dispatchedTo, sentFrom, sentTo, hasResponse, hasCoupon]);

  // Búsqueda de texto: debounced.
  useEffect(() => {
    if (!authed || !adminKey) return;
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setPage(1);
      syncUrl(1);
      fetchRows(1);
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (!authed || !adminKey) return;
    syncUrl(page);
    fetchRows(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  async function doAction(row: Row, action: 'resend' | 'cancel' | 'retry') {
    if (busyId) return; // bloqueo de doble click a nivel global de la tabla.
    setBusyId(row.id);
    setMsg('');
    try {
      const res = await fetch(`/api/admin/reviews/${row.id}/${action}`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey },
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || data.message || `No se pudo completar la acción (${action}).`);
        return;
      }
      const labels = { resend: 'Reenviado', cancel: 'Cancelado', retry: 'Reintentado' };
      setMsg(`✓ ${labels[action]} correctamente.`);
      fetchRows(page);
    } catch {
      setMsg('Error al conectar.');
    } finally {
      setBusyId(null);
    }
  }

  function requestCancel(row: Row) {
    setCancelTarget(row);
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews/${cancelTarget.id}/cancel`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey },
      });
      if (!res.ok) { setMsg('No se pudo cancelar la solicitud.'); return; }
      setMsg('✓ Solicitud cancelada.');
      setCancelTarget(null);
      fetchRows(page);
    } finally {
      setCancelLoading(false);
    }
  }

  async function copyCoupon(row: Row) {
    try {
      const res = await fetch(`/api/admin/reviews/${row.id}`, { headers: { 'x-admin-key': adminKey } });
      const data = await res.json();
      const code = data?.coupon?.code;
      if (!code) { setMsg('Esta solicitud no tiene cupón.'); return; }
      await navigator.clipboard.writeText(code);
      setCopiedId(row.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setMsg('No se pudo copiar el cupón.');
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-6 w-auto" />
          <span className="text-gray-300">|</span>
          <span className="text-[14px] font-semibold text-gray-900">Reseñas</span>
          {total > 0 && <span className="text-[12px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{total}</span>}
          <Link href="/admin/pedidos" className="text-[12px] text-gray-400 hover:text-black ml-1">Pedidos →</Link>
          <Link href="/admin/reviews/nueva-tanda" className="text-[12px] text-gray-400 hover:text-black ml-1">Nueva tanda →</Link>
          <Link href="/admin/reviews/settings" className="text-[12px] text-gray-400 hover:text-black ml-1">Configuración →</Link>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem(WP_SECRET_KEY); setAuthed(false); setAdminKey(''); }}
          className="text-[11px] text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
        >
          Salir
        </button>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-5">
        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:border-gray-400"
              placeholder="Buscar por orden, nombre o email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:border-gray-400"
            >
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select
              value={hasResponse}
              onChange={e => setHasResponse(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:border-gray-400"
            >
              <option value="">Respondidas: todas</option>
              <option value="yes">Con respuesta</option>
              <option value="no">Sin respuesta</option>
            </select>
            <select
              value={hasCoupon}
              onChange={e => setHasCoupon(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:border-gray-400"
            >
              <option value="">Cupón: todos</option>
              <option value="yes">Con cupón emitido</option>
              <option value="no">Sin cupón</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2 items-center text-[12px] text-gray-500">
            <span>Despacho:</span>
            <input type="date" value={dispatchedFrom} onChange={e => setDispatchedFrom(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-[12px]" />
            <span>a</span>
            <input type="date" value={dispatchedTo} onChange={e => setDispatchedTo(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-[12px]" />
            <span className="ml-3">Envío:</span>
            <input type="date" value={sentFrom} onChange={e => setSentFrom(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-[12px]" />
            <span>a</span>
            <input type="date" value={sentTo} onChange={e => setSentTo(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-[12px]" />
            {(status || search || dispatchedFrom || dispatchedTo || sentFrom || sentTo || hasResponse || hasCoupon) && (
              <button
                onClick={() => { setStatus(''); setSearch(''); setDispatchedFrom(''); setDispatchedTo(''); setSentFrom(''); setSentTo(''); setHasResponse(''); setHasCoupon(''); }}
                className="ml-2 text-[11px] text-gray-400 hover:text-black underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {msg && (
          <div className={`mb-3 px-3 py-2 rounded-lg text-[12px] ${msg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {msg}
          </div>
        )}

        {/* Tabla */}
        {loading ? (
          <div className="text-center py-20 text-[13px] text-gray-400">Cargando solicitudes...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 text-[13px] text-gray-400">No hay solicitudes que coincidan con el filtro</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
            <div className="min-w-[1100px]">
              <div className="grid grid-cols-[90px_1fr_110px_1fr_100px_90px_110px_110px_1fr] gap-3 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Orden</div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Cliente</div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Estado</div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Fechas</div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center">Reseñas</div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Cupón</div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Respondida</div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">&nbsp;</div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</div>
              </div>

              {rows.map((row, idx) => (
                <div
                  key={row.id}
                  className={`grid grid-cols-[90px_1fr_110px_1fr_100px_90px_110px_110px_1fr] gap-3 px-4 py-3 items-center border-b border-gray-50 hover:bg-gray-50 transition-colors ${idx === rows.length - 1 ? 'border-b-0' : ''}`}
                >
                  <div>
                    <Link href={`/admin/reviews/${row.id}`} className="text-[13px] font-bold text-black hover:underline">
                      #{row.order_number}
                    </Link>
                  </div>

                  <div className="min-w-0">
                    <Link href={`/admin/reviews/${row.id}`} className="text-[13px] font-medium text-gray-900 hover:underline truncate block">
                      {row.customer_name || '—'}
                    </Link>
                    <div className="text-[11px] text-gray-400 truncate">{row.customer_email}</div>
                  </div>

                  <div>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[row.status] || 'bg-gray-100 text-gray-600'}`}>
                      {row.status_label}
                    </span>
                    {row.fail_reason && (
                      <div className="text-[10px] text-red-500 mt-0.5 truncate max-w-[100px]" title={row.fail_reason}>{row.fail_reason}</div>
                    )}
                  </div>

                  <div className="text-[11px] text-gray-500 leading-tight">
                    <div>Despacho: {row.dispatched_at ? fmtDate(row.dispatched_at) : '—'}</div>
                    <div>Programada: {fmtDate(row.scheduled_for)}</div>
                    <div>Enviada: {fmtDate(row.sent_at)}</div>
                  </div>

                  <div className="text-center text-[13px] font-medium text-gray-700">
                    {row.received_count}/{row.reviewable_count}
                  </div>

                  <div className="text-[12px]">
                    {row.coupon_id ? (
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-gray-600">{row.coupon_code_masked}</span>
                        <button
                          onClick={() => copyCoupon(row)}
                          className="text-[10px] text-gray-400 hover:text-black"
                          title="Copiar código completo"
                        >
                          {copiedId === row.id ? 'Copiado' : 'Copiar'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>

                  <div className="text-right text-[11px] text-gray-500">{fmtDate(row.responded_at)}</div>

                  <div />

                  <div className="flex justify-end gap-2 flex-wrap">
                    {(row.status === 'sent' || row.status === 'failed') && (
                      <button
                        onClick={() => doAction(row, 'resend')}
                        disabled={busyId === row.id}
                        className="text-[11px] font-medium text-gray-600 hover:text-black border border-gray-200 rounded-md px-2 py-1 disabled:opacity-40"
                      >
                        {busyId === row.id ? '...' : 'Reenviar'}
                      </button>
                    )}
                    {row.status === 'failed' && (
                      <button
                        onClick={() => doAction(row, 'retry')}
                        disabled={busyId === row.id}
                        className="text-[11px] font-medium text-amber-700 hover:text-amber-900 border border-amber-200 bg-amber-50 rounded-md px-2 py-1 disabled:opacity-40"
                      >
                        {busyId === row.id ? '...' : 'Reintentar'}
                      </button>
                    )}
                    {(row.status === 'scheduled' || row.status === 'sent') && (
                      <button
                        onClick={() => requestCancel(row)}
                        disabled={busyId === row.id}
                        className="text-[11px] font-medium text-red-600 hover:text-red-800 border border-red-200 rounded-md px-2 py-1 disabled:opacity-40"
                      >
                        Cancelar
                      </button>
                    )}
                    <Link
                      href={`/admin/reviews/${row.id}`}
                      className="text-[11px] font-medium text-white bg-black hover:bg-gray-800 rounded-md px-2 py-1"
                    >
                      Ver
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Paginación */}
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

      {/* Modal de cancelación — acción irreversible, pide confirmación */}
      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !cancelLoading && setCancelTarget(null)}
        >
          <div className="bg-white rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold text-gray-900 mb-2">¿Cancelar esta solicitud?</h3>
            <p className="text-[13px] text-gray-500 mb-5">
              Orden #{cancelTarget.order_number} — {cancelTarget.customer_name}. Esta acción desprograma el envío pendiente (si lo hay) y marca la solicitud como cancelada. No se puede deshacer.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelLoading}
                className="px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40"
              >
                Volver
              </button>
              <button
                onClick={confirmCancel}
                disabled={cancelLoading}
                className="px-4 py-2 text-[13px] font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-40"
              >
                {cancelLoading ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[13px] text-gray-400">Cargando...</div>}>
      <ReviewsDashboard />
    </Suspense>
  );
}
