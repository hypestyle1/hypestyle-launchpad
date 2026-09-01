'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Ticket } from '@/components/ui/ticket';

interface TrackingEvent {
  fecha: string;
  descripcion: string;
  sucursal: string;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  image: string;
  size: string;
}

interface TrackingData {
  order_id: number;
  order_number: string;
  wc_status: string;
  tracking_number: string | null;
  destination: string;
  items: OrderItem[];
  subtotal: number;
  shipping_cost: number;
  total: number;
  events: TrackingEvent[];
}

const STATUS_MAP: Record<string, { label: string; sub: string; icon: 'box' | 'truck' | 'check' | 'x' }> = {
  pending:    { label: 'Pago pendiente',       sub: 'Esperando confirmación del pago.',             icon: 'box'   },
  'on-hold':  { label: 'En espera',            sub: 'Pago recibido, en revisión.',                  icon: 'box'   },
  processing: { label: 'Preparando tu pedido', sub: 'Estamos armando tu pedido con cuidado.',       icon: 'box'   },
  completed:  { label: 'Pedido entregado',     sub: 'Tu pedido fue entregado con éxito.',           icon: 'check' },
  cancelled:  { label: 'Pedido cancelado',     sub: 'Este pedido fue cancelado.',                   icon: 'x'     },
  refunded:   { label: 'Pedido reembolsado',   sub: 'El monto fue reembolsado.',                    icon: 'x'     },
  failed:     { label: 'Pago fallido',         sub: 'Hubo un problema con el pago.',                icon: 'x'     },
};

const PAYMENT_STATUS: Record<string, { label: string; dot: string }> = {
  pending:    { label: 'Pago pendiente',   dot: 'bg-yellow-400' },
  'on-hold':  { label: 'En espera',        dot: 'bg-yellow-400' },
  processing: { label: 'Pago aprobado',    dot: 'bg-green-500'  },
  completed:  { label: 'Pago aprobado',    dot: 'bg-green-500'  },
  cancelled:  { label: 'Cancelado',        dot: 'bg-red-500'    },
  refunded:   { label: 'Reembolsado',      dot: 'bg-red-500'    },
  failed:     { label: 'Pago fallido',     dot: 'bg-red-500'    },
};

// Cartel grande según la FASE real del envío (igual que el timeline), no el estado crudo de Woo.
const PHASE_MAP: Record<string, { label: string; sub: string; icon: 'box' | 'truck' | 'check' | 'x' }> = {
  pending:   { label: 'Pedido recibido',      sub: 'Recibimos tu pedido.',                       icon: 'box'   },
  preparing: { label: 'Preparando tu pedido', sub: 'Estamos armando tu pedido con cuidado.',     icon: 'box'   },
  packed:    { label: 'Pedido empaquetado',   sub: 'Tu pedido está listo, esperando al correo.', icon: 'box'   },
  shipped:   { label: 'Pedido enviado',       sub: 'Tu pedido está en camino.',                  icon: 'box'   },
  delivered: { label: 'Pedido entregado',     sub: 'Tu pedido fue entregado con éxito.',         icon: 'check' },
};
// Estados de pago / terminales: muestran su propio cartel, no la fase de envío.
const STATUS_OVERRIDE = ['pending', 'cancelled', 'refunded', 'failed'];

const PHASE_ORDER = ['pending', 'preparing', 'shipped', 'delivered'];

function getPhase(status: string, tracking: string | null, events: TrackingEvent[]): string {
  if (status === 'completed') return 'delivered';
  if (events.some(e => /entregado/i.test(e.descripcion))) return 'delivered';
  // Solo "enviado" si Andreani ya registró al menos un evento (despacho real)
  if (tracking && events.length > 0) return 'shipped';
  // Tracking existe pero sin eventos = etiqueta creada, aún no despachado
  if (tracking || status === 'processing' || status === 'on-hold') return 'preparing';
  return 'pending';
}

function fmt(n: number): string {
  return '$ ' + n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(raw: string): string {
  if (!raw) return '';
  try {
    return new Date(raw).toLocaleString('es-AR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  } catch {
    return raw;
  }
}

function IconBox() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconX() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function MilestoneItem({
  done, label, active, last = false, children,
}: {
  done: boolean; label: string; active?: boolean; last?: boolean; children?: React.ReactNode;
}) {
  return (
    <li className={`ml-6 ${last ? 'pb-0' : 'pb-8'}`}>
      <span className={`absolute -left-[11px] w-5 h-5 rounded-full border-2 border-background flex items-center justify-center transition-colors ${
        done ? 'bg-foreground' : 'bg-white border-border'
      }`}>
        {done && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </span>
      <p className={`text-[14px] font-semibold leading-tight ${
        done ? (active ? 'text-foreground' : 'text-foreground/70') : 'text-muted-foreground'
      }`}>
        {label}
      </p>
      {children}
    </li>
  );
}

function TrackingView({ data }: { data: TrackingData }) {
  const [showItems, setShowItems] = useState(false);

  const phase    = getPhase(data.wc_status, data.tracking_number, data.events);
  const phaseIdx = PHASE_ORDER.indexOf(phase);
  // Título grande alineado con el timeline: usa la fase real del envío (Andreani),
  // salvo en estados de pago/terminales que muestran su propio cartel.
  const heroPhase   = phase === 'preparing' && data.tracking_number ? 'packed' : phase;
  const statusInfo  = STATUS_OVERRIDE.includes(data.wc_status)
    ? (STATUS_MAP[data.wc_status] ?? { label: data.wc_status, sub: '', icon: 'box' as const })
    : (PHASE_MAP[heroPhase]       ?? { label: data.wc_status, sub: '', icon: 'box' as const });
  const paymentInfo = PAYMENT_STATUS[data.wc_status] ?? { label: data.wc_status, dot: 'bg-gray-400' };
  const totalItems = data.items.reduce((s, i) => s + i.quantity, 0);

  const iconBg =
    statusInfo.icon === 'check' ? 'bg-green-100 text-green-700' :
    statusInfo.icon === 'x'     ? 'bg-red-100 text-red-500'    :
    'bg-muted text-foreground';

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-10 md:py-14">
      <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-6">
        Orden #{data.order_number}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10">

        {/* LEFT */}
        <div>
          {/* Status hero: el estado del envío como ticket de papel. El cuerpo
              lleva el estado y el destino; el talón, el código de Andreani. */}
          <div className="mb-10 pb-10 border-b border-border">
            <Ticket
              aria-label={`Estado del pedido ${data.order_number}`}
              className="w-full max-w-[440px] aspect-[4/3] md:aspect-[16/11]"
              stubHeight="26%"
              body={
                <div className="flex h-full flex-col justify-between gap-3 p-5 pb-4 md:p-6 md:pb-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] opacity-60">
                      Orden #{data.order_number}
                    </span>
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${iconBg}`}>
                      {statusInfo.icon === 'check' ? <IconCheck /> : statusInfo.icon === 'x' ? <IconX /> : <IconBox />}
                    </span>
                  </div>
                  <div>
                    <h1 className="text-[22px] md:text-[26px] font-bold leading-tight mb-1">{statusInfo.label}</h1>
                    <p className="text-[13px] opacity-70">{statusInfo.sub}</p>
                  </div>
                  {data.destination ? (
                    <dl>
                      <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] opacity-55">Destino</dt>
                      <dd className="truncate text-[13px] font-medium">{data.destination}</dd>
                    </dl>
                  ) : <span />}
                </div>
              }
              stub={
                <div className="flex h-full items-center justify-between gap-4 bg-black px-5 text-white md:px-6">
                  {data.tracking_number ? (
                    <>
                      <div className="min-w-0">
                        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] opacity-60">Cód. Andreani</p>
                        <p className="truncate font-mono text-[15px] font-bold tracking-[0.08em]">{data.tracking_number}</p>
                      </div>
                      <a
                        href={`https://www.andreani.com/envio/${data.tracking_number}`}
                        target="_blank" rel="noopener noreferrer"
                        className="shrink-0 border border-white/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] hover:border-white transition-colors"
                      >
                        Ver seguimiento
                      </a>
                    </>
                  ) : (
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] opacity-70">
                      Te avisamos por mail cuando salga
                    </p>
                  )}
                </div>
              }
            />
          </div>

          {/* Milestone timeline */}
          <ol className="relative border-l-2 border-border ml-3 mb-10 space-y-0">

            {/* Hito 1: Pedido recibido — siempre visible */}
            <MilestoneItem
              done={true}
              label="Pedido recibido"
              active={phaseIdx === PHASE_ORDER.indexOf('pending')}
            />

            {/* Hito 2: Pedido empaquetado — muestra tracking cuando etiqueta creada pero aún no despachado */}
            <MilestoneItem
              done={phaseIdx >= PHASE_ORDER.indexOf('preparing')}
              label="Pedido empaquetado"
              active={phaseIdx === PHASE_ORDER.indexOf('preparing')}
            >
              {data.tracking_number && data.events.length === 0 && (
                <div className="mt-2 mb-3">
                  <p className="text-[12px] text-muted-foreground mb-0.5">
                    CÓD. <span className="font-semibold text-foreground">{data.tracking_number}</span>
                  </p>
                  <a
                    href={`https://www.andreani.com/envio/${data.tracking_number}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] border border-border px-3 py-1.5 hover:border-foreground hover:text-foreground transition-colors text-foreground/60"
                  >
                    Ver seguimiento
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </a>
                </div>
              )}
            </MilestoneItem>

            {/* Hito 3: Pedido enviado + tracking + sub-eventos (solo cuando Andreani registra despacho real) */}
            <MilestoneItem
              done={phaseIdx >= PHASE_ORDER.indexOf('shipped')}
              label="Pedido enviado"
              active={phaseIdx === PHASE_ORDER.indexOf('shipped')}
            >
              {data.tracking_number && data.events.length > 0 && (
                <div className="mt-2 mb-3">
                  <p className="text-[12px] text-muted-foreground mb-0.5">
                    CÓD. <span className="font-semibold text-foreground">{data.tracking_number}</span>
                  </p>
                  <a
                    href={`https://www.andreani.com/envio/${data.tracking_number}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] border border-border px-3 py-1.5 hover:border-foreground hover:text-foreground transition-colors text-foreground/60"
                  >
                    Ver seguimiento
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </a>
                </div>
              )}
              {data.events.length > 0 && (
                <div className="mt-3 space-y-2">
                  {data.events.map((ev, i) => (
                    <div key={i} className="flex items-start justify-between gap-4">
                      <p className="text-[11px] text-muted-foreground">{fmtDate(ev.fecha)}</p>
                      <p className={`text-[12px] font-medium text-right ${i === 0 ? 'text-foreground' : 'text-foreground/60'}`}>{ev.descripcion}</p>
                    </div>
                  ))}
                </div>
              )}
            </MilestoneItem>

            {/* Hito 4: Pedido entregado */}
            <MilestoneItem
              done={phaseIdx >= PHASE_ORDER.indexOf('delivered')}
              label="Pedido entregado"
              active={phaseIdx === PHASE_ORDER.indexOf('delivered')}
              last={true}
            />

          </ol>

          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              ¿Dudas?{' '}
              <a href="https://wa.me/5491178292430?text=Hola%20Hype!" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground transition-colors">
                Escribinos por WhatsApp
              </a>
            </p>
          </div>
        </div>

        {/* RIGHT — Order summary */}
        <div>
          <div className="border border-border rounded-sm overflow-hidden">

            {/* Items toggle */}
            <button
              onClick={() => setShowItems(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
                <span className="text-[13px] font-semibold">Tu pedido</span>
                <span className="text-[12px] text-muted-foreground underline underline-offset-2">
                  {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
                </span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className={`transition-transform duration-200 ${showItems ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {/* Items list */}
            {showItems && data.items.length > 0 && (
              <div className="border-t border-border divide-y divide-border">
                {data.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-4">
                    <div className="w-14 h-16 bg-muted flex-shrink-0 overflow-hidden rounded-sm">
                      {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover object-top" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium leading-tight">{item.name}</p>
                      {item.size && <p className="text-[11px] text-muted-foreground">Talle: {item.size}</p>}
                      <p className="text-[11px] text-muted-foreground">x{item.quantity}</p>
                    </div>
                    <span className="text-[12px] font-semibold whitespace-nowrap">{fmt(item.price)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Payment status */}
            <div className="border-t border-border px-5 py-3 flex items-center justify-between">
              <span className="text-[12px] text-muted-foreground">Estado de pago</span>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${paymentInfo.dot}`} />
                <span className="text-[12px] font-medium">{paymentInfo.label}</span>
              </div>
            </div>

            {/* Totals */}
            <div className="border-t border-border px-5 py-4 space-y-2">
              {data.subtotal > 0 && (
                <div className="flex justify-between text-[12px]">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{fmt(data.subtotal)}</span>
                </div>
              )}
              {data.shipping_cost > 0 && (
                <div className="flex justify-between text-[12px]">
                  <span className="text-muted-foreground">Envío</span>
                  <span>{fmt(data.shipping_cost)}</span>
                </div>
              )}
              <div className="flex justify-between text-[14px] font-bold pt-2 border-t border-border">
                <span>Total</span>
                <span>{fmt(data.total)}</span>
              </div>
            </div>
          </div>

          {/* Cómo seguir */}
          <div className="mt-5 border border-border rounded-sm px-5 py-4">
            <div className="flex items-start gap-3">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-0.5 flex-shrink-0 text-muted-foreground">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <div>
                <p className="text-[12px] font-semibold mb-1">Cómo seguir el pedido</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Te enviamos un email con el link a esta página para seguir el estado de tu compra en tiempo real.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function SeguimientoClient() {
  const params  = useSearchParams();
  const pedido  = params.get('pedido');
  const clave   = params.get('clave');

  const [data, setData]       = useState<TrackingData | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pedido || !clave) {
      setError('Link inválido. Revisá el email de confirmación.');
      setLoading(false);
      return;
    }
    fetch(`/api/tracking?pedido=${pedido}&clave=${encodeURIComponent(clave)}`)
      .then(res => {
        if (res.status === 404) throw new Error('Pedido no encontrado');
        if (!res.ok) throw new Error('Error al consultar el estado');
        return res.json() as Promise<TrackingData>;
      })
      .then(d => { setData(d); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, [pedido, clave]);

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border py-5 px-4 text-center">
        <a href="/"><img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto object-contain mx-auto" /></a>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-3 py-24">
          <svg className="animate-spin w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
          <span className="text-sm text-muted-foreground">Consultando estado...</span>
        </div>
      )}

      {error && (
        <div className="max-w-[480px] mx-auto px-4 py-20 text-center">
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-3">Seguimiento</p>
          <h1 className="text-xl font-bold mb-3">No pudimos encontrar tu pedido</h1>
          <p className="text-sm text-muted-foreground mb-8">{error}</p>
          <a href="/" className="text-sm underline underline-offset-2 text-muted-foreground hover:text-foreground transition-colors">Volver al inicio</a>
        </div>
      )}

      {data && <TrackingView data={data} />}
    </div>
  );
}
