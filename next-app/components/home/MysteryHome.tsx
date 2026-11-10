'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import HomeSectionHeader from './HomeSectionHeader';
import { useProducts } from '@/hooks/useProducts';

/**
 * Mystery Archive en la home (post-Cyber, 9/11): sección chica, una fila de
 * tres. Valentín decidió dejar las Mystery publicadas a su precio actual
 * ("fue un producto que tuvo éxito").
 *
 * Nombre, precio y stock salen del catálogo (nada escrito a mano). La imagen
 * es la portada oficial de la ficha (public/mystery/portadas), porque Woo no
 * siempre devuelve foto para estos productos (ver #649). Una caja sin stock
 * se cae sola.
 */

const CAJAS = [
  { slug: 'mystery-tees', portada: '/mystery/portadas/tees-a.webp' },
  { slug: 'mystery-longsleeves', portada: '/mystery/portadas/longsleeves-a.webp' },
  { slug: 'mystery-hoodies', portada: '/mystery/portadas/hoodies-a.webp' },
];

const ars = (n: number) => '$ ' + n.toLocaleString('es-AR');

export default function MysteryHome() {
  const { data: allProducts = [] } = useProducts(0);

  const items = useMemo(() => {
    const bySlug = new Map(allProducts.map((p) => [p.slug, p]));
    return CAJAS.map((c) => ({ c, p: bySlug.get(c.slug) })).filter(
      (x) => x.p && Object.values(x.p.stock ?? {}).some((s) => s !== 'out'),
    );
  }, [allProducts]);

  if (items.length === 0) return null;

  return (
    <section id="mystery" className="px-4 pb-8 pt-10 md:px-6 md:pb-12 md:pt-14 scroll-mt-[var(--offset)]">
      <HomeSectionHeader
        eyebrow="Mystery Archive"
        title="Elegí tu talle. El modelo es sorpresa."
      />
      <ul className={`grid gap-2 md:gap-3 ${items.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {items.map(({ c, p }) => (
          <li key={c.slug}>
            <Link href={`/producto/${c.slug}`} className="group block">
              <div className="relative aspect-square overflow-hidden rounded-[10px] bg-[#f4f4f2] transition-shadow duration-300 [@media(hover:hover)]:group-hover:shadow-[0_14px_30px_-16px_rgba(10,10,10,0.28)]">
                <Image
                  src={c.portada}
                  alt={`${p!.name} — prendas del archivo Hype`}
                  fill
                  sizes="(max-width: 768px) 33vw, 30vw"
                  className="object-cover transition-transform duration-700 [@media(hover:hover)]:group-hover:scale-[1.02]"
                />
                <span className="absolute bottom-1.5 right-1.5 rounded-full bg-white/60 px-2 py-[3px] text-[8px] font-medium uppercase tracking-[0.14em] text-foreground ring-1 ring-white/50 backdrop-blur-md md:bottom-3 md:right-3 md:px-2.5 md:py-1 md:text-[10px]">
                  Sorpresa
                </span>
              </div>
              <p className="mt-2 text-[11.5px] leading-tight md:mt-3 md:text-[13px]">{p!.name}</p>
              <p className="mt-0.5 text-[11.5px] font-semibold md:text-[13px]">{ars(p!.price)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
