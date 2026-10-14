'use client';

import Link from 'next/link';

// Confirmación al sumar al pedido: lo que se agregó y un atajo al carrito.
// Antes era un "✓ Agregado" de 1,5 s en el botón, sin forma de ir al pedido.
export default function MayoristaAddedNotice({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div role="status" className="mt-2 flex items-center justify-between gap-3 rounded-[8px] border border-foreground bg-background px-3 py-2 text-[12px]">
      <span className="truncate">✓ {text}</span>
      <span className="flex items-center gap-3 shrink-0">
        <Link href="/mayoristas/carrito" className="font-semibold uppercase tracking-wide text-[11px] underline underline-offset-2">Ver pedido</Link>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="text-text-light hover:text-foreground">✕</button>
      </span>
    </div>
  );
}
