'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo } from 'react';
import { useProducts } from '@/hooks/useProducts';

/* Accesos rápidos por categoría — la pieza que acorta el camino entre entrar
   y encontrar algo para comprar.

   ── Por qué así ─────────────────────────────────────────────────────────────
   Va inmediatamente después del hero, que es donde cae quien llega de
   Instagram o de un anuncio: antes de pedirle que entienda la mecánica del
   evento, se le muestra qué hay y se lo deja elegir. Un clic, no tres.

   En mobile (89,6% de las sesiones) es una tira que se desliza con el dedo,
   no seis filas de botones: ocupa una franja y deja el producto a la vista.
   En desktop es una grilla de tiles editoriales.

   ── Cada tile lleva a SU PÁGINA ─────────────────────────────────────────────
   Son links a las categorías reales del sitio (`/tees`, `/hoodies`,
   `/longsleeves`, `/pants`, `/colecciones/regular-tees`), todas verificadas
   respondiendo 200. No son filtros de la grilla del evento: quien busca
   hoodies quiere la página de hoodies, con su catálogo completo y sus
   filtros, no un recorte. Las dos excepciones son las secciones que solo
   existen dentro del evento —Mystery y los 3 drops—, que llevan a su ancla de
   esta misma página.

   ── Las fotos son REALES y salen del catálogo en vivo ───────────────────────
   Cada tile toma la foto de portada del producto líder de su categoría (el
   primero de la lista curada en lib/cyber-cartelera). No hay imágenes
   inventadas ni íconos genéricos: si mañana cambia la curaduría, cambia la
   foto. Mystery usa su portada real (el collage de mockups de Woo) y Drops no
   lleva foto a propósito — es la incógnita. */

export interface AccesoCategoria {
  id: string;
  label: string;
  /** Adónde va: página real del sitio o ancla del evento. */
  href: string;
  /** Slug del producto que presta su foto, o null si la imagen es fija. */
  slugFoto: string | null;
  /** Imagen fija (Mystery) o null para usar la del producto. */
  img: string | null;
}

export default function CyberNavCategorias({ accesos }: { accesos: AccesoCategoria[] }) {
  const { data } = useProducts();

  const tiles = useMemo(() => {
    const bySlug = new Map((data ?? []).map((p) => [p.slug, p]));
    return accesos.map((a) => ({
      ...a,
      foto: a.img ?? (a.slugFoto ? bySlug.get(a.slugFoto)?.images?.[0] ?? null : null),
    }));
  }, [data, accesos]);

  return (
    <nav
      aria-label="Categorías del evento"
      className="bg-[#0a0a0a] px-4 pt-8 text-white md:px-10 md:pt-10"
    >
      <div className="mx-auto max-w-[1400px]">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.26em] text-white/45 md:text-[11px]">
          Buscá directo
        </p>

        {/* Mobile: tira deslizable. Desktop: grilla. Los gutters negativos en
            mobile dejan que el scroll llegue al borde de la pantalla, que es
            lo que avisa que hay más a la derecha. */}
        <ul className="-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:gap-3 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-7">
          {tiles.map((t) => (
            <li key={t.id} className="w-[132px] shrink-0 snap-start md:w-auto">
              <Link href={t.href} className="group block focus-visible:outline-white">
                <span className="relative block aspect-[4/5] overflow-hidden rounded-[12px] border border-white/12 bg-[#151515]">
                  {t.foto ? (
                    <Image
                      src={t.foto}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 132px, 200px"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[34px] font-black text-white/15">
                      ?
                    </span>
                  )}
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <span className="absolute inset-x-2.5 bottom-2.5 text-[11.5px] font-bold uppercase leading-[1.2] tracking-[0.04em] text-white md:text-[12.5px]">
                    {t.label}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
