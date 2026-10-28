'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMayoristaDivisa } from '@/context/MayoristaDivisaContext';
import { Button } from '@/components/ui/button';
import { useMayoristaCart } from '@/context/MayoristaCartContext';
import type { MayoristaProduct } from '@/lib/mayorista-products';
import { reorderPlan, SKIP_REASON_LABEL, type PedidoView } from '@/lib/mayorista-pedidos-view';
import { WHATSAPP_URL } from '@/lib/mayorista-copy';

const STATUS_LABELS: Record<string, string> = {
  'on-hold': 'Esperando el pago',
  processing: 'En preparación',
  completed: 'Entregado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
  pending: 'Pendiente',
};

const STATUS_STYLES: Record<string, string> = {
  'on-hold': 'bg-orange-100 text-orange-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-purple-100 text-purple-700',
  pending: 'bg-yellow-100 text-yellow-700',
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function MayoristaPedidos({ catalog = [] }: { catalog?: MayoristaProduct[] }) {
  const router = useRouter();
  const { items: cartItems, add } = useMayoristaCart();
  const { fmt } = useMayoristaDivisa();
  const [pedidos, setPedidos] = useState<PedidoView[] | null>(null);
  // Un error del servidor se muestra como error, no como "no tenés pedidos"
  // (hasta el 13/10 el 502 se veía como lista vacía).
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [reorderNote, setReorderNote] = useState<{ id: number; text: string } | null>(null);

  useEffect(() => {
    setError(null);
    setPedidos(null);
    fetch('/api/mayorista/pedidos', { cache: 'no-store' })
      .then(async res => ({ ok: res.ok, data: await res.json().catch(() => null) }))
      .then(({ ok, data }) => {
        if (!ok || !Array.isArray(data?.orders)) { setError(data?.message || 'No pudimos cargar tus pedidos.'); setPedidos([]); return; }
        setPedidos(data.orders as PedidoView[]);
      })
      .catch(() => { setError('No pudimos cargar tus pedidos.'); setPedidos([]); });
  }, [retry]);

  function volverAPedir(p: PedidoView) {
    const plan = reorderPlan(p.lines, catalog);
    if (plan.items.length === 0) {
      setReorderNote({ id: p.id, text: 'Nada de este pedido se puede volver a pedir hoy: ' + plan.skipped.map(s => `${s.name} ${SKIP_REASON_LABEL[s.reason]}`).join('; ') + '.' });
      return;
    }
    if (cartItems.length > 0 && !window.confirm('Se suman a lo que ya tenés en el pedido. ¿Continuar?')) return;
    for (const it of plan.items) add(it);
    const skipped = plan.skipped.length ? ` No se pudieron sumar: ${plan.skipped.map(s => `${s.name}${s.size ? ` (${s.size})` : ''} ${SKIP_REASON_LABEL[s.reason]}`).join('; ')}.` : '';
    setReorderNote({ id: p.id, text: `${plan.items.length} ${plan.items.length === 1 ? 'línea sumada' : 'líneas sumadas'} al pedido con los precios de hoy.${skipped}` });
    if (!skipped) router.push('/mayoristas/carrito');
  }

  const count = pedidos?.length ?? 0;

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Mis pedidos</h1>
      <p className="text-[13px] text-muted-foreground mt-1">
        {pedidos === null ? 'Cargando…' : error ? '' : count === 0 ? 'Todavía no hiciste ningún pedido.' : `${count} pedido${count > 1 ? 's' : ''}.`}
      </p>

      {error && (
        <div role="alert" className="mt-6 rounded-[12px] border border-destructive/40 p-4 text-[13px]">
          <p className="font-semibold text-destructive">{error}</p>
          <p className="text-muted-foreground mt-1">Es un problema momentáneo de nuestro lado; tus pedidos siguen registrados.</p>
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] uppercase tracking-wide">
            <button type="button" onClick={() => setRetry(n => n + 1)} className="font-semibold underline">Reintentar</button>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground underline">WhatsApp</a>
          </div>
        </div>
      )}

      {pedidos !== null && !error && count === 0 && (
        <div className="mt-6 rounded-[16px] border border-border bg-bg-alt/50 p-10 text-center">
          <p className="text-[15px] font-semibold">Todavía no hay nada por acá</p>
          <p className="text-[13px] text-muted-foreground mt-1.5 max-w-sm mx-auto">
            Cuando confirmes tu primer pedido desde el catálogo, va a aparecer en esta lista con su estado.
          </p>
          <Button asChild variant="hype" size="cta" className="mt-6 py-3 rounded-full">
            <Link href="/mayoristas">Ir al catálogo</Link>
          </Button>
        </div>
      )}

      {pedidos && count > 0 && (
        <div className="mt-6 space-y-3">
          {pedidos.map((p) => {
            const isOpen = open === p.id;
            return (
              <div key={p.id} className="rounded-[12px] border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-semibold">Pedido #{p.number}</p>
                    <p className="text-[12px] text-text-light mt-0.5">{fmtDate(p.date)} · {p.itemCount} {p.itemCount === 1 ? 'unidad' : 'unidades'}</p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_STYLES[p.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[p.status] || p.status}
                  </span>
                </div>
                {!isOpen && <p className="text-[12px] text-foreground/70 mt-2 truncate">{p.items.join(' · ')}</p>}

                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <ul className="space-y-1.5">
                      {p.lines.map((l, i) => (
                        <li key={i} className="flex items-baseline justify-between gap-3 text-[12px]">
                          <span className="text-foreground/80">
                            {l.name}
                            <span className="text-text-light"> {l.color ? `· ${l.color} ` : ''}{l.size ? `· Talle ${l.size} ` : ''}· ×{l.quantity}</span>
                          </span>
                          <span className="tabular-nums whitespace-nowrap">{fmt(l.lineTotal)}</span>
                        </li>
                      ))}
                    </ul>
                    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[12px]">
                      {p.envio.resumen && <><dt className="text-muted-foreground">Envío</dt><dd>{p.envio.resumen}</dd></>}
                      {p.campaignName && <><dt className="text-muted-foreground">Campaña</dt><dd>{p.campaignName}</dd></>}
                      {p.creditUsed > 0 && <><dt className="text-muted-foreground">Saldo a favor</dt><dd>−{fmt(p.creditUsed)}</dd></>}
                      {p.tracking && (
                        <>
                          <dt className="text-muted-foreground">Seguimiento</dt>
                          <dd>
                            {p.trackingUrl
                              ? <a href={p.trackingUrl} target="_blank" rel="noopener noreferrer" className="underline">{p.tracking}</a>
                              : <>{p.tracking} <span className="text-text-light">(seguilo en el sitio del transportista)</span></>}
                          </dd>
                        </>
                      )}
                    </dl>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-border">
                  <span className="text-[15px] font-bold">{fmt(p.total)}</span>
                  <div className="flex flex-wrap items-center gap-4 text-[11px] uppercase tracking-wide">
                    {!isOpen && p.tracking && <span className="text-text-light normal-case tracking-normal">Guía: {p.trackingUrl ? <a href={p.trackingUrl} target="_blank" rel="noopener noreferrer" className="underline">{p.tracking}</a> : p.tracking}</span>}
                    <button type="button" onClick={() => setOpen(isOpen ? null : p.id)} aria-expanded={isOpen} className="min-h-[36px] text-muted-foreground hover:text-foreground underline underline-offset-4">
                      {isOpen ? 'Cerrar' : 'Ver detalle'}
                    </button>
                    {p.mayorista && catalog.length > 0 && p.lines.length > 0 && (
                      <button type="button" onClick={() => volverAPedir(p)} className="min-h-[36px] font-semibold underline underline-offset-4">
                        Volver a pedir
                      </button>
                    )}
                    {p.status === 'completed' && (
                      <Link href="/mayoristas/contenido" className="min-h-[36px] inline-flex items-center font-semibold underline underline-offset-4">
                        Descargar contenido
                      </Link>
                    )}
                  </div>
                </div>
                {reorderNote?.id === p.id && (
                  <p role="status" className="mt-2 text-[12px] text-foreground/80">
                    {reorderNote.text} {reorderNote.text.startsWith('Nada') ? null : <Link href="/mayoristas/carrito" className="underline">Ver pedido</Link>}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
