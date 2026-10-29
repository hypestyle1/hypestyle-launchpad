'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import { useProducts } from '@/hooks/useProducts';

/* REGALO POR COMPRA — sección propia, con la foto real de cada regalo.

   ── Por qué se publican estos montos ────────────────────────────────────────
   Es la única parte de la página con cifras, y no es una excepción a la regla:
   no son precios ni porcentajes, son umbrales de una mecánica que **ya está
   viva en producción**. Verificado contra `POST /api/gift-progress` del sitio
   publicado: `active: true`, modo `highest`, niveles $100.000 Hype Chain ·
   $140.000 Hype Socks · $300.000 Zippo. No es una promesa nueva del evento:
   es lo que el carrito ya hace, y 33 de los 44 pedidos de ≥$100.000 de los
   últimos 60 días recibieron su regalo.

   Mostrarla es la palanca de ticket con mejor relación costo/efecto que tiene
   la marca: el 80% de los pedidos no llega a $100.000, así que el primer
   escalón está a un accesorio de distancia de mucha gente que hoy no sabe que
   existe.

   ── Las fotos ───────────────────────────────────────────────────────────────
   Salen del catálogo EN VIVO, de la ficha real de cada regalo (`chain-hype`,
   `pack-x3-medias-hype-white`, `per-aspera-ad-astra-zippo`). Nada de renders
   ni de imágenes conceptuales: si mañana se cambia la foto del producto en
   Woo, cambia acá. Si una ficha no estuviera disponible, su tarjeta sale sin
   foto antes que con una inventada.

   ── Lo que el copy NO puede decir ───────────────────────────────────────────
   El modo es `highest`: se lleva **un** regalo, el del nivel más alto que se
   alcanza. No se acumulan. Y el Zippo va con "hasta agotar stock" porque
   quedan 5 contra 30 Hype Chain: un umbral que no se puede cumplir es la
   promesa más cara de la página. */

const NIVELES = [
  {
    monto: '$100.000',
    nombre: 'Hype Chain',
    slug: 'chain-hype',
    detalle: 'La cadena de siempre. El primer escalón.',
    limitado: false,
  },
  {
    monto: '$140.000',
    nombre: 'Hype Socks',
    slug: 'pack-x3-medias-hype-white',
    detalle: 'Pack de medias oficiales.',
    limitado: false,
  },
  {
    monto: '$300.000',
    nombre: 'Zippo Hype',
    slug: 'per-aspera-ad-astra-zippo',
    detalle: 'Edición especial.',
    limitado: true,
  },
];

export default function CyberRegalos() {
  const { data } = useProducts();

  const niveles = useMemo(() => {
    const bySlug = new Map((data ?? []).map((p) => [p.slug, p]));
    return NIVELES.map((n) => ({ ...n, foto: bySlug.get(n.slug)?.images?.[0] }));
  }, [data]);

  return (
    <section id="regalos" className="bg-[#0a0a0a] px-4 py-12 text-white md:px-10 md:py-16">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 md:mb-8">
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-white/45 md:text-[11px]">
              Suma sola al carrito
            </p>
            <h2 className="text-[26px] font-black uppercase leading-[0.95] tracking-[-0.01em] md:text-[36px]">
              Regalo por compra
            </h2>
          </div>
          <p className="max-w-[40ch] text-[12.5px] leading-[1.5] text-white/50 md:text-[13px]">
            Se agrega solo al llegar al monto y viaja en el mismo pedido. Te llevás el regalo del
            nivel más alto que alcances.
          </p>
        </div>

        {/* Mobile: carrusel compacto. Desktop: tres columnas. */}
        <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
          {niveles.map((n) => (
            <li
              key={n.monto}
              className="w-[76vw] max-w-[310px] shrink-0 snap-center md:w-auto md:max-w-none"
            >
              <article className="flex h-full flex-col overflow-hidden rounded-[16px] border border-white/12 bg-white/[0.04]">
                {/* La foto, protagonista, sobre blanco pleno: los packshots de
                    Woo ya vienen recortados sobre blanco, así que un fondo
                    gris dejaba un recuadro flotando dentro de la tarjeta. Con
                    el contenedor en blanco el producto se funde y el bloque se
                    lee como una vidriera — blanco arriba, negro abajo. */}
                <div className="relative aspect-[4/3] overflow-hidden bg-white">
                  {n.foto && (
                    <Image
                      src={n.foto}
                      alt={n.nombre}
                      fill
                      sizes="(max-width: 768px) 76vw, 420px"
                      className="object-contain p-5"
                    />
                  )}
                </div>

                <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5 md:px-5 md:pb-5">
                  <span className="text-[9.5px] font-semibold uppercase tracking-[0.24em] text-white/40">
                    Desde
                  </span>
                  <span className="mt-0.5 text-[26px] font-black leading-none tabular-nums text-white md:text-[30px]">
                    {n.monto}
                  </span>
                  <p className="mt-2 text-[13.5px] font-bold uppercase tracking-[0.04em] text-white md:text-[15px]">
                    {n.nombre}
                  </p>
                  <p className="mt-1 text-[12px] leading-[1.45] text-white/50 md:text-[12.5px]">
                    {n.detalle}
                  </p>
                  {n.limitado && (
                    <p className="mt-2 text-[10.5px] uppercase tracking-[0.14em] text-white/35">
                      Hasta agotar stock
                    </p>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
