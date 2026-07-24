'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const WP_SECRET_KEY = 'hype_admin_key';

type Order = {
  id: number; number: string; status: string; date: string;
  customer: { first_name: string; last_name: string; email: string; phone: string; dni: string };
  billing: { address_1: string; address_2: string; city: string; state: string; postcode: string };
  shipping: { first_name: string; last_name: string; address_1: string; address_2: string; city: string; state: string; postcode: string };
  items: { id: number; name: string; quantity: number; price: number; total: number; size: string; dorsalName?: string; dorsalNumber?: string }[];
  shipping_lines: { method_title: string; total: number }[];
  total: number; shipping_total: number; discount_total: number;
  feeLines: { id: number; name: string; total: number }[];
  payment_method: string; payment_method_title: string;
  viaCargoSucursal: string;
  customer_note: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', processing: 'Procesando', 'on-hold': 'En espera',
  enviado: 'Enviado', completed: 'Completado', cancelled: 'Cancelado',
  refunded: 'Reembolsado', failed: 'Fallido',
};

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(s: string) {
  return new Date(s).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function DetallePedidoPage() {
  const { id } = useParams<{ id: string }>();
  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed]     = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [order, setOrder]       = useState<Order | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem(WP_SECRET_KEY);
    if (stored) { setAdminKey(stored); setAuthed(true); }
  }, []);

  useEffect(() => {
    if (!authed || !adminKey || !id) return;
    setLoading(true);
    fetch(`/api/admin/orders/${id}`, { headers: { 'x-admin-key': adminKey } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && !data.error) setOrder(data); })
      .finally(() => setLoading(false));
  }, [authed, adminKey, id]);

  function login() {
    sessionStorage.setItem(WP_SECRET_KEY, keyInput);
    setAdminKey(keyInput);
    setAuthed(true);
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

  if (loading) return <div className="flex items-center justify-center py-32 text-[13px] text-gray-400">Cargando pedido...</div>;
  if (!order) return <div className="flex items-center justify-center py-32 text-[13px] text-red-500">No se pudo cargar el pedido</div>;

  const subtotal = order.items.reduce((s, i) => s + i.total, 0);

  return (
    <div className="min-h-screen bg-[#e8e8e8] py-8 print:bg-white print:py-0">
      <div className="no-print max-w-[720px] mx-auto mb-4 flex items-center justify-between px-2">
        <a href={`/admin/pedidos/${order.id}`} className="text-[12px] text-gray-500 hover:text-black">← Volver al pedido</a>
        <button
          onClick={() => window.print()}
          className="text-[12px] font-semibold bg-black text-white px-4 py-2 rounded-md hover:bg-gray-900"
        >
          🖨 Imprimir
        </button>
      </div>

      <div className="factura mx-auto bg-white border border-gray-200 print:border-0" style={{ width: '720px' }}>
        <div className="p-10">
          <div className="flex items-start justify-between pb-6 border-b-2 border-black">
            <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-9 w-auto" />
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-[0.15em] text-gray-500">Pedido</div>
              <div className="text-[24px] font-bold leading-none">#{order.number}</div>
              <div className="text-[12px] text-gray-500 mt-1">{fmtDate(order.date)}</div>
              <div className="text-[11px] font-semibold text-gray-700 mt-1">{STATUS_LABELS[order.status] || order.status}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-6">
            <div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-gray-500 mb-1.5">Cliente</div>
              <div className="text-[14px] font-semibold">{order.customer.first_name} {order.customer.last_name}</div>
              {order.customer.email && <div className="text-[12px] text-gray-600">{order.customer.email}</div>}
              {order.customer.phone && <div className="text-[12px] text-gray-600">{order.customer.phone}</div>}
              {order.customer.dni && <div className="text-[12px] text-gray-600">DNI/CUIT {order.customer.dni}</div>}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-gray-500 mb-1.5">Envío</div>
              <div className="text-[14px] font-semibold">{order.shipping.first_name} {order.shipping.last_name}</div>
              {order.shipping.address_1 && (
                <div className="text-[12px] text-gray-600">
                  {order.shipping.address_1}{order.shipping.address_2 ? `, ${order.shipping.address_2}` : ''}
                </div>
              )}
              {order.shipping.city && (
                <div className="text-[12px] text-gray-600">
                  {order.shipping.city}, {order.shipping.state} {order.shipping.postcode}
                </div>
              )}
              {order.viaCargoSucursal && (
                <div className="text-[12px] text-gray-600 mt-0.5">Sucursal Via Cargo: {order.viaCargoSucursal}</div>
              )}
            </div>
          </div>

          <table className="w-full mt-8 text-[12px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left font-semibold uppercase tracking-wide text-[10px] text-gray-500 pb-2">Producto</th>
                <th className="text-center font-semibold uppercase tracking-wide text-[10px] text-gray-500 pb-2 w-16">Cant.</th>
                <th className="text-right font-semibold uppercase tracking-wide text-[10px] text-gray-500 pb-2 w-28">Precio</th>
                <th className="text-right font-semibold uppercase tracking-wide text-[10px] text-gray-500 pb-2 w-28">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map(item => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-2.5 pr-2">
                    <div className="font-medium">{item.name.replace(/\s*—\s*Talle\s*\S+/i, '')}</div>
                    {item.size && <div className="text-[11px] text-gray-400">Talle {item.size}</div>}
                    {(item.dorsalName || item.dorsalNumber) && (
                      <div className="text-[11px] text-gray-400">
                        Dorsal: {item.dorsalNumber && `#${item.dorsalNumber}`} {item.dorsalName}
                      </div>
                    )}
                  </td>
                  <td className="text-center py-2.5">{item.quantity}</td>
                  <td className="text-right py-2.5">{fmt(item.price)}</td>
                  <td className="text-right py-2.5 font-medium">{fmt(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mt-4">
            <div className="w-64 space-y-1.5">
              <div className="flex justify-between text-[12px] text-gray-600">
                <span>Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {order.shipping_total > 0 && (
                <div className="flex justify-between text-[12px] text-gray-600">
                  <span>Envío — {order.shipping_lines[0]?.method_title || 'Andreani'}</span>
                  <span>{fmt(order.shipping_total)}</span>
                </div>
              )}
              {order.discount_total > 0 && (
                <div className="flex justify-between text-[12px] text-green-700">
                  <span>{order.payment_method === 'bacs' ? 'Descuento transferencia (10%)' : 'Descuento'}</span>
                  <span>-{fmt(order.discount_total)}</span>
                </div>
              )}
              {order.feeLines.map(f => (
                <div key={f.id} className={`flex justify-between text-[12px] ${f.total < 0 ? 'text-green-700' : 'text-gray-600'}`}>
                  <span>{f.name}</span>
                  <span>{f.total < 0 ? '-' : ''}{fmt(Math.abs(f.total))}</span>
                </div>
              ))}
              <div className="flex justify-between text-[16px] font-bold pt-2 border-t-2 border-black">
                <span>Total</span>
                <span>{fmt(order.total)}</span>
              </div>
            </div>
          </div>

          {order.customer_note && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="text-[10px] uppercase tracking-[0.15em] text-gray-500 mb-1">Nota del cliente</div>
              <div className="text-[12px] text-gray-600 italic">&quot;{order.customer_note}&quot;</div>
            </div>
          )}

          <div className="mt-8 pt-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-[11px] text-gray-400">Hypestyle · hypestyle.com.ar</span>
            <span className="text-[11px] text-gray-400">{order.payment_method_title}</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .factura { width: 100% !important; }
          @page { size: A4; margin: 15mm; }
        }
      `}</style>
    </div>
  );
}
