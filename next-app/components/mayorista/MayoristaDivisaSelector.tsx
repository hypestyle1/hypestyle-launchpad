'use client';

import { DIVISAS } from '@/lib/mayorista-divisa';
import { useMayoristaDivisa } from '@/context/MayoristaDivisaContext';

// Selector de divisa del portal. Tres estados, siempre visibles: con un
// <select> en mobile el mayorista de afuera tiene que descubrir que existe, y
// con tres chips ve de una que puede mirar el catálogo en su moneda.

export default function MayoristaDivisaSelector({ className = '' }: { className?: string }) {
  const { divisa, setDivisa } = useMayoristaDivisa();

  return (
    <div className={`inline-flex items-center rounded-full border border-border overflow-hidden ${className}`} role="group" aria-label="Moneda en la que ves los precios">
      {DIVISAS.map(d => {
        const active = divisa === d.code;
        return (
          <button
            key={d.code}
            type="button"
            onClick={() => setDivisa(d.code)}
            aria-pressed={active}
            title={`Ver los precios en ${d.label}`}
            className={`min-h-[32px] px-2.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
              active ? 'bg-bg-dark text-primary-foreground' : 'text-foreground/45 hover:text-foreground'
            }`}
          >
            {d.code}
          </button>
        );
      })}
    </div>
  );
}
