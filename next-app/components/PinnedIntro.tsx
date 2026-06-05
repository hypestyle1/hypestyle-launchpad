'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Pinea el bloque de intro (Hero + EventCountdown + BenefitsStrip) mientras la
 * sección que viene a continuación (New In) sube y pasa por encima.
 *
 * El truco: pin con `pinSpacing: false` deja el bloque fijo sin reservar espacio,
 * así el contenido siguiente —con mayor z-index y fondo sólido— scrollea por
 * arriba tapándolo. El bloque queda con z-index 0; New In se renderiza con z-10.
 */
export default function PinnedIntro({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: 'bottom top',
        pin: true,
        pinSpacing: false,
        anticipatePin: 1,
      });
    }, el);

    // El contenido de abajo (New In) carga async: hasta que no están los
    // productos + imágenes, el alto de la página cambia y ScrollTrigger queda
    // con medidas viejas (fondo transparente / secciones fuera de lugar).
    // Recalculamos en cada cambio de alto del documento, debounced con rAF.
    let raf = 0;
    const refresh = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    };
    const ro = new ResizeObserver(refresh);
    ro.observe(document.body);
    window.addEventListener('load', refresh);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('load', refresh);
      ctx.revert();
    };
  }, []);

  return (
    <div ref={ref} className="relative z-0">
      {children}
    </div>
  );
}
