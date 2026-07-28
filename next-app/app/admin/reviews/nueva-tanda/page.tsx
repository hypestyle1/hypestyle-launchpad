'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const WP_SECRET_KEY = 'hype_admin_key';

type EligibleOrder = {
  order_id: number;
  order_number: string;
  customer_email: string;
  customer_name: string;
  date: string | null;
  status: string;
  products: string[];
  already_dispatched: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  processing: 'En proceso',
  completed: 'Completada',
};

export default function NuevaTandaPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [keyInput, setKeyInput] = useState('');

  const [rows, setRows] = useState<EligibleOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const perPage = 20;
  const [search, setSearch] = useState('');
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');
  const [results, setResults] = useState<{ order_id: number; status: string; reason?: string }[] | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(WP_SECRET_KEY);
    if (stored) { setAdminKey(stored); setAuthed(true); }
  }, []);

  function login() {
    sessionStorage.setItem(WP_SECRET_KEY, keyInput);
    setAdminKey(keyInput);
    setAuthed(true);
  }

  const fetchRows = useCallback(async (p: number) => {
    if (!adminKey) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: String(perPage) });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/reviews/eligible-orders?${params}`, { headers: { 'x-admin-key': adminKey } });
      if (res.status === 403) { setAuthed(false); sessionStorage.removeItem(WP_SECRET_KEY); return; }
      const data = await res.json();
      setRows(data.items || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch {
      setMsg('Error al cargar las órdenes elegibles.');
    } finally {
      setLoading(false);
    }
  }, [adminKey, search]);

  useEffect(() => {
    if (!authed || !adminKey) return;
    setPage(1);
    fetchRows(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, adminKey]);

  useEffect(() => {
    if (!authed || !adminKey) return;
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => { setPage(1); fetchRows(1); }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (!authed || !adminKey) return;
    fetchRows(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function toggle(orderId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId); else next.add(orderId);
      return next;
    });
  }

  function toggleAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = rows.every((r) => next.has(r.order_id));
      rows.forEach((r) => { if (allSelected) next.delete(r.order_id); else next.add(r.order_id); });
      return next;
    });
  }

  async function confirmBatch() {
    setSending(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/reviews/bulk-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ order_ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || data.message || 'No se pudo programar la tanda.');
        return;
      }
      setResults(data.results || []);
      setSelected(new Set());
      fetchRows(page);
    } catch {
      setMsg('Error al conectar.');
    } finally {
      setSending(false);
      setConfirmOpen(false);
    }
  }

  const selectedRows = rows.filter((r) => selected.has(r.order_id));

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
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
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
          <span className="text-[14px] font-semibold text-gray-900">Nueva tanda</span>
          <Link href="/admin/reviews" className="text-[12px] text-gray-400 hover:text-black ml-1">← Solicitudes</Link>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem(WP_SECRET_KEY); setAuthed(false); setAdminKey(''); }}
          className="text-[11px] text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
        >
          Salir
        </button>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 py-5">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-[12px] text-amber-900 leading-relaxed">
          Esto marca las órdenes seleccionadas como despachadas y programa la solicitud de reseña (el mismo flujo que el botón individual en cada pedido). Si el sistema está en <strong>modo test</strong>, solo se enviará realmente a las órdenes de la allowlist configurada — el resto queda programado pero no se envía. Revisá <Link href="/admin/reviews/settings" className="underline">Configuración</Link> antes de confirmar una tanda real.
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
          <input
            type="text"
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:border-gray-400"
            placeholder="Buscar por orden, nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {msg && <div className="mb-3 px-3 py-2 rounded-lg text-[12px] bg-red-50 text-red-600">{msg}</div>}

        {results && (
          <div className="mb-4 bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[13px] font-semibold text-gray-900">Resultado de la tanda</h3>
              <button onClick={() => setResults(null)} className="text-[11px] text-gray-400 hover:text-black">Cerrar</button>
            </div>
            <div className="space-y-1">
              {results.map((r) => (
                <div key={r.order_id} className="flex items-center justify-between text-[12px] border-b border-gray-50 py-1 last:border-0">
                  <span className="text-gray-700">Orden #{r.order_id}</span>
                  <span className={
                    r.status === 'dispatched' ? 'text-emerald-700 font-medium'
                      : r.status === 'dispatched_no_request' ? 'text-amber-700'
                      : r.status === 'already_dispatched' ? 'text-gray-500'
                      : 'text-amber-700'
                  }>
                    {r.status === 'dispatched' && 'Despachada y programada'}
                    {r.status === 'dispatched_no_request' && 'Despachada, pero NO programada (modo test / email desactivado — revisá Configuración)'}
                    {r.status === 'already_dispatched' && 'Ya estaba despachada'}
                    {r.status === 'skipped' && `Omitida (${r.reason === 'already_has_request' ? 'ya tenía solicitud' : 'no elegible'})`}
                    {r.status === 'error' && 'Error — orden no encontrada'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-[13px] text-gray-400">Cargando órdenes...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 text-[13px] text-gray-400">No hay órdenes elegibles para una nueva solicitud.</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[36px_90px_1fr_110px_1fr_100px] gap-3 px-4 py-2.5 border-b border-gray-100 bg-gray-50 items-center">
                <input type="checkbox" checked={rows.length > 0 && rows.every((r) => selected.has(r.order_id))} onChange={toggleAllOnPage} />
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Orden</div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Cliente</div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Fecha</div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Productos elegibles</div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Estado</div>
              </div>

              {rows.map((r, idx) => (
                <div
                  key={r.order_id}
                  className={`grid grid-cols-[36px_90px_1fr_110px_1fr_100px] gap-3 px-4 py-3 items-center border-b border-gray-50 hover:bg-gray-50 transition-colors ${idx === rows.length - 1 ? 'border-b-0' : ''}`}
                >
                  <input type="checkbox" checked={selected.has(r.order_id)} onChange={() => toggle(r.order_id)} />
                  <div className="text-[13px] font-bold text-black">#{r.order_number}</div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-gray-900 truncate">{r.customer_name || '—'}</div>
                    <div className="text-[11px] text-gray-400 truncate">{r.customer_email}</div>
                  </div>
                  <div className="text-[12px] text-gray-500">{r.date || '—'}</div>
                  <div className="text-[12px] text-gray-600 truncate" title={r.products.join(', ')}>
                    {r.products.length > 0 ? r.products.join(', ') : <span className="text-gray-300">Sin productos elegibles</span>}
                  </div>
                  <div>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {STATUS_LABELS[r.status] || r.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-[12px] font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40">
              ← Anterior
            </button>
            <span className="text-[12px] text-gray-500">Página {page} de {pages} ({total} elegibles)</span>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
              className="px-3 py-1.5 text-[12px] font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40">
              Siguiente →
            </button>
          </div>
        )}
      </div>

      {/* Barra flotante de selección */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-black text-white px-6 py-3 flex items-center justify-between z-20">
          <span className="text-[13px]">{selected.size} orden(es) seleccionada(s)</span>
          <div className="flex gap-2">
            <button onClick={() => setSelected(new Set())} className="text-[12px] text-gray-300 hover:text-white px-3 py-1.5">
              Deseleccionar
            </button>
            <button onClick={() => setConfirmOpen(true)} className="text-[12px] font-semibold bg-white text-black rounded-md px-4 py-1.5 hover:bg-gray-100">
              Confirmar tanda →
            </button>
          </div>
        </div>
      )}

      {/* Confirmación explícita antes de despachar */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !sending && setConfirmOpen(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold text-gray-900 mb-2">¿Programar solicitud para {selectedRows.length} orden(es)?</h3>
            <p className="text-[13px] text-gray-500 mb-4">
              Se va a marcar cada orden como despachada y programar el email según el retraso configurado. Esta acción no envía nada de inmediato.
            </p>
            <div className="space-y-1 mb-5 border border-gray-100 rounded-lg divide-y divide-gray-50 max-h-[240px] overflow-y-auto">
              {selectedRows.map((r) => (
                <div key={r.order_id} className="px-3 py-2 text-[12px] flex items-center justify-between">
                  <span className="font-medium text-gray-800">#{r.order_number} — {r.customer_name}</span>
                  <span className="text-gray-400">{r.customer_email}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmOpen(false)} disabled={sending}
                className="px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40">
                Volver
              </button>
              <button onClick={confirmBatch} disabled={sending}
                className="px-4 py-2 text-[13px] font-semibold text-white bg-black hover:bg-gray-900 rounded-lg disabled:opacity-40">
                {sending ? 'Programando...' : 'Sí, programar tanda'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
