'use client';

import { FICHA_VARIANTES, type FichaVariante } from '@/lib/ficha';

/**
 * Barra para saltar entre variantes mientras se prueban. En local está siempre;
 * en un deploy solo aparece si se entró con `?ficha=a|b|c`, así un visitante
 * común nunca la ve.
 */
export default function SelectorVariante({ actual }: { actual: FichaVariante | null }) {
  if (process.env.NODE_ENV === 'production' && !actual) return null;
  const opciones: { id: string; nombre: string }[] = [{ id: 'actual', nombre: 'Actual' }, ...FICHA_VARIANTES.map(v => ({ id: v.id, nombre: `${v.id.toUpperCase()} · ${v.nombre}` }))];
  return (
    <div className="fixed z-[150] left-1/2 -translate-x-1/2 top-[calc(var(--offset)+8px)] flex gap-1 p-1 bg-black/85 backdrop-blur-sm rounded-full shadow-lg max-w-[calc(100vw-24px)] overflow-x-auto">
      {opciones.map(o => {
        const activa = (actual ?? 'actual') === o.id;
        return (
          // Enlace común (recarga): la variante se lee al montar la ficha.
          <a key={o.id} href={`?ficha=${o.id}`} aria-current={activa}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-semibold ${activa ? 'bg-white text-black' : 'text-white/75 hover:text-white'}`}>
            {o.nombre}
          </a>
        );
      })}
    </div>
  );
}
