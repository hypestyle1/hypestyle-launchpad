'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// En el cliente el arranque en 0 se aplica antes del primer pintado: con
// useEffect se veía un cuadro con el valor final y después saltaba a 0.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Número que sube hasta `to` cuando entra en pantalla, una sola vez (estilo
 * los saldos de las apps de pago). Curva que frena al final, ~1,1 s.
 * Con prefers-reduced-motion muestra el valor final directo. El valor final
 * es siempre `to`: la animación es solo el recorrido.
 */
export function CountUp({
  to,
  duration = 1100,
  suffix = '',
  className,
}: {
  to: number;
  duration?: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [valor, setValor] = useState(to);
  const hecho = useRef(false);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || hecho.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setValor(0);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || hecho.current) return;
      hecho.current = true;
      io.disconnect();
      const t0 = performance.now();
      const paso = (t: number) => {
        // El timestamp del primer cuadro puede ser anterior a t0: sin el max daba negativo.
        const p = Math.min(1, Math.max(0, (t - t0) / duration));
        const ease = 1 - Math.pow(1 - p, 4);
        setValor(Math.round(to * ease));
        if (p < 1) raf = requestAnimationFrame(paso);
      };
      raf = requestAnimationFrame(paso);
    }, { threshold: 0.3 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, duration]);

  return (
    <span ref={ref} className={className} aria-label={`${to.toLocaleString('es-AR')}${suffix}`}>
      <span aria-hidden="true" className="tabular-nums">{valor.toLocaleString('es-AR')}{suffix}</span>
    </span>
  );
}
