'use client';

import { formatArs } from '@/lib/mayorista-format';

// Barra del pedido mínimo. Compacta en el header, completa en el carrito.
// Mide el total del carrito (precio promo si hay campaña) contra el mínimo
// del cliente; al llegar, dice "Mínimo alcanzado".

export default function MayoristaMinBar({ total, minOrder, compact }: { total: number; minOrder: number | null; compact?: boolean }) {
  if (minOrder == null || minOrder <= 0) return null;
  const ratio = Math.min(1, total / minOrder);
  const missing = Math.max(0, minOrder - total);
  const reached = missing === 0;

  if (compact) {
    return (
      <div className="hidden md:flex items-center gap-2" title={reached ? 'Mínimo alcanzado' : `Te faltan ${formatArs(missing)} para el mínimo`}>
        <div className="w-28 h-[3px] bg-border rounded-full overflow-hidden">
          <div className={`h-full ${reached ? 'bg-foreground' : 'bg-foreground/60'} transition-all`} style={{ width: `${ratio * 100}%` }} />
        </div>
        <span className="text-[10px] tracking-wide text-foreground/60 tabular-nums normal-case">
          {reached ? 'Mínimo alcanzado' : `${formatArs(total)} / ${formatArs(minOrder)}`}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-[12px] border border-border p-3">
      <div className="flex items-baseline justify-between gap-3 text-[12px]">
        <span className="uppercase tracking-wide text-muted-foreground">Pedido mínimo {formatArs(minOrder)}</span>
        <span className={`tabular-nums ${reached ? 'text-foreground font-semibold' : 'text-foreground/80'}`}>
          {reached ? 'Mínimo alcanzado' : `te faltan ${formatArs(missing)}`}
        </span>
      </div>
      <div className="mt-2 h-[4px] bg-border rounded-full overflow-hidden">
        <div className={`h-full ${reached ? 'bg-foreground' : 'bg-foreground/60'} transition-all`} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}
