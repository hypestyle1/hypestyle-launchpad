/* La escalera de regalos por compra.

   ── Por qué SÍ se publican estos montos ─────────────────────────────────────
   Es la única parte de la página que lleva cifras, y no es una excepción a la
   regla: no son precios ni porcentajes, son **umbrales de una mecánica que ya
   está viva en producción**. Verificado el 29/10 contra
   `POST /api/gift-progress` del sitio publicado: `active: true`, modo
   `highest`, niveles $100.000 Hype Chain · $140.000 Hype Socks · $300.000
   Zippo. No es una promesa nueva del evento: es lo que el carrito ya hace hoy,
   y 33 de los 44 pedidos de ≥$100.000 de los últimos 60 días recibieron su
   regalo.

   Mostrarla es además la palanca de ticket con mejor relación costo/efecto que
   tiene la marca: el 80% de los pedidos no llega a $100.000, así que el primer
   escalón está a un accesorio de distancia para mucha gente que hoy no sabe
   que existe.

   ── Lo que el copy NO puede decir ───────────────────────────────────────────
   El modo es `highest`: se lleva **un** regalo, el del nivel más alto que se
   alcanza. No se acumulan. Decir "sumá los tres" sería mentir.

   Si la escalera se apagara o cambiaran los umbrales, este bloque queda
   desactualizado: los números están acá a mano a propósito (el componente es
   de servidor y no pega contra la API en cada render), así que al tocar el
   plugin hay que tocar esto. El test de la campaña lo recuerda. */

/**
 * `limitado` marca el nivel cuyo regalo tiene stock corto y por lo tanto no se
 * puede prometer sin reserva: al 29/10 quedan **5 Zippos** (contra 30 Hype
 * Chain). Un umbral de $300.000 que no se puede cumplir es la promesa más cara
 * de la página, así que ese nivel sale con "hasta agotar stock" a la vista. Si
 * se repone, se saca la marca; si se agota, se saca el nivel.
 */
const NIVELES = [
  { monto: '$100.000', regalo: 'Hype Chain', limitado: false },
  { monto: '$140.000', regalo: 'Hype Socks', limitado: false },
  { monto: '$300.000', regalo: 'Zippo Hype', limitado: true },
];

export default function CyberRegalos() {
  return (
    <section className="bg-[#0a0a0a] px-4 pt-10 text-white md:px-10 md:pt-12">
      <div className="mx-auto max-w-[1400px] rounded-[16px] border border-white/12 bg-white/[0.04] px-5 py-6 md:px-8 md:py-7">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-white md:text-[13px]">
            Regalo por compra
          </p>
          <p className="text-[11.5px] text-white/45 md:text-[12px]">
            Se suma solo al llegar al monto. Te llevás el regalo del nivel más alto que alcances.
          </p>
        </div>

        <ol className="mt-4 grid grid-cols-3 gap-2.5 md:gap-3">
          {NIVELES.map((n, i) => (
            <li
              key={n.monto}
              className="rounded-[10px] border border-white/10 bg-white/[0.03] px-3 py-3 md:px-4 md:py-3.5"
            >
              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                Desde
              </span>
              <span className="mt-0.5 block text-[15px] font-black tabular-nums text-white md:text-[19px]">
                {n.monto}
              </span>
              <span className="mt-1 block text-[11px] leading-[1.35] text-white/55 md:text-[12.5px]">
                {n.regalo}
              </span>
              {n.limitado && (
                <span className="mt-1 block text-[10px] leading-[1.35] text-white/35">
                  Hasta agotar stock
                </span>
              )}
              <span className="sr-only">Nivel {i + 1}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
