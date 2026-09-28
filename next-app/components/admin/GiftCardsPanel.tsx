'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RotateCcw } from 'lucide-react';
import type { GiftCardEstado, GiftCardRow } from '@/lib/gift-cards-admin';

// Gift cards emitidas: si se usaron, cuánto saldo les queda y en qué pedido se
// canjearon. Son digitales, así que no pasan por la cola de empaquetado.

type Payload = {
  cards: GiftCardRow[];
  totales: { emitidas: number; sinUsar: number; montoEmitido: number; saldoVigente: number };
};

const ESTADO_LABEL: Record<GiftCardEstado, string> = {
  sin_usar: 'Sin usar',
  parcial:  'Uso parcial',
  usada:    'Usada',
  vencida:  'Vencida',
};
const ESTADO_COLOR: Record<GiftCardEstado, string> = {
  sin_usar: 'bg-blue-100 text-blue-800',
  parcial:  'bg-orange-100 text-orange-800',
  usada:    'bg-emerald-100 text-emerald-800',
  vencida:  'bg-red-100 text-red-700',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const fmtDia = (s: string) =>
  s ? new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';

export default function GiftCardsPanel({ adminKey }: { adminKey: string }) {
  const [data, setData]         = useState<Payload | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError]       = useState('');

  const load = useCallback(async () => {
    if (!adminKey) return;
    setCargando(true);
    try {
      const res = await fetch('/api/admin/gift-cards', { headers: { 'x-admin-key': adminKey }, cache: 'no-store' });
      const json = await res.json();
      if (res.ok) { setData(json); setError(''); }
      else setError(json.error || 'No se pudieron leer las gift cards.');
    } catch {
      setError('No se pudieron leer las gift cards.');
    } finally {
      setCargando(false);
    }
  }, [adminKey]);

  useEffect(() => { load(); }, [load]);

  if (!data) {
    return (
      <div className="text-center py-20 text-[13px] text-muted-foreground/70">
        {error || 'Cargando gift cards...'}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-[12px] text-muted-foreground">
        <span><b className="text-foreground">{data.totales.emitidas}</b> emitidas</span>
        <span><b className="text-foreground">{data.totales.sinUsar}</b> sin usar</span>
        <span><b className="text-foreground">{fmt(data.totales.montoEmitido)}</b> emitido</span>
        <span><b className="text-foreground">{fmt(data.totales.saldoVigente)}</b> de saldo por canjear</span>
        <button
          onClick={load}
          disabled={cargando}
          title="Actualizar"
          className="ml-auto text-muted-foreground/70 hover:text-foreground disabled:opacity-50"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {error && <div className="text-[12px] text-red-600 mb-2">{error}</div>}

      {data.cards.length === 0 ? (
        <div className="text-center py-20 text-[13px] text-muted-foreground/70">Todavía no se emitió ninguna gift card</div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="hidden lg:grid grid-cols-[150px_1fr_110px_110px_1.4fr_110px] gap-3 px-4 py-2.5 border-b border-border bg-muted/50">
            {['Código', 'Comprada por', 'Monto', 'Estado', 'Usada en', 'Emitida'].map((h, i) => (
              <div key={h} className={`text-[11px] font-semibold text-muted-foreground uppercase tracking-wider ${i === 2 || i === 5 ? 'text-right' : ''}`}>{h}</div>
            ))}
          </div>

          {data.cards.map((c, idx) => (
            <div
              key={c.id}
              className={`grid grid-cols-[1fr_auto] lg:grid-cols-[150px_1fr_110px_110px_1.4fr_110px] gap-x-3 gap-y-1.5 px-4 py-3 items-start border-b border-border ${idx === data.cards.length - 1 ? 'border-b-0' : ''}`}
            >
              {/* Código */}
              <div>
                <div className="text-[13px] font-bold text-foreground font-mono">{c.code}</div>
                {c.tipo === 'saldo_a_favor' && (
                  <div className="text-[9px] font-bold uppercase tracking-wide text-purple-700 bg-purple-100 rounded px-1 inline-block mt-0.5">
                    Saldo a favor
                  </div>
                )}
              </div>

              {/* Estado (mobile: arriba a la derecha) */}
              <div className="lg:order-4 justify-self-end lg:justify-self-start">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLOR[c.estado]}`}>
                  {ESTADO_LABEL[c.estado]}
                </span>
              </div>

              {/* Comprador */}
              <div className="min-w-0 col-span-2 lg:col-span-1 lg:order-2">
                {c.origen ? (
                  <>
                    <div className="text-[13px] font-medium text-foreground truncate">
                      {c.origen.cliente || c.origen.email}{' '}
                      <Link href={`/admin/pedidos/${c.origen.id}`} className="text-muted-foreground font-normal hover:underline">
                        #{c.origen.number}
                      </Link>
                    </div>
                    <div className="text-[11px] text-muted-foreground/70 truncate">{c.origen.email}</div>
                    {c.origen.status === 'cancelled' && c.saldo > 0 && (
                      <div className="text-[10px] text-red-600 font-semibold mt-0.5">Pedido cancelado, el código sigue activo</div>
                    )}
                  </>
                ) : (
                  <div className="text-[12px] text-muted-foreground/70">Sin pedido de origen</div>
                )}
                {c.para && c.para !== c.origen?.email && (
                  <div className="text-[11px] text-muted-foreground truncate">Para {c.para}</div>
                )}
              </div>

              {/* Monto y saldo */}
              <div className="lg:text-right lg:order-3">
                <div className="text-[13px] font-semibold text-foreground">{fmt(c.inicial)}</div>
                {c.saldo !== c.inicial && (
                  <div className="text-[11px] text-muted-foreground/70">saldo {fmt(c.saldo)}</div>
                )}
              </div>

              {/* Usos */}
              <div className="min-w-0 col-span-2 lg:col-span-1 lg:order-5 text-[12px]">
                {c.usos.length === 0 && c.usoSinIdentificar === 0 && (
                  <span className="text-muted-foreground/70">Todavía no se usó</span>
                )}
                {c.usos.map((u) => (
                  <div key={u.id}>
                    <Link href={`/admin/pedidos/${u.id}`} className="font-semibold text-foreground hover:underline">
                      #{u.number}
                    </Link>
                    <span className="text-muted-foreground"> · {u.cliente || u.email} · {fmt(u.monto)} · {fmtDia(u.fecha)}</span>
                    {!u.debitado && <span className="text-amber-600 font-medium"> · sin pagar, todavía no descuenta</span>}
                  </div>
                ))}
                {c.usoSinIdentificar > 0 && (
                  <div className="text-amber-600">{fmt(c.usoSinIdentificar)} usados sin pedido identificado</div>
                )}
              </div>

              {/* Fechas */}
              <div className="lg:text-right lg:order-6 text-[11px] text-muted-foreground/70 whitespace-nowrap">
                <div>{fmtDia(c.creada)}</div>
                {c.vence && <div>vence {fmtDia(c.vence)}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
