'use client';

// Timeline del crédito pendiente en /credito: compra confirmada → días de
// seguridad → acreditación. Nodos redondos, check dibujado, pulso sutil en el
// paso activo (los keyframes hs-tick y hs-pulse viven en globals.css).

export type TimelineItem = {
  titulo: string;
  detalle: string;
  estado: 'hecho' | 'activo' | 'pendiente';
};

export function CreditTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="flex flex-col">
      {items.map((it, i) => {
        const ultimo = i === items.length - 1;
        return (
          <div key={it.titulo} className="flex gap-4">
            <div className="flex flex-col items-center">
              {it.estado === 'hecho' && (
                <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center shrink-0">
                  <svg aria-hidden viewBox="0 0 24 24" className="w-3 h-3 hs-ref-tick" style={{ stroke: '#fff', strokeWidth: 3, fill: 'none' }}><path d="M5 13l4 4L19 7" /></svg>
                </div>
              )}
              {it.estado === 'activo' && (
                <div className="w-6 h-6 rounded-full bg-background border-2 border-foreground flex items-center justify-center shrink-0 hs-ref-pulse">
                  <div className="w-2 h-2 rounded-full bg-foreground" />
                </div>
              )}
              {it.estado === 'pendiente' && (
                <div className="w-6 h-6 rounded-full bg-background border border-border shrink-0" />
              )}
              {!ultimo && (
                <div className="w-px flex-1 rounded" style={{ background: it.estado === 'hecho' ? 'hsl(var(--foreground))' : 'hsl(var(--border))' }} />
              )}
            </div>
            <div className={ultimo ? '' : 'pb-6'}>
              <p className={`m-0 mt-[2px] text-[13px] font-bold ${it.estado === 'pendiente' ? 'text-[#9a9a9a]' : ''}`}>{it.titulo}</p>
              <p className="m-0 mt-[3px] text-[12px] leading-[1.5] text-muted-foreground">{it.detalle}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
