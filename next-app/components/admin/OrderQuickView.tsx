'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Detalle del pedido desplegado debajo de su fila en /admin/pedidos.
// Lee el mismo endpoint que la página del pedido (/api/admin/orders/[id]).

type Item = { name: string; quantity: number; total: number; size: string; color?: string; image: string; dorsalName?: string; dorsalNumber?: string };
type Address = { first_name?: string; last_name?: string; address_1: string; address_2: string; city: string; state: string; postcode: string };

export type OrderDetail = {
  id: number; number: string;
  customer: { first_name: string; last_name: string; email: string; phone: string; dni: string; instagram: string };
  customerHistory: { orderCount: number; totalSpent: number };
  shipping: Address; billing: Address;
  items: Item[];
  shipping_lines: { method_title: string; total: number }[];
  total: number; shipping_total: number; discount_total: number;
  feeLines: { id: number; name: string; total: number }[];
  payment_method_title: string;
  customer_note: string; adminNote: string;
  envio?: { metodo: string | null; resumen: string };
  tracking: string; andreani: string;
};

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

function waLink(phone: string, name: string, orderNum: string) {
  const digits = phone.replace(/\D/g, '');
  const clean  = digits.startsWith('0') ? digits.slice(1) : digits;
  const intl   = clean.startsWith('54') ? clean : '549' + clean;
  const msg    = encodeURIComponent(`Hola ${name}, te escribimos en relación a tu pedido #${orderNum} en Hypestyle. `);
  return `https://wa.me/${intl}?text=${msg}`;
}

// El talle ya va en la línea de abajo: se saca del nombre ("Regular Tee - Black - S").
function cleanName(it: Item) {
  const name = it.name.replace(/\s*[—-]\s*Talle\s*\S+/i, '');
  if (!it.size) return name;
  const size = it.size.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return name.replace(new RegExp(`\\s*[—-]\\s*${size}$`, 'i'), '');
}

// La dirección de envío; si el pedido no la tiene (retiro, gift card), la de facturación.
function addressOf(o: OrderDetail): Address {
  return o.shipping.address_1 ? o.shipping : o.billing;
}

function addressText(o: OrderDetail) {
  const a = addressOf(o);
  const name = [a.first_name || o.customer.first_name, a.last_name || o.customer.last_name].filter(Boolean).join(' ');
  return [
    name,
    [a.address_1, a.address_2].filter(Boolean).join(', '),
    [a.city, a.state, a.postcode && `CP ${a.postcode}`].filter(Boolean).join(', '),
    o.customer.phone,
  ].filter(Boolean).join('\n');
}

const label = 'text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2';

export default function OrderQuickView({ orderId, adminKey, cache }: {
  orderId: number;
  adminKey: string;
  /** Cache compartido entre filas: reabrir un pedido no vuelve a pedirlo. */
  cache: Map<number, OrderDetail>;
}) {
  const [order, setOrder] = useState<OrderDetail | null>(cache.get(orderId) ?? null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (cache.has(orderId)) return;
    let alive = true;
    fetch(`/api/admin/orders/${orderId}`, { headers: { 'x-admin-key': adminKey } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: OrderDetail) => { cache.set(orderId, d); if (alive) setOrder(d); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [orderId, adminKey, cache]);

  async function copyAddress() {
    if (!order) return;
    try {
      await navigator.clipboard.writeText(addressText(order));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  }

  if (error) {
    return <div className="px-4 py-4 text-[12px] text-red-600 border-b border-border bg-muted/30">No se pudo cargar el pedido. <Link href={`/admin/pedidos/${orderId}`} className="underline">Abrirlo</Link></div>;
  }
  if (!order) {
    return <div className="px-4 py-6 text-[12px] text-muted-foreground/70 border-b border-border bg-muted/30">Cargando pedido...</div>;
  }

  const units    = order.items.reduce((s, it) => s + it.quantity, 0);
  const subtotal = order.items.reduce((s, it) => s + it.total, 0);
  const fees     = order.feeLines.reduce((s, f) => s + f.total, 0);
  const shipName = order.envio?.metodo ? order.envio.resumen : order.shipping_lines[0]?.method_title || 'Sin envío';
  const addr     = addressOf(order);
  const guia     = order.tracking || order.andreani;

  return (
    <div className="border-b border-border bg-muted/30 px-4 py-4 lg:pl-[76px] grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
      {/* Productos */}
      <div className="min-w-0">
        <div className={label}>Productos ({units})</div>
        <div className="divide-y divide-border">
          {order.items.map((it, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              {it.image
                ? <img src={it.image} alt="" className="w-11 h-14 object-cover flex-none bg-muted" />
                : <div className="w-11 h-14 flex-none bg-muted" />}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-foreground line-clamp-2">{cleanName(it)}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {[it.color, it.size && `Talle ${it.size}`, (it.dorsalNumber || it.dorsalName) && `Dorsal ${it.dorsalNumber ? `#${it.dorsalNumber}` : ''} ${it.dorsalName || ''}`.trim()].filter(Boolean).join(' · ')}
                </div>
              </div>
              <span className="flex-none text-[13px] text-muted-foreground w-7 text-right">×{it.quantity}</span>
              <span className="flex-none text-[13px] font-semibold text-foreground w-[72px] lg:w-24 text-right">{fmt(it.total)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Envío + cliente */}
      <div className="min-w-0 space-y-5">
        <div>
          <div className={label}>Envío</div>
          <div className="text-[13px] font-semibold text-foreground">{shipName}</div>
          {addr.address_1 ? (
            <div className="text-[12px] text-foreground/80 leading-relaxed">
              {[addr.address_1, addr.address_2].filter(Boolean).join(', ')}<br />
              {[addr.city, addr.state].filter(Boolean).join(', ')}{addr.postcode && ` · CP ${addr.postcode}`}
            </div>
          ) : (
            <div className="text-[12px] text-muted-foreground">Sin dirección cargada</div>
          )}
          {addr.address_1 && (
            <button onClick={copyAddress} className="mt-1 text-[11px] font-medium text-foreground underline underline-offset-2 hover:text-muted-foreground">
              {copied ? 'Copiada' : 'Copiar dirección'}
            </button>
          )}
          {guia && (
            <div className="mt-1 text-[11px] text-muted-foreground">
              Guía: <a href={`https://www.andreani.com/envio/${guia}`} target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">{guia}</a>
            </div>
          )}
        </div>
        <div>
          <div className={label}>Cliente</div>
          <div className="text-[12px] text-foreground/80 space-y-0.5">
            {order.customer.phone && (
              <div>
                {order.customer.phone} · <a href={waLink(order.customer.phone, order.customer.first_name, order.number)} target="_blank" rel="noopener noreferrer" className="text-green-700 font-medium hover:underline">WhatsApp</a>
              </div>
            )}
            {order.customer.instagram && <div>@{order.customer.instagram.replace(/^@/, '')}</div>}
            {order.customer.dni && <div>DNI {order.customer.dni}</div>}
            <div className="text-muted-foreground">
              {order.customerHistory.orderCount > 0
                ? `${order.customerHistory.orderCount} compra${order.customerHistory.orderCount > 1 ? 's' : ''} anterior${order.customerHistory.orderCount > 1 ? 'es' : ''} · ${fmt(order.customerHistory.totalSpent)}`
                : 'Primera compra'}
            </div>
          </div>
        </div>
      </div>

      {/* Pago + acciones */}
      <div className="min-w-0 space-y-4">
        <div>
          <div className={label}>Pago</div>
          <div className="text-[12px] space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmt(subtotal)}</span></div>
            {order.discount_total > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Descuento</span><span>−{fmt(order.discount_total)}</span></div>}
            {fees !== 0 && <div className="flex justify-between"><span className="text-muted-foreground">{fees < 0 ? 'Descuento por medio de pago' : 'Recargos'}</span><span>{fees < 0 ? `−${fmt(-fees)}` : fmt(fees)}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Envío</span><span>{order.shipping_total > 0 ? fmt(order.shipping_total) : 'Gratis'}</span></div>
            <div className="flex justify-between border-t border-border pt-1.5 mt-1.5 text-[13px] font-bold text-foreground"><span>Total</span><span>{fmt(order.total)}</span></div>
            <div className="text-[11px] text-muted-foreground">{order.payment_method_title}</div>
          </div>
        </div>
        {(order.customer_note || order.adminNote) && (
          <div className="space-y-1.5">
            {order.customer_note && <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 px-2 py-1.5"><strong>Nota del cliente:</strong> {order.customer_note}</div>}
            {order.adminNote && <div className="text-[11px] text-foreground/80 bg-muted border border-border px-2 py-1.5"><strong>Nota interna:</strong> {order.adminNote}</div>}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Link href={`/admin/pedidos/${order.id}`} className="h-9 flex items-center justify-center bg-primary text-primary-foreground text-[12px] font-semibold hover:opacity-90">
            Abrir pedido completo
          </Link>
          <a href={`/admin/pedidos/${order.id}/rotulo`} target="_blank" rel="noopener noreferrer" className="h-9 flex items-center justify-center border border-border-mid text-[12px] font-semibold text-foreground hover:bg-muted">
            Imprimir rótulo
          </a>
        </div>
      </div>
    </div>
  );
}
