'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const WP_SECRET_KEY = 'hype_admin_key';

type Order = {
  id: number; number: string; date: string;
  customer: { first_name: string; last_name: string; phone: string; dni: string };
  shipping: { first_name: string; last_name: string; address_1: string; address_2: string; city: string; state: string; postcode: string };
  viaCargoSucursal: string;
  items: { name: string; quantity: number; size: string; color?: string }[];
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function RotuloPage() {
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card rounded-lg shadow-sm border border-border p-8 w-full max-w-sm">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto mx-auto mb-6" />
          <p className="text-[13px] text-muted-foreground text-center mb-4">Clave de administrador</p>
          <input
            type="password"
            className="w-full border border-border-mid rounded-md px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-ring"
            placeholder="Clave admin"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            autoFocus
          />
          <button onClick={login} className="w-full bg-primary text-primary-foreground rounded-md py-2 text-[13px] font-semibold hover:opacity-90">
            Entrar
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center py-32 text-[13px] text-muted-foreground/70">Cargando rótulo...</div>;
  if (!order) return <div className="flex items-center justify-center py-32 text-[13px] text-red-500">No se pudo cargar el pedido</div>;

  const itemsSummary = order.items.map(i => {
    const detail = [i.size, i.color].filter(Boolean).join(' ');
    return `${i.quantity}× ${i.name}${detail ? ` (${detail})` : ''}`;
  }).join(' · ');

  return (
    <div className="min-h-screen bg-[#e8e8e8] py-8 print:bg-card print:py-0">
      <div className="no-print max-w-[480px] mx-auto mb-4 flex items-center justify-between px-2">
        <a href={`/admin/pedidos/${order.id}`} className="text-[12px] text-muted-foreground hover:text-foreground">← Volver al pedido</a>
        <button
          onClick={() => window.print()}
          className="text-[12px] font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90"
        >
          🖨 Imprimir rótulo
        </button>
      </div>

      {/* Rótulo — 10x15cm exactos al imprimir (ver @page abajo); en pantalla se */}
      {/* previsualiza en la misma proporción 2:3 a un tamaño más cómodo de leer. */}
      <div className="rotulo mx-auto bg-card border-2 border-foreground" style={{ width: '480px', height: '720px' }}>
        <div className="p-8 flex flex-col h-full">
          <div className="flex items-center justify-between pb-5 border-b-2 border-foreground">
            <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-10 w-auto" />
            <div className="text-right">
              <div className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground">Pedido</div>
              <div className="text-[30px] font-bold leading-none">#{order.number}</div>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Destinatario</div>
            <div className="text-[28px] font-bold leading-tight">
              {order.shipping.first_name} {order.shipping.last_name}
            </div>
            {order.customer.dni && (
              <div className="text-[17px] text-foreground/80 mt-1">DNI {order.customer.dni}</div>
            )}
          </div>

          <div className="mt-6">
            <div className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Dirección</div>
            <div className="text-[20px] leading-snug">
              {order.shipping.address_1}{order.shipping.address_2 ? `, ${order.shipping.address_2}` : ''}
            </div>
            <div className="text-[20px] leading-snug">
              {order.shipping.city}, {order.shipping.state} {order.shipping.postcode ? `(${order.shipping.postcode})` : ''}
            </div>
            {order.customer.phone && (
              <div className="text-[17px] text-foreground/80 mt-1.5">Tel: {order.customer.phone}</div>
            )}
          </div>

          {order.viaCargoSucursal && (
            <div className="mt-6 border-2 border-foreground p-4">
              <div className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Sucursal Via Cargo</div>
              <div className="text-[22px] font-bold leading-tight">{order.viaCargoSucursal}</div>
            </div>
          )}

          <div className="mt-6 flex-1">
            <div className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Contenido</div>
            <div className="text-[15px] text-foreground/80 leading-relaxed">{itemsSummary}</div>
          </div>

          <div className="pt-4 mt-auto border-t border-border-mid flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground/70">Hypestyle · hypestyle.com.ar</span>
            <span className="text-[13px] text-muted-foreground/70">{fmtDate(order.date)}</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .rotulo {
            width: 100mm !important;
            height: 150mm !important;
            border-width: 1.5px !important;
            box-shadow: none !important;
            margin: 0 !important;
          }
          @page { size: 100mm 150mm; margin: 0; }
        }
      `}</style>
    </div>
  );
}
