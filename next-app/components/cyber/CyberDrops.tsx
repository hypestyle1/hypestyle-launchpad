import Image from 'next/image';
import Link from 'next/link';
import CyberRevealCountdown from './CyberRevealCountdown';
import type { CyberDropPublico } from '@/lib/cyber-cartelera';

/* 3 DÍAS · 3 DROPS — la cartelera del evento (concepto confirmado el 29/10).

   Componente de SERVIDOR y presentacional: recibe la vista ya saneada
   (dropsPublicos) — un drop bloqueado llega SIN producto, así que el título y
   la foto no existen en el HTML ni en ningún bundle hasta la revelación.

   Estados por tarjeta:
   - bloqueado → fondo oscuro desenfocado, "?" y la cuenta regresiva. Nada
                 más: ni foto, ni nombre, ni pista del producto. La portada de
                 un drop sin revelar tampoco se sube a public/.
   - revelado  → la foto real del producto, nombre, claim y CTA de compra.

   Las portadas se exportan 1:1 (1080×1080), así que el marco de la foto es
   cuadrado: recortarlas a 4/3 comía las prendas de arriba y abajo. */

export default function CyberDrops({ drops }: { drops: CyberDropPublico[] }) {
  return (
    /* Marco propio: arriba está Mystery y abajo el editorial, las dos en el
       mismo negro, así que los drops se fundían con sus vecinas y la sección
       no se leía como una unidad. El contenedor —fondo un punto más claro,
       radio grande y un filete al 10%— la recorta del fondo sin cambiar de
       color ni romper la identidad monocroma. */
    <section id="drops" className="bg-[#0a0a0a] px-4 py-8 text-white md:px-10 md:py-10">
      <div
        className="cyber-fondo mx-auto max-w-[1400px] overflow-hidden rounded-[20px] border border-white/20 bg-[#161616] px-4 py-10 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_60px_rgba(0,0,0,0.5)] md:px-9 md:py-12"
        style={{ ['--cyber-glitch-bg' as string]: '#161616' }}
      >
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
            {/* Sin hora escrita: el horario de cada revelación no está
                confirmado y la cuenta regresiva de cada tarjeta ya lo dice. */}
            Cada día del evento se revela un lanzamiento nuevo. Lo que ya salió queda disponible
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
              <div className="relative aspect-square overflow-hidden">
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
                  /* Fondo oscuro DESENFOCADO: dos manchas suaves sobre el
                     negro, borroneadas. No es una foto velada —no hay ninguna
                     imagen del producto en el HTML— pero deja de ser un panel
                     plano y se lee como algo que todavía no enfoca. */
                  <div className="absolute inset-0 overflow-hidden bg-[#0e0e0e]">
                    {d.velada ? (
                      /* La portada velada: el archivo YA viene desenfocado
                         (1080 px, blur suave, 12 KB — los cuatro productos). Se leen siluetas, colores
                         y composición; las estampas no. Sin blur de CSS a
                         propósito: con CSS el navegador descarga la foto entera
                         y se ve abriendo la URL. */
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
                    {/* Con portada velada el velo es un degradado suave —la foto
                        tiene que seguir siendo linda— que sólo cierra contra el
                        pie de la tarjeta. Sin portada (drop 03) va el velo
                        parejo de siempre. */}
                    {/* Con portada velada el velo es solo el cierre contra el
                        pie de la tarjeta: la foto es clara y tiene que seguir
                        siéndolo. Sin portada (drop 03) va el velo parejo. */}
                    <div
                      className={
                        d.velada
                          ? 'absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent'
                          : 'absolute inset-0 bg-black/35'
                      }
                    />
                    {/* El "?" y el reloj, juntos y sobre la imagen. El reloj
                        estaba de pie de tarjeta, chico y al 40%: en una pieza
                        cuyo único trabajo es dar ganas de volver, es lo que
                        tiene que leerse. */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <span
                        className={
                          d.velada
                            ? 'select-none text-[86px] font-black leading-none text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.35)]'
                            : 'select-none text-[72px] font-black leading-none text-white/30 [text-shadow:0_2px_26px_rgba(0,0,0,0.75)]'
                        }
                      >
                        ?
                      </span>
                      <p
                        className={
                          d.velada
                            ? 'text-[15px] font-bold tabular-nums tracking-[0.04em] text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.5)] md:text-[16px]'
                            : 'text-[15px] font-bold tabular-nums tracking-[0.04em] text-white/70 [text-shadow:0_2px_20px_rgba(0,0,0,0.7)] md:text-[16px]'
                        }
                      >
                        <CyberRevealCountdown targetIso={d.revealAt} />
                      </p>
                    </div>
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
                    {/* Sin segunda línea: el reloj se mudó arriba, sobre la
                        imagen, y el día ya está en el chip de la foto. Repetir
                        cualquiera de los dos acá era ruido. La hora sigue
                        siendo lo único que se publica de un drop sin revelar:
                        el contenido no viaja al navegador hasta que pasa. */}
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
