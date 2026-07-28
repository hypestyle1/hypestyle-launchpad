'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const WP_SECRET_KEY = 'hype_admin_key';

type Product = {
  order_item_id: number;
  product_id: number;
  name: string;
  image: string;
  reviewed: boolean;
  rating: number | null;
  text: string | null;
  moderation: 'approved' | 'pending' | 'spam' | 'trash' | null;
  moderation_label: string | null;
  wp_admin_edit_url: string | null;
};

type Coupon = {
  id: number;
  code: string;
  value: number;
  type: string;
  expires_at: string | null;
  usage_count: number;
  usage_limit: number;
  individual_use: boolean;
  used: boolean;
};

type Detail = {
  id: number;
  order: { id: number; number: string; date: string };
  customer_name: string;
  customer_email: string;
  status: string;
  status_label: string;
  fail_reason: string | null;
  dispatched_at: string | null;
  dispatched_source: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
  opened_at: string | null;
  responded_at: string | null;
  expires_at: string | null;
  used_at: string | null;
  products: Product[];
  coupon: Coupon | null;
  logs: string[];
};

const DISPATCH_SOURCE_LABELS: Record<string, string> = {
  manual_button: 'Botón manual "Marcar como despachado"',
  status_enviado: 'Estado "enviado" (no funcional hoy)',
  tracking_number: 'Aparición de guía de tracking (fallback)',
};

const MODERATION_LABELS: Record<string, string> = {
  approved: 'Aprobada', pending: 'Pendiente', spam: 'Spam', trash: 'Papelera',
};
const MODERATION_COLORS: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-800', pending: 'bg-yellow-100 text-yellow-800',
  spam: 'bg-red-100 text-red-700', trash: 'bg-gray-100 text-gray-500',
};

function fmtDate(s: string | null) {
  if (!s) return '—';
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed]     = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [detail, setDetail]     = useState<Detail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [msg, setMsg]           = useState('');
  const [busy, setBusy]         = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [copied, setCopied]     = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(WP_SECRET_KEY);
    if (stored) { setAdminKey(stored); setAuthed(true); }
  }, []);

  const load = useCallback(async () => {
    if (!authed || !adminKey || !id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { headers: { 'x-admin-key': adminKey } });
      if (res.status === 403) { setAuthed(false); return; }
      const data = await res.json();
      if (data.code || data.error) { setError(data.message || data.error); return; }
      setDetail(data);
    } catch {
      setError('Error al cargar la solicitud');
    } finally {
      setLoading(false);
    }
  }, [authed, adminKey, id]);

  useEffect(() => { load(); }, [load]);

  function login() {
    sessionStorage.setItem(WP_SECRET_KEY, keyInput);
    setAdminKey(keyInput);
    setAuthed(true);
  }

  async function doAction(action: 'resend' | 'cancel' | 'retry') {
    if (busy) return;
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch(`/api/admin/reviews/${id}/${action}`, { method: 'POST', headers: { 'x-admin-key': adminKey } });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error || data.message || 'No se pudo completar la acción.'); return; }
      setMsg('✓ Acción realizada correctamente.');
      load();
    } catch {
      setMsg('Error al conectar.');
    } finally {
      setBusy(false);
      setCancelModal(false);
    }
  }

  async function copyCoupon() {
    if (!detail?.coupon) return;
    await navigator.clipboard.writeText(detail.coupon.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[13px] text-gray-400">Cargando...</div>;
  if (error || !detail) return <div className="min-h-screen flex items-center justify-center text-[13px] text-red-500">{error || 'No encontrado'}</div>;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/admin/reviews" className="text-[12px] text-gray-400 hover:text-black">← Reseñas</Link>
          <span className="text-gray-300">|</span>
          <span className="text-[14px] font-semibold text-gray-900">Solicitud #{detail.id} — Orden #{detail.order.number}</span>
        </div>
        <Link href={`/admin/pedidos/${detail.order.id}`} className="text-[12px] text-gray-400 hover:text-black">Ver pedido →</Link>
      </div>

      <div className="max-w-[900px] mx-auto px-4 py-5 space-y-4">
        {msg && (
          <div className={`px-3 py-2 rounded-lg text-[12px] ${msg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {msg}
          </div>
        )}

        {/* Datos básicos */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
          <h2 className="text-[13px] font-semibold text-gray-900 mb-3">Datos de la solicitud</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
            <div><span className="text-gray-400">Cliente:</span> {detail.customer_name || '—'}</div>
            <div><span className="text-gray-400">Email:</span> {detail.customer_email}</div>
            <div><span className="text-gray-400">Estado:</span> <span className="font-medium">{detail.status_label}</span></div>
            <div><span className="text-gray-400">Fecha de la orden:</span> {fmtDate(detail.order.date)}</div>
            <div><span className="text-gray-400">Despacho:</span> {fmtDate(detail.dispatched_at)}</div>
            <div><span className="text-gray-400">Origen del despacho:</span> {detail.dispatched_source ? (DISPATCH_SOURCE_LABELS[detail.dispatched_source] || detail.dispatched_source) : '—'}</div>
            <div><span className="text-gray-400">Programada para:</span> {fmtDate(detail.scheduled_for)}</div>
            <div><span className="text-gray-400">Enviada:</span> {fmtDate(detail.sent_at)}</div>
            <div><span className="text-gray-400">Apertura:</span> {detail.opened_at ? fmtDate(detail.opened_at) : 'Sin medición confiable disponible'}</div>
            <div><span className="text-gray-400">Respondida:</span> {fmtDate(detail.responded_at)}</div>
            <div><span className="text-gray-400">Link vence:</span> {fmtDate(detail.expires_at)}</div>
            {detail.fail_reason && <div className="col-span-2 text-red-600"><span className="text-gray-400">Motivo de falla:</span> {detail.fail_reason}</div>}
          </div>

          <div className="flex gap-2 flex-wrap mt-4">
            {(detail.status === 'sent' || detail.status === 'failed') && (
              <button onClick={() => doAction('resend')} disabled={busy} className="text-[12px] font-medium text-gray-700 hover:text-black border border-gray-200 rounded-md px-3 py-1.5 disabled:opacity-40">
                {busy ? 'Enviando...' : 'Reenviar email'}
              </button>
            )}
            {detail.status === 'failed' && (
              <button onClick={() => doAction('retry')} disabled={busy} className="text-[12px] font-medium text-amber-700 border border-amber-200 bg-amber-50 rounded-md px-3 py-1.5 disabled:opacity-40">
                {busy ? 'Reintentando...' : 'Reintentar'}
              </button>
            )}
            {(detail.status === 'scheduled' || detail.status === 'sent') && (
              <button onClick={() => setCancelModal(true)} disabled={busy} className="text-[12px] font-medium text-red-600 border border-red-200 rounded-md px-3 py-1.5 disabled:opacity-40">
                Cancelar solicitud
              </button>
            )}
          </div>
        </div>

        {/* Productos reseñables */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
          <h2 className="text-[13px] font-semibold text-gray-900 mb-3">Productos reseñables ({detail.products.filter(p => p.reviewed).length}/{detail.products.length})</h2>
          <div className="space-y-3">
            {detail.products.map(p => (
              <div key={p.order_item_id} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  {p.image && <img src={p.image} alt="" className="w-12 h-12 object-cover rounded-md flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900">{p.name}</p>
                    {p.reviewed ? (
                      <>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[12px]">{'★'.repeat(p.rating || 0)}{'☆'.repeat(5 - (p.rating || 0))}</span>
                          {p.moderation && (
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${MODERATION_COLORS[p.moderation]}`}>
                              {p.moderation_label}
                            </span>
                          )}
                        </div>
                        {p.text && <p className="text-[12px] text-gray-600 mt-1">{p.text}</p>}
                        {p.wp_admin_edit_url && (
                          <a href={p.wp_admin_edit_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-600 hover:underline mt-1 inline-block">
                            Ver/moderar en WordPress →
                          </a>
                        )}
                      </>
                    ) : (
                      <p className="text-[11px] text-gray-400 mt-1">Sin reseña todavía</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cupón */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
          <h2 className="text-[13px] font-semibold text-gray-900 mb-3">Cupón</h2>
          {detail.coupon ? (
            <div className="text-[12px] space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[14px] font-semibold">{detail.coupon.code}</span>
                <button onClick={copyCoupon} className="text-[11px] text-gray-400 hover:text-black border border-gray-200 rounded px-2 py-0.5">
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <div><span className="text-gray-400">Valor:</span> {detail.coupon.value}% OFF</div>
              <div><span className="text-gray-400">Vence:</span> {detail.coupon.expires_at || 'Sin vencimiento'}</div>
              <div><span className="text-gray-400">Uso:</span> {detail.coupon.usage_count}/{detail.coupon.usage_limit} {detail.coupon.used && '(ya usado)'}</div>
              <div><span className="text-gray-400">Uso individual:</span> {detail.coupon.individual_use ? 'Sí' : 'No'}</div>
            </div>
          ) : (
            <p className="text-[12px] text-gray-400">No se generó ningún cupón para esta solicitud.</p>
          )}
        </div>

        {/* Historial */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
          <h2 className="text-[13px] font-semibold text-gray-900 mb-3">Historial de eventos</h2>
          {detail.logs.length > 0 ? (
            <div className="text-[11px] font-mono text-gray-500 space-y-1 max-h-64 overflow-y-auto">
              {detail.logs.map((line, i) => <div key={i}>{line}</div>)}
            </div>
          ) : (
            <p className="text-[12px] text-gray-400">Sin eventos registrados todavía.</p>
          )}
        </div>
      </div>

      {/* Modal de cancelación */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && setCancelModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold text-gray-900 mb-2">¿Cancelar esta solicitud?</h3>
            <p className="text-[13px] text-gray-500 mb-5">No se puede deshacer. La solicitud queda marcada como cancelada, conservando su historial.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCancelModal(false)} disabled={busy} className="px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40">Volver</button>
              <button onClick={() => doAction('cancel')} disabled={busy} className="px-4 py-2 text-[13px] font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-40">
                {busy ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
