import Image from 'next/image';
import Link from 'next/link';
import FlowHoverButton from '@/components/ui/flow-hover-button';
import { CYBER_CATEGORIAS_EDITORIAL } from '@/components/cyber/CyberEditorial';

/**
 * Hoodies / Remeras / Bottoms — los tres banners de categoría de la landing de
 * Cyber (components/cyber/CyberEditorial), traídos a la home post-Cyber (9/11,
 * pedido de Valentín). Mismas fotos y destinos; cambia la piel al sistema de la
 * home nueva: esquinas sutilmente redondeadas, sombra, título editorial y el
 * botón FlowHoverButton (vidrio beige) sobre la foto.
 *
 * Mobile: tira deslizable con snap (se asoma la siguiente). Desktop: 3 columnas.
 */

const TITULOS: Record<string, string> = { hoodies: 'Hoodies', tees: 'Remeras', pants: 'Bottoms' };

export default function CategoriasEditorial() {
  return (
    <section id="categorias" aria-label="Categorías" className="px-4 pb-6 pt-8 md:px-6 md:pb-10 md:pt-12">
      <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-3 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
        {CYBER_CATEGORIAS_EDITORIAL.map((t) => (
          <li key={t.id} className="w-[78%] shrink-0 snap-start md:w-auto">
            <div className="group relative aspect-[4/5] overflow-hidden rounded-[10px] shadow-[0_18px_40px_-24px_rgba(10,10,10,0.35)] md:aspect-[3/4]">
              <Link href={t.href} aria-label={TITULOS[t.id] ?? t.titulo} className="absolute inset-0 z-[1]" />
              <Image
                src={t.src}
                alt={t.alt}
                fill
                sizes="(max-width: 768px) 78vw, 33vw"
                className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                style={{ objectPosition: t.posicion }}
              />
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
              <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[2] flex items-end justify-between gap-3 md:inset-x-5 md:bottom-5">
                <span className="text-[26px] font-medium leading-none tracking-[-0.02em] text-white md:text-[30px]">
                  {TITULOS[t.id] ?? t.titulo}
                </span>
                <span className="pointer-events-auto">
                  <FlowHoverButton href={t.href} size="sm">
                    Ver todo
                  </FlowHoverButton>
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
