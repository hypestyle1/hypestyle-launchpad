import Link from 'next/link';
import type { Hype72BoardItem, Hype72State } from '@/lib/hype72';

/**
 * La cartelera de los 6 drops de HYPE 72, con revelación progresiva.
 *
 * Componente de servidor a propósito: el estado de cada fila lo calcula
 * lib/hype72.ts con la hora del servidor y llega resuelto por props. Acá no se
 * mira el reloj del browser, así que ni cambiando la fecha de la máquina se
 * adelanta una revelación.
 *
 * Mobile primero: una fila por drop, número grande a la izquierda. Desde md la
 * misma fila se abre en dos columnas (meta a la derecha).
 */
export default function Hype72Board({ items }: { items: Hype72BoardItem[] }) {
  return (
    <ol className="border-t border-black/10">
      {items.map((item) => (
        <li key={item.drop.id} className="border-b border-black/10">
          <Row item={item} />
        </li>
      ))}
    </ol>
  );
}

function Row({ item }: { item: Hype72BoardItem }) {
  const { drop, state } = item;
  const open = state === 'abierto';
  const hidden = state === 'oculto';

  const body = (
    <div className="flex gap-4 px-4 py-7 md:gap-8 md:px-6 md:py-9">
      {/* El número del drop. En los que todavía no se revelaron va apagado:
          la cartelera se enciende de arriba hacia abajo. */}
      <span
        className={`shrink-0 text-[40px] font-black leading-[0.8] tracking-[-0.04em] tabular-nums md:text-[56px] ${
          hidden ? 'text-black/15' : 'text-black'
        }`}
        aria-hidden
      >
        {drop.id}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/45">
            {drop.slot}
          </p>
          <StatePill state={state} revealLabel={drop.revealLabel} />
        </div>

        <h3
          className={`mt-2.5 text-[21px] font-bold uppercase leading-[1.08] tracking-[-0.02em] md:text-[26px] ${
            hidden ? 'text-black/30' : 'text-black'
          }`}
        >
          {/* Antes de su revelación el drop no se cuenta: solo su horario. */}
          {hidden ? '???' : drop.title}
        </h3>

        {!hidden && (
          <>
            <p className="mt-1.5 text-[14px] leading-snug text-black/65">{drop.claim}</p>
            {drop.priceNote && (
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
                {drop.priceNote}
              </p>
            )}
          </>
        )}

        {open && (
          <span className="mt-4 inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-black underline decoration-1 underline-offset-[5px]">
            Ver el drop
            <span aria-hidden>→</span>
          </span>
        )}
      </div>
    </div>
  );

  if (!open) return body;

  return (
    <Link href={drop.href} className="block transition-colors hover:bg-black/[0.03]">
      {body}
    </Link>
  );
}

const PILL = 'inline-flex items-center px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em]';

function StatePill({ state, revealLabel }: { state: Hype72State; revealLabel: string }) {
  if (state === 'abierto') {
    return <span className={`${PILL} bg-black text-white`}>Abierto</span>;
  }
  if (state === 'revelado') {
    return <span className={`${PILL} border border-black/25 text-black/70`}>Revelado</span>;
  }
  if (state === 'cerrado') {
    return <span className={`${PILL} border border-black/15 text-black/40`}>Cerrado</span>;
  }
  return (
    <span className={`${PILL} border border-black/15 text-black/45`}>
      Se revela {revealLabel}
    </span>
  );
}
