import Image from 'next/image';
import Link from 'next/link';

/* MYSTERY ARCHIVE — el bloque oscuro protagonista del takeover.

   Componente de SERVIDOR y presentacional: recibe las categorías por props
   desde el ensamblador (los datos viven en lib/cyber-cartelera.ts, módulo
   solo-servidor). Las portadas son los collages REALES del 28/10 — mockups de
   Woo, ninguna prenda inventada (_claude/propuestas/MYSTERY-PORTADAS, en
   mejora en otra sesión: se reemplazan sin tocar este layout).

   Los precios quedaron cerrados el 30/10 y cada tarjeta los muestra, con el
   CTA que lleva a la ficha: ahí se elige el talle. Mientras
   MYSTERY_PUBLICADO sea false la sección solo se monta FUERA de producción
   (lo decide el ensamblador), así que en producción no hay tarjeta ni link
   que puedan apuntar a un producto que todavía está en borrador en Woo. */

export interface MysteryCategoriaVista {
  id: string;
  nombre: string;
  detalle: string;
  pool: string;
  img: string;
  href: string;
  precio: number;
}

export default function CyberMysterySection({
  categorias,
}: {
  categorias: MysteryCategoriaVista[];
}) {
  return (
    <section id="mystery" className="bg-[#0a0a0a] px-4 py-8 text-white md:px-10 md:py-12">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3 md:mb-5">
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-white/45 md:text-[11px]">
              Abrimos el archivo
            </p>
            <h2 className="text-[26px] font-black uppercase leading-[0.95] tracking-[-0.01em] md:text-[36px]">
              Mystery Archive
            </h2>
          </div>
        </div>

        <p className="mb-5 max-w-[560px] text-[13px] leading-[1.5] text-white/60 md:text-[14px]">Elegí tu talle. El modelo lo elegimos nosotros.</p>

        <div className="grid grid-cols-3 gap-2 md:gap-4">
          {categorias.map((m) => (
            <article
              key={m.id}
              className="group relative overflow-hidden rounded-[10px] border border-white/12 bg-[#121212] md:rounded-[16px]"
            >
              <div className="relative aspect-square overflow-hidden">
                <Image
                  src={m.img}
                  alt={`${m.nombre} — prendas del archivo Hype`}
                  fill
                  sizes="(max-width: 768px) 32vw, 460px"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                />
                {/* Sin chip encima de la foto: las portadas V5 ya traen
                    impresos el nombre y los "N modelos en el pool", así que
                    un chip superpuesto repetía el dato y tapaba la
                    composición. El dato sigue disponible abajo, en texto. */}
              </div>
              <div className="flex flex-col gap-1 px-2 pb-3 pt-2 md:px-4 md:pb-4 md:pt-3">
                <p className="text-[10px] font-black uppercase leading-tight tracking-[0.01em] text-white md:text-[20px]">
                  {m.nombre}
                </p>
                <p className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40 md:block">
                  {m.pool}
                </p>
                <p className="hidden text-[12.5px] leading-[1.55] text-white/55 md:block">
                  {m.detalle}
                </p>
                {/* Mismo formato que `formatMoney` ("$ 32.900"): la tarjeta y
                    la ficha tienen que escribir el precio igual. Va en ARS fijo
                    como el resto del takeover (ver CyberRegalos); la ficha sí
                    responde al selector de moneda. */}
                <p className="mt-1 text-[13px] font-black tracking-[-0.01em] text-white md:text-[21px]">
                  $ {m.precio.toLocaleString('es-AR')}
                </p>
                <Link
                  href={m.href}
                  className="mt-1.5 inline-flex h-[32px] items-center justify-center rounded-full bg-white px-1 text-[9px] font-bold uppercase tracking-[0.02em] text-[#0a0a0a] transition-opacity hover:opacity-85 md:h-[44px] md:px-6 md:text-[11px] md:tracking-[0.12em]"
                >
                  Elegí tu talle
                </Link>
                <p className="mt-1 hidden text-[10px] leading-[1.5] text-white/35 md:block">
                  Cambio de talle sí · el contenido es sorpresa · 10 días de arrepentimiento según
                  ley.
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
