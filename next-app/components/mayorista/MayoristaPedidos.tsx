'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatArs } from '@/lib/mayorista-format';

interface Pedido {
  id: number;
  number: string;
  date: string;
  status: string;
  total: number;
  itemCount: number;
  items: string[];
  tracking: string;
}

const STATUS_LABELS: Record<string, string> = {
  'on-hold': 'Pendiente de coordinar',
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

export default function MayoristaPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);

  useEffect(() => {
    fetch('/api/mayorista/pedidos')
      .then(res => res.ok ? res.json() : null)
      .then(data => setPedidos(data?.orders ?? []))
      .catch(() => setPedidos([]));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Mis pedidos</h1>
      <p className="text-[13px] text-muted-foreground mt-1">
        {pedidos === null ? 'Cargando…' : pedidos.length === 0 ? 'Todavía no hiciste ningún pedido.' : `${pedidos.length} pedido${pedidos.length > 1 ? 's' : ''}.`}
      </p>

      {pedidos !== null && pedidos.length === 0 && (
        <div className="mt-6 rounded-[16px] border border-border bg-bg-alt/50 p-10 text-center">
          <p className="text-[15px] font-semibold">Todavía no hay nada por acá</p>
          <p className="text-[13px] text-muted-foreground mt-1.5 max-w-sm mx-auto">
            Cuando confirmes tu primer pedido desde el catálogo, va a aparecer en esta lista con su estado.
          </p>
          <Link href="/mayoristas" className="inline-block mt-6 bg-bg-dark text-primary-foreground px-6 py-3 text-[12px] font-semibold uppercase tracking-wide rounded-full hover:bg-bg-dark/85 transition-colors">
            Ir al catálogo
          </Link>
        </div>
      )}

      {pedidos && pedidos.length > 0 && (
        <div className="mt-6 space-y-3">
          {pedidos.map((p) => (
            <div key={p.id} className="rounded-[12px] border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold">Pedido #{p.number}</p>
                  <p className="text-[12px] text-text-light mt-0.5">{fmtDate(p.date)} · {p.itemCount} producto{p.itemCount !== 1 ? 's' : ''}</p>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_STYLES[p.status] || 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABELS[p.status] || p.status}
                </span>
              </div>
              <p className="text-[12px] text-foreground/70 mt-2 truncate">{p.items.join(' · ')}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <span className="text-[15px] font-bold">{formatArs(p.total)}</span>
                {p.tracking && <span className="text-[11px] text-text-light">Guía: {p.tracking}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
