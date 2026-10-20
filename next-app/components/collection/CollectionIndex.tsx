'use client';

import { useLocale } from '@/context/LocaleContext';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

export type CollectionIndexItem = { id: string; label: string };

/**
 * El encabezado sticky de una colección — la generalización del índice del
 * feed SS27 (alternativa B aprobada): cada bloque de colección trae el suyo,
 * scoped a su sección por semántica de `position: sticky`, y el "handoff"
 * entre colecciones consecutivas es CSS nativo (el que termina se va con su
 * sección y el siguiente lo reemplaza).
 *
 * Fixes de auditoría que incorpora respecto del original:
 * - PA-16: los links viven en un <nav> FUERA del h2 (antes un lector de
 *   pantalla anunciaba todo el índice como parte del título).
 * - PA-11: inactivo /45 con hover /70 (antes /25 = contraste 1,78:1).
 * - SS-10: en mobile es UNA línea compacta (título abreviado + riel con
 *   scroll horizontal), ~44px de alto en vez de 73 y sin cortar etiquetas.
 * - Reduced motion: el auto-scroll del riel deja de ser smooth.
 *
 * El material del fondo sale de --glass-sticky-* (ver globals.css): por
 * defecto es exactamente el bg-white/90 + blur actual; el laboratorio de
 * diseño lo pisa para probar el material único.
 */
export default function CollectionIndex({
  title,
  shortTitle,
  items = [],
  active,
  prefix,
  cta,
  onSelect,
}: {
  title: string;
  /** Título para mobile (una línea): "SS27" en vez de "Spring Summer 27". */
  shortTitle?: string;
  items?: CollectionIndexItem[];
  active?: string;
  /** Prefijo de los ids de sección destino: `${prefix}${item.id}`. */
  prefix: string;
  cta?: { href: string; label: string };
  onSelect?: (id: string) => void;
}) {
  const { t } = useLocale();
  const navRef = useRef<HTMLElement>(null);

  // En mobile el riel no entra entero: se corre solo hasta la sección activa.
  useEffect(() => {
    const nav = navRef.current;
    const el = nav?.querySelector<HTMLElement>(`[data-nav="${active}"]`);
    if (!nav || !el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    nav.scrollTo({ left: el.offsetLeft - nav.offsetLeft - 8, behavior: reduce ? 'auto' : 'smooth' });
  }, [active]);

  return (
    <div className="hs-collection-index sticky top-[var(--offset)] z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-2.5 md:py-3 mb-4 md:mb-6 flex items-center md:items-end justify-between gap-3 md:gap-4">
      <div className="min-w-0 flex items-center md:items-baseline gap-x-2.5 md:gap-x-3">
        <h2 className="shrink-0 text-[17px] md:text-[34px] font-semibold tracking-[-0.035em] leading-none whitespace-nowrap">
          {shortTitle ? (
            <>
              <span className="md:hidden">{shortTitle}</span>
              <span className="hidden md:inline">{t(title)}</span>
            </>
          ) : t(title)}
        </h2>
        {items.length > 0 && (
          <span aria-hidden className="shrink-0 self-center w-px h-[1em] md:h-[0.85em] bg-foreground/20" />
        )}
        {items.length > 0 && (
          <nav
            ref={navRef}
            aria-label={`${t('Secciones de')} ${t(title)}`}
            // Un escalón abajo del título (26px vs 34, peso 500 vs 600) y
            // separado por el filete: el título es el nombre del estante, el
            // riel son sus secciones — antes se leían como una sola frase.
            className="flex items-baseline gap-x-1.5 md:gap-x-2 overflow-x-auto no-scrollbar whitespace-nowrap text-[14px] md:text-[26px] font-medium tracking-[-0.03em] leading-none pb-[0.2em] -mb-[0.2em]"
          >
            {items.map((x, k) => (
              <span key={x.id} data-nav={x.id} className="flex items-baseline gap-x-1.5 md:gap-x-2">
                {k > 0 && <span aria-hidden className="text-foreground/25">/</span>}
                <a
                  href={`#${prefix}${x.id}`}
                  aria-current={active === x.id ? 'true' : undefined}
                  onClick={() => onSelect?.(x.id)}
                  className={`transition-colors ${active === x.id ? 'text-foreground' : 'text-foreground/45 hover:text-foreground/70'}`}
                >
                  {x.label}
                </a>
              </span>
            ))}
          </nav>
        )}
      </div>
      {cta && (
        <Link href={cta.href} className="shrink-0 text-[11px] md:text-[12px] font-semibold uppercase underline underline-offset-4">
          {cta.label}
        </Link>
      )}
    </div>
  );
}
