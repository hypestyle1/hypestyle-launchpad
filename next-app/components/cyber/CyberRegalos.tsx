'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import { useProducts } from '@/hooks/useProducts';

/* REGALO POR COMPRA — la escalera, de un vistazo.

   ── Por qué no hay carrusel ─────────────────────────────────────────────────
   Antes era un slider: en mobile se veía una tarjeta y media cortada, con la
   barra de scroll a la vista, y había que deslizar para enterarse de que
   existían tres niveles. Una escalera que no se ve entera no es una escalera.
   Ahora las tres entran en una sola pantalla, en grilla de tres columnas, y
   la progresión $100.000 → $140.000 → $300.000 se lee sin tocar nada.

   El precio de que entren juntas es que cada una es angosta, así que adentro
   va lo mínimo: foto, "desde", monto y nombre. Las descripciones ("la cadena
   de siempre", "pack de medias oficiales") se fueron — a este tamaño no se
   leen y no agregan nada que la foto no diga.

   ── Fondo ───────────────────────────────────────────────────────────────────
   Negro, como el resto del evento. El gris claro de la versión anterior
   cortaba la página en dos y no era el lenguaje de la campaña; lo que separa
   esta sección ahora es el aire y el filete del contenedor, no un cambio de
   color.

   ── Los montos ──────────────────────────────────────────────────────────────
   No son precios ni porcentajes: son umbrales de una mecánica ya viva,
   verificada contra `POST /api/gift-progress` del sitio publicado
   (`active: true`, modo `highest`). El modo `highest` es el motivo de que la
   aclaración vaya una sola vez abajo: se lleva UN regalo, el del nivel más
   alto. El Zippo mantiene "hasta agotar stock" porque quedan 5 contra 30
   cadenas. Las fotos salen de la ficha real de cada regalo. */

const NIVELES = [
  { monto: '$100.000', nombre: 'Hype Chain', slug: 'chain-hype', foto: 0, nota: '' },
  { monto: '$140.000', nombre: 'Hype Socks', slug: 'pack-x3-medias-hype-white', foto: 1, nota: '' },
  {
    monto: '$300.000',
    nombre: 'Zippo Hype',
    slug: 'per-aspera-ad-astra-zippo',
    foto: 2,
    nota: 'Hasta agotar stock',
  },
];

export default function CyberRegalos() {
  const { data } = useProducts();

  const niveles = useMemo(() => {
    const bySlug = new Map((data ?? []).map((p) => [p.slug, p]));
    return NIVELES.map((n) => {
      const imgs = bySlug.get(n.slug)?.images ?? [];
      return { ...n, src: imgs[n.foto] ?? imgs[0] };
    });
  }, [data]);

  return (
    <section id="regalos" className="bg-[#0a0a0a] px-4 py-12 text-white md:px-10 md:py-14">
      <div className="mx-auto max-w-[1100px] rounded-[18px] border border-white/12 px-4 py-8 md:px-9 md:py-10">
        <div className="mb-6 text-center md:mb-8">
          <h2 className="text-[22px] font-black uppercase leading-[0.95] tracking-[-0.01em] md:text-[28px]">
            Regalo por compra
          </h2>
          <p className="mt-1.5 text-[12.5px] text-white/50 md:text-[14px]">
            Cuanto más sumás, mejor es tu regalo.
          </p>
        </div>

        {/* Las tres juntas, siempre: tres columnas iguales en cualquier ancho. */}
        <ul className="grid grid-cols-3 gap-2.5 md:gap-5">
          {niveles.map((n) => (
            <li key={n.monto}>
              <article className="flex h-full flex-col overflow-hidden rounded-[12px] border border-white/10 bg-white/[0.03]">
                {/* La foto en su bloque blanco: los packshots ya vienen
                    recortados sobre blanco, así se funden en vez de dejar un
                    recuadro flotando. */}
                <div className="relative aspect-square bg-white">
                  {n.src && (
                    <Image
                      src={n.src}
                      alt={n.nombre}
                      fill
                      sizes="(max-width: 768px) 33vw, 300px"
                      className="object-contain p-2 md:p-4"
                    />
                  )}
                </div>

                <div className="flex flex-1 flex-col px-2.5 pb-3 pt-2.5 text-center md:px-4 md:pb-4 md:pt-3.5">
                  <span className="text-[8.5px] font-semibold uppercase tracking-[0.2em] text-white/35 md:text-[10px]">
                    Desde
                  </span>
                  <span className="mt-0.5 text-[14px] font-black leading-none tabular-nums text-white md:text-[22px]">
                    {n.monto}
                  </span>
                  <span className="mt-1 text-[10px] font-bold uppercase leading-[1.2] tracking-[0.03em] text-white/85 md:text-[13px]">
                    {n.nombre}
                  </span>
                  {n.nota && (
                    <span className="mt-1 text-[8.5px] uppercase leading-[1.25] tracking-[0.1em] text-white/30 md:text-[10px]">
                      {n.nota}
                    </span>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-center text-[11.5px] text-white/45 md:mt-7 md:text-[12.5px]">
          Te llevás el regalo del nivel más alto que alcances.
        </p>
      </div>
    </section>
  );
}
