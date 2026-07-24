'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const WP_SECRET_KEY = 'hype_admin_key';
const SITE_URL = 'https://hypestyle.com.ar';

type Item = { id: number; name: string; quantity: number; price: number; total: number; size: string; image: string; dorsalName?: string; dorsalNumber?: string };
type Address = { address_1: string; address_2: string; city: string; state: string; postcode: string };
type Note = { id: number; note: string; date: string };
type CustomerHistory = { orderCount: number; totalSpent: number; firstOrderDate: string };
type Order = {
  id: number; number: string; status: string; date: string; datePaid: string; dateModified: string;
  customer: { first_name: string; last_name: string; email: string; phone: string; dni: string; instagram: string };
  customerHistory: CustomerHistory;
  billing: Address; shipping: Address & { first_name: string; last_name: string };
  items: Item[];
  shipping_lines: { method_title: string; total: number }[];
  total: number; shipping_total: number; discount_total: number;
  feeLines: { id: number; name: string; total: number }[];
  isMayorista: boolean;
  isGift: boolean;
  payment_method: string; payment_method_title: string;
  customer_note: string; order_key: string;
  adminNote: string;
  viaCargoSucursal: string;
  tracking: string; notified: string; andreani: string; pedido_id: string;
  notes: Note[];
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', processing: 'Procesando', 'on-hold': 'En espera',
  enviado: 'Enviado', completed: 'Completado', cancelled: 'Cancelado',
  refunded: 'Reembolsado', failed: 'Fallido',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800', processing: 'bg-blue-100 text-blue-800',
  'on-hold': 'bg-orange-100 text-orange-800', enviado: 'bg-green-100 text-green-700',
  completed: 'bg-emerald-100 text-emerald-800', cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-purple-100 text-purple-700', failed: 'bg-red-100 text-red-700',
};

const STATUS_OPTIONS = ['pending','processing','on-hold','enviado','completed','cancelled'];

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(s: string) {
  return new Date(s).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
  });
}

function waLink(phone: string, name: string, orderNum: string) {
  const digits = phone.replace(/\D/g, '');
  const clean  = digits.startsWith('0') ? digits.slice(1) : digits;
  const intl   = clean.startsWith('54') ? clean : '549' + clean;
  const msg    = encodeURIComponent(`Hola ${name}, te escribimos en relación a tu pedido #${orderNum} en Hypestyle. `);
  return `https://wa.me/${intl}?text=${msg}`;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed]     = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [order, setOrder]       = useState<Order | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [status, setStatus]     = useState('');
  const [statusSaving, setStatusSaving]       = useState(false);
  const [cancelModal, setCancelModal]         = useState(false);
  const [cancelRestoreStock, setCancelRestoreStock] = useState(true);
  const [cancelNotify, setCancelNotify]       = useState(true);
  const [cancelLoading, setCancelLoading]     = useState(false);
  const [tracking, setTracking] = useState('');
  const [trackSaving, setTrackSaving]   = useState(false);
  const [trackMsg, setTrackMsg] = useState('');
  const [syncingAndreani, setSyncingAndreani] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');
  const [noteText, setNoteText]     = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteMsg, setNoteMsg]       = useState('');

  // Agregar producto / aplicar descuento sin cancelar el pedido
  const [productCatalog, setProductCatalog] = useState<{ id: number; name: string; image: string }[]>([]);
  const [productQuery, setProductQuery]     = useState('');
  const [selectedProduct, setSelectedProduct] = useState<{ id: number; name: string } | null>(null);
  const [variations, setVariations] = useState<{ id: number | null; size: string; price: number }[]>([]);
  const [selectedVariationId, setSelectedVariationId] = useState<number | null | 'none'>('none');
  const [addQty, setAddQty]       = useState(1);
  const [addingItem, setAddingItem] = useState(false);
  const [addItemMsg, setAddItemMsg] = useState('');
  const [discountName, setDiscountName]     = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [discountMsg, setDiscountMsg] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem(WP_SECRET_KEY);
    if (stored) { setAdminKey(stored); setAuthed(true); }
  }, []);

  useEffect(() => {
    if (!authed || !adminKey || !id) return;
    setLoading(true);
    fetch(`/api/admin/orders/${id}`, { headers: { 'x-admin-key': adminKey } })
      .then(r => {
        if (r.status === 403) { setAuthed(false); return null; }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        if (data.error) { setError(data.error); return; }
        setOrder(data);
        setStatus(data.status);
        setTracking(data.tracking || data.andreani || '');
        setNoteText(data.adminNote || '');
      })
      .catch(() => setError('Error al cargar el pedido'))
      .finally(() => setLoading(false));
  }, [authed, adminKey, id]);

  function login() {
    sessionStorage.setItem(WP_SECRET_KEY, keyInput);
    setAdminKey(keyInput);
    setAuthed(true);
  }

  async function saveStatus(newStatus: string) {
    if (!order) return;
    if (newStatus === 'cancelled') { setCancelModal(true); return; }
    setStatusSaving(true);
    setStatus(newStatus);
    await fetch('/api/admin/set-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ orderId: order.id, status: newStatus }),
    });
    setOrder(prev => prev ? { ...prev, status: newStatus } : prev);
    setStatusSaving(false);
  }

  async function confirmCancel() {
    if (!order) return;
    setCancelLoading(true);
    await fetch('/api/admin/set-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ orderId: order.id, status: 'cancelled', restoreStock: cancelRestoreStock }),
    });
    setStatus('cancelled');
    setOrder(prev => prev ? { ...prev, status: 'cancelled' } : prev);
    if (cancelNotify) {
      await fetch(`/api/admin/send-order-emails?secret=hs2026&order_id=${order.id}&action=cancellation`);
    }
    setCancelLoading(false);
    setCancelModal(false);
  }

  async function saveTracking() {
    if (!order) return;
    setTrackSaving(true);
    setTrackMsg('');
    const res = await fetch('/api/admin/set-tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ orderId: order.id, trackingNumber: tracking }),
    });
    const data = await res.json();
    setTrackMsg(data.ok ? (data.notified ? '✓ Guardado · Email enviado al cliente' : '✓ Guardado') : 'Error al guardar');
    if (data.ok) setOrder(prev => prev ? { ...prev, tracking, notified: data.notified ? '1' : prev.notified } : prev);
    setTrackSaving(false);
  }

  async function syncAndreaniTracking() {
    if (!order) return;
    setSyncingAndreani(true);
    setTrackMsg('Consultando Andreani...');
    try {
      const res = await fetch(
        `https://lightpink-rook-704850.hostingersite.com/wp-json/hs/v1/sync-tracking/${order.id}?key=hs2026`
      );
      const data = await res.json();
      if (data.ok && data.tracking) {
        setTracking(data.tracking);
        setTrackMsg(`✓ Tracking sincronizado: ${data.tracking}`);
        setOrder(prev => prev ? { ...prev, tracking: data.tracking } : prev);
      } else {
        setTrackMsg(`Sin tracking en Andreani: ${data.message || data.error || 'Sin pedido_id'}`);
      }
    } catch {
      setTrackMsg('Error al conectar con Andreani');
    } finally {
      setSyncingAndreani(false);
    }
  }

  async function sendEmail(action: 'confirmation' | 'tracking' | 'abandoned') {
    if (!order) return;
    setEmailMsg('Enviando...');
    const res = await fetch(`/api/admin/send-order-emails?secret=hs2026&order_id=${order.id}&action=${action}`);
    const data = await res.json();
    const labels: Record<string, string> = { confirmation: 'confirmación', tracking: 'seguimiento', abandoned: 'carrito abandonado' };
    setEmailMsg(data.ok ? `✓ Email de ${labels[action]} enviado` : `Error: ${data.error}`);
  }

  useEffect(() => {
    if (!authed || !adminKey) return;
    fetch('/api/admin/product-costs', { headers: { 'x-admin-key': adminKey } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setProductCatalog(data.products || []); })
      .catch(() => {});
  }, [authed, adminKey]);

  function selectProduct(p: { id: number; name: string }) {
    setSelectedProduct(p);
    setProductQuery(p.name);
    setVariations([]);
    setSelectedVariationId('none');
    fetch(`/api/admin/products/${p.id}/variations`, { headers: { 'x-admin-key': adminKey } })
      .then(r => r.json())
      .then(data => {
        const vs = data.variations || [];
        setVariations(vs);
        if (vs.length === 1 && !vs[0].size) setSelectedVariationId(vs[0].id);
      });
  }

  async function reloadOrder() {
    const r = await fetch(`/api/admin/orders/${id}`, { headers: { 'x-admin-key': adminKey } });
    const data = await r.json();
    if (data && !data.error) setOrder(data);
  }

  async function addItem() {
    if (!order || !selectedProduct || selectedVariationId === 'none' || addQty < 1) return;
    setAddingItem(true);
    setAddItemMsg('');
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/add-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({
          items: [{ productId: selectedProduct.id, variationId: selectedVariationId, quantity: addQty }],
        }),
      });
      const data = await res.json();
      if (!res.ok) { setAddItemMsg(data.error || 'Error al agregar'); return; }
      setAddItemMsg('✓ Agregado');
      setSelectedProduct(null); setProductQuery(''); setVariations([]); setSelectedVariationId('none'); setAddQty(1);
      await reloadOrder();
    } finally {
      setAddingItem(false);
    }
  }

  async function applyDiscount() {
    if (!order) return;
    const amount = Number(discountAmount);
    if (!amount || amount <= 0) return;
    setApplyingDiscount(true);
    setDiscountMsg('');
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/add-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ items: [], discountName: discountName || 'Descuento', discountAmount: amount }),
      });
      const data = await res.json();
      if (!res.ok) { setDiscountMsg(data.error || 'Error al aplicar el descuento'); return; }
      setDiscountMsg('✓ Aplicado');
      setDiscountName(''); setDiscountAmount('');
      await reloadOrder();
    } finally {
      setApplyingDiscount(false);
    }
  }

  const filteredProducts = productQuery.length > 1
    ? productCatalog.filter(p => p.name.toLowerCase().includes(productQuery.toLowerCase())).slice(0, 8)
    : [];

  async function saveNote() {
    if (!order) return;
    setNoteSaving(true);
    setNoteMsg('');
    const res = await fetch('/api/admin/order-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ orderId: order.id, note: noteText }),
    });
    setNoteMsg(res.ok ? '✓ Nota guardada' : 'Error al guardar');
    setNoteSaving(false);
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
          <Link href="/admin/pedidos" className="text-gray-400 hover:text-black transition-colors">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </Link>
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-6 w-auto" />
          <span className="text-gray-300">|</span>
          <Link href="/admin/pedidos" className="text-[13px] text-gray-500 hover:text-black">Pedidos</Link>
          <span className="text-gray-300">/</span>
          {order && <span className="text-[13px] font-semibold text-gray-900">#{order.number}</span>}
        </div>
        {order && (
          <div className="flex items-center gap-2">
            {order.isGift && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-pink-100 text-pink-700">
                🎁 Regalo — no factura
              </span>
            )}
            {!['cancelled', 'failed'].includes(order.status) && (
              order.datePaid ? (
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                  ✓ Pagado
                </span>
              ) : (
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                  Pendiente de pago
                </span>
              )
            )}
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
              {STATUS_LABELS[order.status] || order.status}
            </span>
            <span className="text-[11px] text-gray-400">{fmtDate(order.date)}</span>
          </div>
        )}
      </div>

      {/* Cancel modal */}
      {cancelModal && order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-[15px] font-bold text-gray-900 mb-1">Cancelar pedido #{order.number}</h2>
            <p className="text-[13px] text-gray-500 mb-5">Confirmá las acciones que querés ejecutar al cancelar.</p>

            <label className="flex items-start gap-3 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={cancelRestoreStock}
                onChange={e => setCancelRestoreStock(e.target.checked)}
                className="mt-0.5 rounded border-gray-300"
              />
              <div>
                <div className="text-[13px] font-medium text-gray-900">Restaurar stock</div>
                <div className="text-[11px] text-gray-400">Las unidades vuelven al inventario de cada producto.</div>
              </div>
            </label>

            <label className="flex items-start gap-3 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={cancelNotify}
                onChange={e => setCancelNotify(e.target.checked)}
                className="mt-0.5 rounded border-gray-300"
              />
              <div>
                <div className="text-[13px] font-medium text-gray-900">Notificar al cliente</div>
                <div className="text-[11px] text-gray-400">Se envía un email a {order.customer.email} informando la cancelación.</div>
              </div>
            </label>

            <div className="flex gap-2">
              <button
                onClick={() => { setCancelModal(false); setStatus(order.status); }}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-[13px] font-medium text-gray-600 hover:bg-gray-50"
              >
                Volver
              </button>
              <button
                onClick={confirmCancel}
                disabled={cancelLoading}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-[13px] font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {cancelLoading ? 'Cancelando...' : 'Confirmar cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-32 text-[13px] text-gray-400">Cargando pedido...</div>
      ) : error ? (
        <div className="flex items-center justify-center py-32 text-[13px] text-red-500">{error}</div>
      ) : !order ? null : (
        <div className="max-w-[1100px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

          {/* LEFT COLUMN */}
          <div className="space-y-4">
            {/* Progreso del pedido */}
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <h2 className="text-[13px] font-semibold text-gray-900 mb-4">Progreso del pedido</h2>
              {order.status === 'cancelled' || order.status === 'failed' ? (
                <div className="text-[13px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {order.status === 'cancelled' ? 'Pedido cancelado' : 'Pago fallido'} · {fmtDate(order.date)}
                </div>
              ) : (
                <div className="flex items-start">
                  {(() => {
                    const steps = [
                      { label: 'Creado',      done: true,              date: order.date },
                      { label: 'Pagado',      done: !!order.datePaid,  date: order.datePaid },
                      { label: 'Empaquetado', done: !!order.pedido_id, date: '' },
                      { label: 'Enviado',     done: !!(order.tracking || order.andreani), date: '' },
                      { label: 'Completado',  done: order.status === 'completed', date: order.status === 'completed' ? order.dateModified : '' },
                    ];
                    return steps.map((step, i) => (
                      <div key={step.label} className="flex-1 flex flex-col items-center">
                        <div className="flex items-center w-full">
                          <div className={`flex-1 h-0.5 ${i === 0 ? 'invisible' : steps[i - 1].done ? 'bg-black' : 'bg-gray-100'}`} />
                          <div className={`w-6 h-6 flex-none rounded-full flex items-center justify-center text-[11px] font-bold ${
                            step.done ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {step.done ? '✓' : i + 1}
                          </div>
                          <div className={`flex-1 h-0.5 ${i === steps.length - 1 ? 'invisible' : step.done ? 'bg-black' : 'bg-gray-100'}`} />
                        </div>
                        <div className={`text-[10.5px] text-center font-medium mt-1.5 ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>
                          {step.label}
                        </div>
                        <div className="text-[9.5px] text-gray-400 text-center leading-tight h-3">
                          {step.date ? fmtDate(step.date) : ''}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>

            {/* Items */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="text-[13px] font-semibold text-gray-900">Productos</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {order.items.map(item => (
                  <div key={item.id} className="flex items-center gap-4 px-5 py-3">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover border border-gray-100 flex-none" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex-none" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-gray-900 truncate">
                        {item.name.replace(/\s*—\s*Talle\s*\S+/i, '')}
                      </div>
                      {item.size && <div className="text-[11px] text-gray-400">Talle {item.size}</div>}
                      {(item.dorsalName || item.dorsalNumber) && (
                        <div className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                          <span>Dorsal:</span>
                          {item.dorsalNumber && <span>#{item.dorsalNumber}</span>}
                          {item.dorsalName && <span>{item.dorsalName}</span>}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-none">
                      <div className="text-[13px] text-gray-700">{fmt(item.price)} × {item.quantity}</div>
                      <div className="text-[12px] font-semibold text-gray-900">{fmt(item.total)}</div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Totals */}
              <div className="border-t border-gray-100 px-5 py-3 space-y-1.5 bg-gray-50">
                <div className="flex justify-between text-[12px] text-gray-500">
                  <span>Subtotal</span>
                  <span>{fmt(order.items.reduce((s, i) => s + i.total, 0))}</span>
                </div>
                {order.shipping_total > 0 && (
                  <div className="flex justify-between text-[12px] text-gray-500">
                    <span>Envío — {order.shipping_lines[0]?.method_title || 'Andreani'}</span>
                    <span>{fmt(order.shipping_total)}</span>
                  </div>
                )}
                {order.discount_total > 0 && (
                  <div className="flex justify-between text-[12px] text-green-600">
                    <span>{order.payment_method === 'bacs' ? 'Descuento transferencia (10%)' : 'Descuento'}</span>
                    <span>-{fmt(order.discount_total)}</span>
                  </div>
                )}
                {order.feeLines.map(f => (
                  <div key={f.id} className={`flex justify-between text-[12px] ${f.total < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                    <span>{f.name}</span>
                    <span>{f.total < 0 ? '-' : ''}{fmt(Math.abs(f.total))}</span>
                  </div>
                ))}
                <div className="flex justify-between text-[14px] font-bold text-gray-900 pt-1 border-t border-gray-200">
                  <span>Total</span>
                  <span>{fmt(order.total)}</span>
                </div>
              </div>

              {/* Agregar producto / aplicar descuento — sin cancelar el pedido */}
              {!['cancelled', 'failed', 'refunded'].includes(order.status) && (
                <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                  <div>
                    <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Agregar producto</div>
                    <div className="relative">
                      <input
                        type="text"
                        value={productQuery}
                        onChange={e => { setProductQuery(e.target.value); setSelectedProduct(null); }}
                        placeholder="Buscar producto por nombre..."
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:border-gray-400"
                      />
                      {filteredProducts.length > 0 && !selectedProduct && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                          {filteredProducts.map(p => (
                            <button
                              key={p.id}
                              onClick={() => selectProduct(p)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-gray-50"
                            >
                              {p.image && <img src={p.image} alt="" className="w-6 h-6 rounded object-cover flex-none" />}
                              <span className="truncate">{p.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedProduct && (
                      <div className="flex items-center gap-2 mt-2">
                        {variations.length > 1 || (variations.length === 1 && variations[0].size) ? (
                          <select
                            value={selectedVariationId === 'none' ? '' : String(selectedVariationId)}
                            onChange={e => setSelectedVariationId(e.target.value ? Number(e.target.value) : 'none')}
                            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-[12px] focus:outline-none focus:border-gray-400"
                          >
                            <option value="">Talle...</option>
                            {variations.map(v => (
                              <option key={v.id} value={v.id ?? ''}>{v.size} — {fmt(v.price)}</option>
                            ))}
                          </select>
                        ) : null}
                        <input
                          type="number"
                          min={1}
                          value={addQty}
                          onChange={e => setAddQty(Math.max(1, Number(e.target.value)))}
                          className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-[12px] focus:outline-none focus:border-gray-400"
                        />
                        <button
                          onClick={addItem}
                          disabled={addingItem || selectedVariationId === 'none'}
                          className="px-3 py-1.5 bg-black text-white rounded-lg text-[12px] font-semibold hover:bg-gray-800 disabled:opacity-40 whitespace-nowrap"
                        >
                          {addingItem ? '...' : 'Agregar'}
                        </button>
                      </div>
                    )}
                    {addItemMsg && (
                      <p className={`mt-1.5 text-[11px] ${addItemMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>{addItemMsg}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-100">
                    <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Aplicar descuento manual</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={discountName}
                        onChange={e => setDiscountName(e.target.value)}
                        placeholder="Motivo (ej: 2 remeras bonificadas)"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:border-gray-400"
                      />
                      <input
                        type="number"
                        min={1}
                        value={discountAmount}
                        onChange={e => setDiscountAmount(e.target.value)}
                        placeholder="Monto"
                        className="w-28 border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:border-gray-400"
                      />
                      <button
                        onClick={applyDiscount}
                        disabled={applyingDiscount || !discountAmount}
                        className="px-3 py-1.5 bg-black text-white rounded-lg text-[12px] font-semibold hover:bg-gray-800 disabled:opacity-40 whitespace-nowrap"
                      >
                        {applyingDiscount ? '...' : 'Aplicar'}
                      </button>
                    </div>
                    {discountMsg && (
                      <p className={`mt-1.5 text-[11px] ${discountMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>{discountMsg}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Payment */}
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <h2 className="text-[13px] font-semibold text-gray-900 mb-2">Pago</h2>
              <div className="text-[13px] text-gray-600">{order.payment_method_title}</div>
            </div>

            {/* Customer note */}
            {order.customer_note && (
              <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                <h2 className="text-[13px] font-semibold text-gray-900 mb-2">Nota del cliente</h2>
                <p className="text-[13px] text-gray-600 italic">&quot;{order.customer_note}&quot;</p>
              </div>
            )}

            {/* Order notes */}
            {order.notes.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                <h2 className="text-[13px] font-semibold text-gray-900 mb-3">Notas internas</h2>
                <div className="space-y-2">
                  {order.notes.map(n => (
                    <div key={n.id} className="text-[12px] text-gray-600 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
                      <span dangerouslySetInnerHTML={{ __html: n.note }} />
                      <span className="block text-[10px] text-gray-400 mt-1">{fmtDate(n.date)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Nota interna editable */}
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <h2 className="text-[13px] font-semibold text-gray-900 mb-2">Nota interna</h2>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                rows={3}
                placeholder="Escribí una nota para el equipo (la podés editar cuando quieras)..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-gray-400 resize-y"
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={saveNote}
                  disabled={noteSaving}
                  className="px-3 py-1.5 bg-black text-white rounded-lg text-[12px] font-semibold hover:bg-gray-800 disabled:opacity-50"
                >
                  {noteSaving ? 'Guardando...' : 'Guardar nota'}
                </button>
                {noteMsg && <span className={`text-[11px] ${noteMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>{noteMsg}</span>}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-4">
            {/* Customer */}
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-semibold text-gray-900">Cliente</h2>
                {order.customerHistory.orderCount > 0 ? (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                    Recurrente · {order.customerHistory.orderCount} pedido{order.customerHistory.orderCount > 1 ? 's' : ''} más
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    Primera compra
                  </span>
                )}
              </div>
              <div className="text-[13px] font-medium text-gray-900 mb-0.5">
                {order.customer.first_name} {order.customer.last_name}
              </div>
              <a href={`mailto:${order.customer.email}`} className="block text-[12px] text-blue-600 hover:underline mb-0.5">
                {order.customer.email}
              </a>
              {order.customer.dni && (
                <div className="text-[12px] text-gray-500 mb-0.5">DNI/CUIT {order.customer.dni}</div>
              )}
              {order.customer.instagram && (
                <a
                  href={`https://instagram.com/${order.customer.instagram.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[12px] text-pink-600 hover:underline mb-0.5"
                >
                  <svg viewBox="0 0 24 24" className="w-3 h-3 fill-pink-600" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                  @{order.customer.instagram.replace(/^@/, '')}
                </a>
              )}
              {order.customer.phone && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[12px] text-gray-500">{order.customer.phone}</span>
                  <a
                    href={waLink(order.customer.phone, order.customer.first_name, order.number)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-white bg-green-500 hover:bg-green-600 px-2 py-0.5 rounded-full"
                  >
                    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </a>
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-0.5">
                <div className="text-[12px] text-gray-500">
                  Compró el <span className="text-gray-800 font-medium">{fmtDate(order.date)}</span>
                </div>
                {order.datePaid && (
                  <div className="text-[12px] text-gray-500">
                    Pagó el <span className="text-gray-800 font-medium">{fmtDate(order.datePaid)}</span>
                  </div>
                )}
                {order.customerHistory.orderCount > 0 && (
                  <div className="text-[12px] text-gray-500">
                    Cliente desde <span className="text-gray-800 font-medium">{fmtDate(order.customerHistory.firstOrderDate)}</span>
                    {' · '}<span className="text-gray-800 font-medium">{fmt(order.customerHistory.totalSpent)}</span> en pedidos anteriores
                  </div>
                )}
              </div>
            </div>

            {/* Shipping address */}
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <h2 className="text-[13px] font-semibold text-gray-900 mb-2">Dirección de envío</h2>
              <div className="text-[12px] text-gray-600 space-y-0.5">
                <div>{order.shipping.first_name} {order.shipping.last_name}</div>
                <div>{order.shipping.address_1}{order.shipping.address_2 ? `, ${order.shipping.address_2}` : ''}</div>
                <div>{order.shipping.city}, {order.shipping.state} {order.shipping.postcode}</div>
              </div>
              {order.viaCargoSucursal && (
                <div className="mt-2 pt-2 border-t border-gray-100 text-[12px]">
                  <span className="text-gray-400">Sucursal Via Cargo:</span>{' '}
                  <span className="font-medium text-gray-900">{order.viaCargoSucursal}</span>
                </div>
              )}
            </div>

            {/* Billing address — solo si difiere del envío */}
            {order.billing.address_1 && order.billing.address_1 !== order.shipping.address_1 && (
              <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                <h2 className="text-[13px] font-semibold text-gray-900 mb-2">Dirección de facturación</h2>
                <div className="text-[12px] text-gray-600 space-y-0.5">
                  <div>{order.billing.address_1}{order.billing.address_2 ? `, ${order.billing.address_2}` : ''}</div>
                  <div>{order.billing.city}, {order.billing.state} {order.billing.postcode}</div>
                </div>
              </div>
            )}

            {/* Status */}
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <h2 className="text-[13px] font-semibold text-gray-900 mb-2">Estado del pedido</h2>
              <div className="flex items-center gap-2">
                <select
                  value={status}
                  onChange={e => saveStatus(e.target.value)}
                  disabled={statusSaving}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-gray-400 disabled:opacity-60"
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
                {statusSaving && <span className="text-[11px] text-gray-400">Guardando...</span>}
              </div>
            </div>

            {/* Tracking */}
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <h2 className="text-[13px] font-semibold text-gray-900 mb-2">Seguimiento Andreani</h2>
              {order.notified && (
                <div className="text-[11px] text-green-600 mb-2">✓ Cliente notificado</div>
              )}
              {order.pedido_id && !tracking && (
                <button
                  onClick={syncAndreaniTracking}
                  disabled={syncingAndreani}
                  className="w-full mb-2 text-[12px] font-medium text-blue-600 border border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-lg px-3 py-2 text-left transition-colors disabled:opacity-50"
                >
                  {syncingAndreani ? 'Consultando Andreani...' : '↻ Auto-sync desde Andreani'}
                </button>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tracking}
                  onChange={e => setTracking(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveTracking()}
                  placeholder="360002987658940"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-[12px] font-mono focus:outline-none focus:border-gray-400"
                />
                <button
                  onClick={saveTracking}
                  disabled={trackSaving}
                  className="px-3 py-2 bg-black text-white rounded-lg text-[12px] font-semibold hover:bg-gray-800 disabled:opacity-50 whitespace-nowrap"
                >
                  {trackSaving ? '...' : 'Guardar'}
                </button>
              </div>
              {trackMsg && (
                <p className={`mt-1.5 text-[11px] ${trackMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
                  {trackMsg}
                </p>
              )}
              {tracking && (
                <div className="mt-2 flex gap-2">
                  <a
                    href={`https://www.andreani.com/envio/${tracking}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-[11px] text-blue-600 hover:underline"
                  >
                    Rastrear en Andreani →
                  </a>
                  <span className="text-gray-300">·</span>
                  <a
                    href={`${SITE_URL}/seguimiento?pedido=${order.id}&clave=${order.order_key}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-[11px] text-blue-600 hover:underline"
                  >
                    Ver seguimiento web →
                  </a>
                </div>
              )}
            </div>

            {/* Email actions */}
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <h2 className="text-[13px] font-semibold text-gray-900 mb-3">Emails</h2>
              <div className="space-y-2">
                <button
                  onClick={() => sendEmail('confirmation')}
                  className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-400 text-[12px] font-medium text-gray-700 hover:text-black transition-colors"
                >
                  Reenviar confirmación de compra
                </button>
                <button
                  onClick={() => sendEmail('tracking')}
                  className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-400 text-[12px] font-medium text-gray-700 hover:text-black transition-colors"
                >
                  Enviar seguimiento de Andreani
                </button>
                {(order.status === 'pending' || order.status === 'failed') && (
                  <button
                    onClick={() => sendEmail('abandoned')}
                    className="w-full text-left px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 hover:border-amber-400 text-[12px] font-medium text-amber-800 transition-colors"
                  >
                    Enviar mail de carrito abandonado
                  </button>
                )}
              </div>
              {emailMsg && (
                <p className={`mt-2 text-[11px] ${emailMsg.startsWith('✓') ? 'text-green-600' : emailMsg === 'Enviando...' ? 'text-gray-400' : 'text-red-500'}`}>
                  {emailMsg}
                </p>
              )}
            </div>

            {/* Rótulo de envío */}
            <a
              href={`/admin/pedidos/${order.id}/rotulo`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center text-[13px] font-semibold text-white py-2.5 rounded-xl bg-black hover:bg-gray-800 transition-colors"
            >
              🖨 Imprimir rótulo de envío
            </a>

            <a
              href={`/admin/pedidos/${order.id}/detalle`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center text-[13px] font-semibold text-gray-700 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-gray-400 transition-colors"
            >
              🖨 Imprimir detalle del pedido
            </a>

            {/* WooCommerce link */}
            <a
              href={`https://lightpink-rook-704850.hostingersite.com/wp-admin/post.php?post=${order.id}&action=edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center text-[12px] text-gray-500 hover:text-black py-2 border border-gray-200 rounded-xl bg-white hover:border-gray-400 transition-colors"
            >
              Ver en WooCommerce →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
