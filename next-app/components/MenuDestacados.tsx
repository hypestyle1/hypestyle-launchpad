'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { imgSrc } from '@/lib/img';
import { useLocale } from '@/context/LocaleContext';
import { MENU_DESTACADOS, type MenuDestacado } from '@/data/menuDestacados';

/**
 * Las cuatro fotos del menú mobile, en 2x2 (referencia: emestudios.com).
 *
 * Un recuadro con varias fotos las pasa solo, en fundido, como un GIF: así el
 * de Accesorios muestra el posteo entero (gorra, chain, medias) sin ocupar más
 * lugar. Se probó que se moviera toda la tira y se descartó: distraía.
 */

const PASO_MS = 1800;

function Recuadro({ d, onNavegar }: { d: MenuDestacado; onNavegar: () => void }) {
  const { t } = useLocale();
  const fotos = Array.isArray(d.img) ? d.img : [d.img];
  const [i, setI] = useState(0);

  useEffect(() => {
    if (fotos.length < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setI((n) => (n + 1) % fotos.length), PASO_MS);
    return () => clearInterval(id);
  }, [fotos.length]);

  return (
    <Link href={d.href} onClick={onNavegar}
      className="relative block aspect-[4/5] overflow-hidden rounded-[6px] bg-foreground/5">
      {fotos.map((src, n) => (
        <img key={src} src={imgSrc(src)} alt={n === 0 ? t(d.label) : ''} loading="lazy"
          aria-hidden={n !== 0}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            n === i ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ objectPosition: d.encuadre ?? 'center' }} />
      ))}
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/2"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.48), transparent)' }} />
      <span className="absolute left-3 bottom-2.5 text-white text-[15px] font-medium tracking-tight">
        {t(d.label)}
      </span>
    </Link>
  );
}

export default function MenuDestacados({ onNavegar }: { onNavegar: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 mb-7">
      {MENU_DESTACADOS.map((d) => (
        <Recuadro key={d.label} d={d} onNavegar={onNavegar} />
      ))}
    </div>
  );
}
