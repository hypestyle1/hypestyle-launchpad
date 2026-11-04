import Image from 'next/image';
import Link from 'next/link';
import CyberRevealCountdown from './CyberRevealCountdown';
import type { CyberDropPublico } from '@/lib/cyber-cartelera';

/* LOS DROPS — los lanzamientos del evento.

   Rediseño 3/11: la sección deja de prometer "3 días · 3 drops" (el Día 3 se
   eliminó: no hay tercer lanzamiento confirmado) y deja de vivir dentro de una
   caja con borde, sombra y textura — era el bloque más pesado de la página y
   el marco no agregaba nada que las fotos no hagan solas. Queda el negro
   pelado, dos piezas grandes y la tipografía.

   Sigue siendo un componente de SERVIDOR y presentacional: recibe la vista ya
   saneada (dropsPublicos). Un drop bloqueado llega SIN producto, así que el
   título y la foto no existen en el HTML hasta la revelación.

   Preventa: un drop puede revelarse sin compra (href null) cuando las
   unidades son entrantes. La tarjeta lo dice con un chip de vidrio y la fecha
   estimada — nunca un CTA hacia una ficha sin stock. */

export default function CyberDrops({ drops }: { drops: CyberDropPublico[] }) {
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          {drops.map((d) => (
            <article key={d.id} className="group relative">
              {/* Imagen o incógnita */}
              <div className="relative aspect-square overflow-hidden bg-[#121212]">
                {d.estado === 'revelado' && d.producto ? (
                  <Image
                    src={d.producto.img}
                    alt={d.producto.nombre}
                    fill
                    sizes="(max-width: 768px) 100vw, 680px"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                ) : (
                  /* Bloqueado: manchas suaves sobre negro, el "?" y el reloj.
                     No hay ninguna imagen del producto en el HTML. */
                  <div className="absolute inset-0 overflow-hidden bg-[#0e0e0e]">
                    {d.velada ? (
                      <img
                        src={d.velada}
                        alt=""
                        aria-hidden
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        aria-hidden
                        className="absolute inset-[-25%] blur-[42px]"
                        style={{
                          background:
                            'radial-gradient(38% 46% at 32% 36%, rgba(255,255,255,0.14), transparent 70%), radial-gradient(44% 40% at 72% 68%, rgba(255,255,255,0.07), transparent 72%)',
                        }}
                      />
                    )}
                    <div className="absolute inset-0 bg-black/35" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <span className="select-none text-[72px] font-black leading-none text-white/30 [text-shadow:0_2px_26px_rgba(0,0,0,0.75)]">
                        ?
                      </span>
                      <p className="text-[15px] font-bold tabular-nums tracking-[0.04em] text-white/70 [text-shadow:0_2px_20px_rgba(0,0,0,0.7)] md:text-[16px]">
                        <CyberRevealCountdown targetIso={d.revealAt} />
                      </p>
                    </div>
                  </div>
                )}
                <span className="cyber-glass absolute left-3 top-3 inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-white">
                  {d.dia} · {d.fecha}
                </span>
                {d.estado === 'revelado' && d.producto?.preventa && (
                  <span className="cyber-glass-light absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#0a0a0a] md:text-[10px]">
                    {d.producto.preventa}
                  </span>
                )}
              </div>

              {/* Texto */}
              <div className="flex flex-col gap-1 pt-3 md:pt-4">
                {d.estado === 'revelado' && d.producto ? (
                  <>
                    <p className="text-[18px] font-black uppercase tracking-[0.02em] text-white md:text-[20px]">
                      {d.producto.nombre}
                    </p>
                    <p className="text-[12.5px] leading-[1.5] text-white/55 md:text-[13px]">
                      {d.producto.claim}
                    </p>
                    {d.producto.href ? (
                      <Link
                        href={d.producto.href}
                        className="mt-2.5 inline-flex h-[46px] w-full items-center justify-center rounded-full bg-white px-6 text-[11px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a] transition-opacity hover:opacity-85 md:w-auto md:self-start"
                      >
                        Ver el drop
                      </Link>
                    ) : (
                      /* Preventa sin compra todavía: se dice, no se promete. */
                      <p className="mt-1.5 text-[11.5px] leading-[1.45] text-white/40">
                        La compra se abre con la preventa. Unidades limitadas.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-[16px] font-black uppercase tracking-[0.02em] text-white/45">
                    Por revelar
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
