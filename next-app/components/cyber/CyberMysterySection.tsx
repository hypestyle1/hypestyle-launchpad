import Image from 'next/image';
import Link from 'next/link';
import type { CyberMysteryCategoria } from '@/lib/cyber-cartelera';

/* MYSTERY ARCHIVE — tres PRODUCTOS, no un bloque promocional.

   Rediseño 3/11 (pedido de Valentín): se elimina la sección negra con cards
   explicativas y las tres cajas pasan a leerse como lo que son — productos
   reales con miniatura, nombre y precio — en la misma página blanca del
   catálogo que las precede. La mecánica completa (pool, legales, talles) vive
   en la ficha, que es donde se decide la compra; acá solo hace falta que se
   entiendan como tres compras posibles más.

   La miniatura es la portada OFICIAL de la ficha (public/mystery/portadas/
   *-a.webp): fondo claro, el pool a la vista y la caja con el signo de
   pregunta. Toda la card es un link; el único adorno es un chip de vidrio
   sutil con la palabra que explica el producto en un golpe: SORPRESA. */

export type MysteryCategoriaVista = Pick<
  CyberMysteryCategoria,
  'id' | 'nombre' | 'detalle' | 'pool' | 'img' | 'href' | 'precio'
>;

export default function CyberMysterySection({
  categorias,
}: {
  categorias: MysteryCategoriaVista[];
}) {
  return (
    <section id="mystery" className="bg-background px-4 pb-10 pt-2 text-foreground md:px-10 md:pb-14 md:pt-4">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2 md:mb-6">
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-text-light md:text-[11px]">
              Abrimos el archivo
            </p>
            <h2 className="text-[26px] font-black uppercase leading-[0.95] tracking-[-0.01em] md:text-[36px]">
              Mystery Archive
            </h2>
          </div>
          <p className="text-[12px] text-text-light md:text-[13px]">
            Elegí tu talle. El modelo lo elegimos nosotros.
          </p>
        </div>

        <ul className="grid grid-cols-3 gap-2 md:gap-4">
          {categorias.map((m) => (
            <li key={m.id}>
              <Link href={m.href} className="group block">
                <div className="relative aspect-square overflow-hidden bg-[#f4f4f2]">
                  <Image
                    src={m.img}
                    alt={`${m.nombre} — prendas del archivo Hype`}
                    fill
                    sizes="(max-width: 768px) 32vw, 460px"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                  <span className="cyber-glass-light absolute left-1.5 top-1.5 px-1.5 py-[3px] text-[8px] font-bold uppercase tracking-[0.14em] text-foreground md:left-3 md:top-3 md:px-2.5 md:py-1 md:text-[10px]">
                    Sorpresa
                  </span>
                </div>
                <p className="mt-2 text-[11px] font-bold uppercase leading-tight tracking-[0.02em] md:mt-3 md:text-[14px]">
                  {m.nombre}
                </p>
                {/* Mismo formato que formatMoney ("$ 25.900"): la card y la
                    ficha tienen que escribir el precio igual. */}
                <p className="mt-0.5 text-[13px] font-black tracking-[-0.01em] md:text-[16px]">
                  $ {m.precio.toLocaleString('es-AR')}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
