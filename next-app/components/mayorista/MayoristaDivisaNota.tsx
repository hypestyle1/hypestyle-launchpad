'use client';

import { useMayoristaDivisa } from '@/context/MayoristaDivisaContext';

// Al pie de cualquier bloque de precios convertidos: con qué cotización se
// hizo la cuenta y en qué moneda se factura. En pesos no se muestra nada.
//
// Va donde hay plata a la vista (catálogo, ficha, carrito) y no una sola vez
// arriba de todo: el mayorista decide mirando un precio, y si la aclaración
// quedó tres pantallas más arriba es como si no estuviera.

export default function MayoristaDivisaNota({ className = '' }: { className?: string }) {
  const { nota } = useMayoristaDivisa();
  if (!nota) return null;
  return <p className={`text-[11px] text-text-light leading-snug ${className}`}>{nota}</p>;
}
