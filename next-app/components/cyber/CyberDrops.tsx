import Image from 'next/image';
import Link from 'next/link';
import type { CyberDropPublico } from '@/lib/cyber-cartelera';

/* 3 DÍAS · 3 DROPS — la cartelera del evento (concepto confirmado el 29/10).

   Componente de SERVIDOR y presentacional: recibe la vista ya saneada
   (dropsPublicos) — un drop bloqueado llega SIN producto, así que el título y
   la foto no existen en el HTML ni en ningún bundle hasta la revelación.

   Estados por tarjeta:
   - bloqueado → número grande, el día, "?" y la hora de revelación. Nada más.
   - revelado  → la foto real del producto, nombre, claim y CTA de compra. */

export default function CyberDrops({ drops }: { drops: CyberDropPublico[] }) {
  return (
    <section id="drops" className="bg-[#0a0a0a] px-4 py-12 text-white md:px-10 md:py-16">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 md:mb-8">
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-white/45 md:text-[11px]">
              Un lanzamiento por día
            </p>
            <h2 className="text-[26px] font-black uppercase leading-[0.95] tracking-[-0.01em] md:text-[36px]">
              3 días · 3 drops
            </h2>
          </div>
          <p className="max-w-[360px] text-[12px] leading-[1.5] text-white/50 md:text-[13px]">
            Cada día del evento se revela un drop a las 11:00. Lo que ya salió queda disponible
            hasta el cierre.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
          {drops.map((d) => (
            <article
              key={d.id}
              className="group relative overflow-hidden rounded-[16px] border border-white/12 bg-[#121212]"
            >
              {/* Imagen o incógnita */}
              <div className="relative aspect-[4/3] overflow-hidden">
                {d.estado === 'revelado' && d.producto ? (
                  <>
                    <Image
                      src={d.producto.img}
                      alt={d.producto.nombre}
                      fill
                      sizes="(max-width: 768px) 92vw, 440px"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent" />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#161616]">
                    <span className="select-none text-[72px] font-black text-white/15">?</span>
                  </div>
                )}
                <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/55 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-[16px]">
                  {d.dia} · {d.fecha}
                </span>
              </div>

              {/* Texto */}
              <div className="flex flex-col gap-1 px-4 pb-4 pt-3">
                <span className="text-[12px] font-semibold tabular-nums tracking-[0.1em] text-white/35">
                  {d.id}
                </span>
                {d.estado === 'revelado' && d.producto ? (
                  <>
                    <p className="text-[16px] font-black uppercase tracking-[0.02em] text-white">
                      {d.producto.nombre}
                    </p>
                    <p className="text-[12px] leading-[1.5] text-white/55">{d.producto.claim}</p>
                    <Link
                      href={d.producto.href}
                      className="mt-2.5 inline-flex h-[44px] items-center justify-center rounded-full bg-white px-6 text-[11px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a] transition-opacity hover:opacity-85"
                    >
                      Ver el drop
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-[16px] font-black uppercase tracking-[0.02em] text-white/45">
                      Por revelar
                    </p>
                    <p className="text-[12px] leading-[1.5] text-white/40">
                      Se revela el {d.fecha} a las 11:00.
                    </p>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
