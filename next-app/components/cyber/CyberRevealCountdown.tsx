'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Cuenta regresiva a la revelación de un drop, dentro de su tarjeta.
 *
 * Qué resuelve: una tarjeta que solo dice "por revelar" no da ningún motivo
 * para volver. La hora sí, y decirla no revela nada del contenido — el
 * producto ni siquiera viaja al navegador hasta que pasa (ver
 * `dropsPublicos`). Es el único dato del drop bloqueado que se publica.
 *
 * El primer render tiene que coincidir con el del servidor, así que arranca
 * en null y los dígitos aparecen al montar. Al llegar a cero pide un refresh:
 * el estado nuevo lo calcula el servidor, no el browser — un reloj adelantado
 * no puede destapar un drop.
 */
export default function CyberRevealCountdown({ targetIso }: { targetIso: string }) {
  const router = useRouter();
  const target = new Date(targetIso).getTime();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  useEffect(() => {
    if (left !== 0) return;
    const id = setTimeout(() => router.refresh(), 1500);
    return () => clearTimeout(id);
  }, [left, router]);

  if (left === null) return <span className="text-white/40">—</span>;

  // Con más de un día por delante, "93:41:44" no se lee: se cuenta en días y
  // horas. Dentro del último día, el reloj completo, que es el que apura.
  const d = Math.floor(left / 86_400_000);
  const h = Math.floor((left % 86_400_000) / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  const dd = (n: number) => String(n).padStart(2, '0');

  return (
    <span className="tabular-nums text-white">
      {d > 0 ? `${d} d ${h} h` : `${dd(h)}:${dd(m)}:${dd(s)}`}
    </span>
  );
}
