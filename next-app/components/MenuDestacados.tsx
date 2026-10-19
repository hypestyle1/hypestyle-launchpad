'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { imgSrc } from '@/lib/img';
import { useLocale } from '@/context/LocaleContext';
import { MENU_DESTACADOS } from '@/data/menuDestacados';

/**
 * Tira de fotos del menú mobile: pasa sola, rápido, y se detiene apenas la
 * persona la toca (si la está mirando, no tiene que pelearle al movimiento).
 *
 * No es un carrusel con estado: es scroll horizontal con snap, y el avance
 * automático es un `scrollTo` cada PASO_MS. Eso mantiene el arrastre nativo y
 * el teclado funcionando, y si el navegador respeta "reducir movimiento" no
 * se mueve solo.
 */

const PASO_MS = 2600;

export default function MenuDestacados({ onNavegar }: { onNavegar: () => void }) {
  const { t } = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const tocado = useRef(false);

  useEffect(() => {
    const cont = ref.current;
    if (!cont) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const frenar = () => { tocado.current = true; };
    cont.addEventListener('pointerdown', frenar, { passive: true });
    cont.addEventListener('wheel', frenar, { passive: true });

    const id = setInterval(() => {
      if (tocado.current || !cont.isConnected) return;
      const paso = cont.firstElementChild instanceof HTMLElement
        ? cont.firstElementChild.offsetWidth + 8
        : cont.clientWidth * 0.62;
      // Al llegar al final vuelve al principio: la tira no termina nunca.
      const fin = cont.scrollWidth - cont.clientWidth - 8;
      const destino = cont.scrollLeft >= fin ? 0 : cont.scrollLeft + paso;
      cont.scrollTo({ left: destino, behavior: 'smooth' });
    }, PASO_MS);

    return () => {
      clearInterval(id);
      cont.removeEventListener('pointerdown', frenar);
      cont.removeEventListener('wheel', frenar);
    };
  }, []);

  return (
    <div ref={ref}
      className="flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory mb-7">
      {MENU_DESTACADOS.map((d) => (
        <Link key={d.label} href={d.href} onClick={onNavegar}
          className="relative shrink-0 snap-start w-[62%] aspect-[4/5] overflow-hidden rounded-[6px] bg-foreground/5">
          <img src={imgSrc(d.img)} alt={t(d.label)} loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: d.encuadre ?? 'center' }} />
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/2"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.48), transparent)' }} />
          <span className="absolute left-3 bottom-2.5 text-white text-[15px] font-medium tracking-tight">
            {t(d.label)}
          </span>
        </Link>
      ))}
    </div>
  );
}
