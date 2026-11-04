import Image from 'next/image';
import Link from 'next/link';
import CyberRevealCountdown from './CyberRevealCountdown';
import type { CyberDropPublico } from '@/lib/cyber-cartelera';

/* LOS DROPS — los lanzamientos del evento, con el camo como protagonista.

   Unificación 4/11 (pedido de Valentín): el camo aparecía dos veces — como
   tarjeta del Día 2 y como banner de preventa más abajo. Queda UNA sola
   pieza editorial, acá: un split a lo ancho con la composición original
   sobre beige, la info de preventa y el CTA. El Día 1 (ya comprable) pasa a
   una fila compacta debajo: salió, se compra, no necesita media pantalla.

   El CTA del camo lo gobierna PREVENTA_ZIP_CAMO (lib/cyber-cartelera):
   apagado, el botón dice "PRÓXIMAMENTE" y no es un link — nada de botones
   que lleven a páginas vacías; encendido (productos publicados + stock de
   preventa cargado), el mismo lugar pasa a "VER COLECCIÓN" con el href real.

   Sigue siendo un componente de SERVIDOR y presentacional: recibe la vista
   ya saneada (dropsPublicos). Un drop bloqueado llega SIN producto, así que
   el título y la foto no existen en el HTML hasta la revelación. */

function CamoHero({ d }: { d: CyberDropPublico }) {
  const p = d.producto!;
  return (
    <article className="grid grid-cols-1 overflow-hidden md:grid-cols-2 md:items-stretch">
      <div className="relative aspect-square overflow-hidden bg-[#e9e5dc] md:aspect-auto md:min-h-[560px]">
        <Image
          src={p.img}
          alt={p.nombre}
          fill
          sizes="(max-width: 768px) 100vw, 700px"
          className="object-cover"
        />
        <span className="cyber-glass-light absolute left-3 top-3 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a] md:left-4 md:top-4 md:text-[10px]">
          {d.dia} · {d.fecha}
        </span>
      </div>

      <div className="flex flex-col justify-center bg-[#e9e5dc] px-5 py-7 text-[#0a0a0a] md:px-12 md:py-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#0a0a0a]/50 md:text-[11px]">
          Preventa · unidades limitadas
        </p>
        <h3 className="mt-2 text-[32px] font-black uppercase leading-[0.9] tracking-[-0.01em] md:text-[48px]">
          {p.nombre}
        </h3>
        <p className="mt-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0a0a0a]/70 md:text-[14px]">
          Olive · Brown
        </p>
        <p className="mt-3 max-w-[46ch] text-[13px] leading-[1.5] text-[#0a0a0a]/65 md:text-[14.5px]">
          {p.claim} Son unidades de preventa: se reservan y se entregan cuando llegan. Entrega
          estimada: viernes 13/11.
        </p>
        {p.href ? (
          <Link
            href={p.href}
            className="mt-5 inline-flex h-[48px] w-full items-center justify-center rounded-full bg-[#0a0a0a] px-8 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-85 md:mt-7 md:w-auto md:self-start md:px-10"
          >
            Ver colección
          </Link>
        ) : (
          /* Sin link a propósito: la colección todavía no está publicada y un
             botón hacia una página vacía es peor que la espera. Se activa
             solo desde PREVENTA_ZIP_CAMO. */
          <span
            aria-disabled="true"
            className="mt-5 inline-flex h-[48px] w-full cursor-default select-none items-center justify-center rounded-full border border-[#0a0a0a]/25 px-8 text-[12px] font-bold uppercase tracking-[0.14em] text-[#0a0a0a]/50 md:mt-7 md:w-auto md:self-start md:px-10"
          >
            Próximamente
          </span>
        )}
      </div>
    </article>
  );
}

export default function CyberDrops({ drops }: { drops: CyberDropPublico[] }) {
  const esPreventa = (d: CyberDropPublico) => d.estado === 'revelado' && !!d.producto?.preventa;
  const hero = drops.find(esPreventa);
  const resto = drops.filter((d) => !esPreventa(d));

  return (
    <section id="drops" className="bg-[#0a0a0a] px-4 py-10 text-white md:px-10 md:py-14">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 md:mb-7">
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-white/45 md:text-[11px]">
              Lanzamientos del evento
            </p>
            <h2 className="text-[26px] font-black uppercase leading-[0.95] tracking-[-0.01em] md:text-[36px]">
              Los drops
            </h2>
          </div>
          <p className="max-w-[360px] text-[12px] leading-[1.5] text-white/50 md:text-[13px]">
            Lo que salió durante el evento queda disponible hasta el cierre.
          </p>
        </div>

        {hero && <CamoHero d={hero} />}

        {/* Lo ya lanzado (o por revelar), en filas compactas: no compite con
            el protagonista de arriba. */}
        <div className="mt-4 flex flex-col gap-3 md:mt-5">
          {resto.map((d) => (
            <article
              key={d.id}
              className="flex items-center gap-4 border border-white/12 bg-[#121212] p-3 md:gap-6 md:p-4"
            >
              <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden bg-[#1a1a1a] md:h-[120px] md:w-[120px]">
                {d.estado === 'revelado' && d.producto ? (
                  <Image
                    src={d.producto.img}
                    alt={d.producto.nombre}
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="select-none text-[32px] font-black text-white/25">?</span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  {d.dia} · {d.fecha}
                </p>
                {d.estado === 'revelado' && d.producto ? (
                  <>
                    <p className="mt-0.5 truncate text-[15px] font-black uppercase tracking-[0.02em] text-white md:text-[17px]">
                      {d.producto.nombre}
                    </p>
                    <p className="mt-0.5 hidden text-[12px] leading-[1.4] text-white/50 md:block">
                      {d.producto.claim}
                    </p>
                  </>
                ) : (
                  <p className="mt-0.5 text-[15px] font-black uppercase tracking-[0.02em] text-white/45">
                    Por revelar · <CyberRevealCountdown targetIso={d.revealAt} />
                  </p>
                )}
              </div>
              {d.estado === 'revelado' && d.producto?.href && (
                <Link
                  href={d.producto.href}
                  className="inline-flex h-[40px] shrink-0 items-center justify-center rounded-full bg-white px-5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#0a0a0a] transition-opacity hover:opacity-85 md:h-[44px] md:px-6 md:text-[11px]"
                >
                  Ver el drop
                </Link>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
