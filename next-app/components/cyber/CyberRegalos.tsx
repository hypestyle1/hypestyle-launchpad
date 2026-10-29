'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import { useProducts } from '@/hooks/useProducts';

/* REGALO POR COMPRA — banda clara entre Mystery y los drops.

   ── Por qué va acá y con este fondo ─────────────────────────────────────────
   Queda después de Mystery y antes del catálogo, que es zona comercial
   caliente, y en **fondo claro**: entre dos secciones negras, el contraste es
   lo que la despega — no queda pegada ni a Mystery ni a los drops aunque esté
   entre las dos.

   ── Por qué las tarjetas son apaisadas ──────────────────────────────────────
   La versión anterior tenía una foto cuadrada enorme arriba y el texto
   debajo: tres bloques altísimos que en mobile eran casi una pantalla cada
   uno, para decir un monto y un nombre. Ahora cada tarjeta es una banda de
   ~165 px con el dato a la izquierda y el regalo a la derecha: se lee de un
   golpe y las tres entran donde antes entraba una.

   ── Por qué se publican estos montos ────────────────────────────────────────
   No son precios ni porcentajes: son umbrales de una mecánica **ya viva en
   producción**. Verificado contra `POST /api/gift-progress` del sitio
   publicado: `active: true`, modo `highest`, $100.000 Chain · $140.000 Socks ·
   $300.000 Zippo. 33 de los 44 pedidos de ≥$100.000 de los últimos 60 días
   recibieron su regalo.

   Las fotos salen del catálogo EN VIVO, de la ficha real de cada regalo. El
   modo `highest` significa que se lleva UN regalo, el del nivel más alto: la
   aclaración va una sola vez, debajo de las tres. Y el Zippo lleva "hasta
   agotar stock" porque quedan 5 contra 30 cadenas. */

/**
 * `foto` es el índice dentro de la galería de la ficha (0 = la portada).
 * No siempre manda la portada: la de las medias es el pack cerrado con la
 * faja, que a este tamaño se lee como un bulto blanco, y la del Zippo es el
 * encendedor cerrado y de frente, que queda plano. Las elegidas son el
 * mockup del par y el Zippo abierto en tres cuartos — las dos salen de la
 * misma ficha, así que siguen siendo fotos reales del producto.
 */
const NIVELES = [
  { monto: '$100.000', nombre: 'Hype Chain', slug: 'chain-hype', foto: 0, limitado: false },
  { monto: '$140.000', nombre: 'Hype Socks', slug: 'pack-x3-medias-hype-white', foto: 1, limitado: false },
  { monto: '$300.000', nombre: 'Zippo Hype', slug: 'per-aspera-ad-astra-zippo', foto: 2, limitado: true },
];

export default function CyberRegalos() {
  const { data } = useProducts();

  const niveles = useMemo(() => {
    const bySlug = new Map((data ?? []).map((p) => [p.slug, p]));
    return NIVELES.map((n) => {
      const imgs = bySlug.get(n.slug)?.images ?? [];
      // Si la ficha todavía no tiene esa imagen, cae a la portada antes que
      // quedarse sin foto.
      return { ...n, src: imgs[n.foto] ?? imgs[0] };
    });
  }, [data]);

  return (
    <section id="regalos" className="bg-bg-alt px-4 py-11 text-foreground md:px-10 md:py-14">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-5 md:mb-6">
          <h2 className="text-[24px] font-black uppercase leading-[0.95] tracking-[-0.01em] md:text-[30px]">
            Regalo por compra
          </h2>
          <p className="mt-1.5 text-[13.5px] text-muted-foreground md:text-[14.5px]">
            Cuanto más sumás, mejor es tu regalo.
          </p>
        </div>

        {/* Mobile: carrusel con snap, una tarjeta y parte de la siguiente.
            Desktop: las tres en una fila. */}
        <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
          {niveles.map((n) => (
            <li
              key={n.monto}
              className="w-[80vw] max-w-[330px] shrink-0 snap-center md:w-auto md:max-w-none"
            >
              <article className="flex h-[150px] items-stretch overflow-hidden rounded-[14px] border border-foreground/10 bg-[#0a0a0a] text-white md:h-[165px]">
                {/* Dato a la izquierda */}
                <div className="flex flex-1 flex-col justify-center px-4 py-4 md:px-5">
                  <span className="text-[9.5px] font-semibold uppercase tracking-[0.24em] text-white/40">
                    Desde
                  </span>
                  <span className="mt-0.5 text-[25px] font-black leading-none tabular-nums md:text-[29px]">
                    {n.monto}
                  </span>
                  <span className="mt-1.5 text-[12.5px] font-bold uppercase tracking-[0.05em] md:text-[13.5px]">
                    {n.nombre}
                  </span>
                  {n.limitado && (
                    <span className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/35">
                      Hasta agotar stock
                    </span>
                  )}
                </div>

                {/* El regalo a la derecha, en su bloque blanco: los packshots
                    vienen recortados sobre blanco, así se funden en vez de
                    dejar un recuadro flotando sobre el negro. */}
                <div className="relative w-[42%] shrink-0 bg-white">
                  {n.src && (
                    <Image
                      src={n.src}
                      alt={n.nombre}
                      fill
                      sizes="(max-width: 768px) 140px, 180px"
                      className="object-contain p-2.5"
                    />
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>

        <p className="mt-3.5 text-[12px] text-muted-foreground md:text-[12.5px]">
          Te llevás el regalo del nivel más alto que alcances.
        </p>
      </div>
    </section>
  );
}
