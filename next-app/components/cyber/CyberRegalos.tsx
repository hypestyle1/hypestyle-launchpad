'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import { useProducts } from '@/hooks/useProducts';

/* REGALO POR COMPRA — tres niveles, leídos en dos segundos.

   ── Estructura ──────────────────────────────────────────────────────────────
   Una card por nivel, siempre igual: foto arriba, datos abajo. Sin marco
   exterior envolviendo la sección — lo que separa es el aire y la grilla, no
   una caja. La versión anterior tenía un contenedor con borde que hacía ver
   el bloque pesado y "encuadrado de más".

   ── Mobile: stack vertical, no carrusel ni grilla de tres ───────────────────
   Se probaron las tres opciones. El carrusel mostraba una tarjeta y media
   cortada con la barra de scroll a la vista. La grilla de tres columnas sí
   entraba entera, pero a 390 px cada card quedaba en 96 px de ancho: la foto
   del producto se volvía una miniatura y el monto —que es el dato que hace
   funcionar la escalera— quedaba apretado. El stack vertical gana porque las
   fotos se lucen y los montos se leen de corrido; el costo es un poco de
   scroll, y con la foto en 16:10 (no cuadrada) cada card mide poco más de
   200 px, así que los tres niveles entran en pantalla y media.

   ── Los montos ──────────────────────────────────────────────────────────────
   No son precios ni porcentajes: son umbrales de una mecánica ya viva,
   verificada contra `POST /api/gift-progress` del sitio publicado
   (`active: true`, modo `highest`). Ese modo es el motivo de que la
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
    <section id="regalos" className="bg-[#0a0a0a] px-4 py-14 text-white md:px-10 md:py-20">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-7 md:mb-10">
          <h2 className="text-[24px] font-black uppercase leading-[0.95] tracking-[-0.01em] md:text-[32px]">
            Regalo por compra
          </h2>
          <p className="mt-2 text-[13.5px] text-white/50 md:text-[15px]">
            Cuanto más sumás, mejor es tu regalo.
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          {niveles.map((n) => (
            <li key={n.monto}>
              <article className="group h-full overflow-hidden rounded-[14px] bg-white/[0.04] transition-colors hover:bg-white/[0.07]">
                {/* La foto, en su bloque blanco: los packshots ya vienen
                    recortados sobre blanco, así se funden en vez de dejar un
                    recuadro flotando. En mobile va apaisada (16:10) para que
                    la card no ocupe una pantalla entera; en desktop, cuadrada,
                    que es donde el producto se luce. */}
                <div className="relative aspect-[16/10] bg-white md:aspect-square">
                  {n.src && (
                    <Image
                      src={n.src}
                      alt={n.nombre}
                      fill
                      sizes="(max-width: 768px) 100vw, 360px"
                      className="object-contain p-5 transition-transform duration-500 group-hover:scale-[1.03] md:p-8"
                    />
                  )}
                </div>

                <div className="px-5 py-5 md:px-6 md:py-6">
                  <span className="block text-[9.5px] font-semibold uppercase tracking-[0.26em] text-white/35 md:text-[10px]">
                    Desde
                  </span>
                  <span className="mt-1 block text-[28px] font-black leading-none tabular-nums text-white md:text-[32px]">
                    {n.monto}
                  </span>
                  <span className="mt-2 block text-[13px] font-bold uppercase tracking-[0.06em] text-white/85 md:text-[14px]">
                    {n.nombre}
                  </span>
                  {n.nota && (
                    <span className="mt-1.5 block text-[10px] uppercase tracking-[0.14em] text-white/30">
                      {n.nota}
                    </span>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-[12px] text-white/40 md:mt-8 md:text-[13px]">
          Te llevás el regalo del nivel más alto que alcances.
        </p>
      </div>
    </section>
  );
}
