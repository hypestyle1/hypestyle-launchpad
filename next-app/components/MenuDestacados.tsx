'use client';

import Link from 'next/link';
import { imgSrc } from '@/lib/img';
import { useLocale } from '@/context/LocaleContext';
import { MENU_DESTACADOS } from '@/data/menuDestacados';

/**
 * Las cuatro fotos del menú mobile, en 2x2 (referencia: emestudios.com).
 *
 * Se probó como tira que pasaba sola y se descartó: moverse solo distrae y las
 * cuatro fijas se leen de una. Lo que se cambia seguido vive en
 * data/menuDestacados.ts.
 */
export default function MenuDestacados({ onNavegar }: { onNavegar: () => void }) {
  const { t } = useLocale();

  return (
    <div className="grid grid-cols-2 gap-2 mb-7">
      {MENU_DESTACADOS.map((d) => (
        <Link key={d.label} href={d.href} onClick={onNavegar}
          className="relative block aspect-[4/5] overflow-hidden rounded-[6px] bg-foreground/5">
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
