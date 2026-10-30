import Image from 'next/image';
import Link from 'next/link';

/* MYSTERY ARCHIVE — el bloque oscuro protagonista del takeover.

   Componente de SERVIDOR y presentacional: recibe las categorías por props
   desde el ensamblador (los datos viven en lib/cyber-cartelera.ts, módulo
   solo-servidor). Las portadas son los collages REALES del 28/10 — mockups de
   Woo, ninguna prenda inventada (_claude/propuestas/MYSTERY-PORTADAS, en
   mejora en otra sesión: se reemplazan sin tocar este layout).

   Mientras MYSTERY_PUBLICADO sea false, esta sección solo se monta FUERA de
   producción (lo decide el ensamblador) y cada tarjeta dice "Precio en
   validación": espacio diseñado, no promesa activa. Al aprobar pool + precio
   y existir los productos en Woo, `href` apunta a la ficha real y el CTA se
   habilita — la ficha es donde se elige el talle. */

export interface MysteryCategoriaVista {
  id: string;
  nombre: string;
  detalle: string;
  pool: string;
  img: string;
  href: string | null;
}

export default function CyberMysterySection({
  categorias,
  publicado,
}: {
  categorias: MysteryCategoriaVista[];
  publicado: boolean;
}) {
  return (
    <section id="mystery" className="bg-[#0a0a0a] px-4 py-12 text-white md:px-10 md:py-16">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 md:mb-8">
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-white/45 md:text-[11px]">
              Abrimos el archivo
            </p>
            <h2 className="text-[26px] font-black uppercase leading-[0.95] tracking-[-0.01em] md:text-[36px]">
              Mystery Archive
            </h2>
          </div>
          {!publicado && (
            <span className="inline-flex items-center rounded-[6px] border border-white/25 bg-white/[0.06] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/70">
              Selección y precios en validación
            </span>
          )}
        </div>

        <p className="mb-7 max-w-[560px] text-[13px] leading-[1.55] text-white/60 md:text-[14px]">
          Elegís la categoría y tu talle. El modelo es sorpresa, dentro del conjunto de prendas
          del archivo que ves en cada portada. Siempre más valor del que pagás.
        </p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
          {categorias.map((m) => (
            <article
              key={m.id}
              className="group relative overflow-hidden rounded-[16px] border border-white/12 bg-[#121212]"
            >
              <div className="relative aspect-square overflow-hidden">
                <Image
                  src={m.img}
                  alt={`${m.nombre} — prendas del archivo Hype`}
                  fill
                  sizes="(max-width: 768px) 92vw, 460px"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                />
                {/* Sin chip encima de la foto: las portadas V5 ya traen
                    impresos el nombre y los "N modelos en el pool", así que
                    un chip superpuesto repetía el dato y tapaba la
                    composición. El dato sigue disponible abajo, en texto. */}
              </div>
              <div className="flex flex-col gap-1 px-4 pb-4 pt-3">
                <p className="text-[18px] font-black uppercase tracking-[0.02em] text-white md:text-[20px]">
                  {m.nombre}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                  {m.pool}
                </p>
                <p className="text-[12.5px] leading-[1.55] text-white/55 md:text-[13px]">
                  {m.detalle}
                </p>
                {publicado && m.href ? (
                  <Link
                    href={m.href}
                    className="mt-2.5 inline-flex h-[44px] items-center justify-center rounded-full bg-white px-6 text-[11px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a] transition-opacity hover:opacity-85"
                  >
                    Elegí tu talle
                  </Link>
                ) : (
                  <span className="mt-2.5 inline-flex h-[44px] items-center justify-center rounded-full border border-white/20 px-6 text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">
                    Precio en validación
                  </span>
                )}
                <p className="mt-1 text-[10px] leading-[1.5] text-white/35">
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
