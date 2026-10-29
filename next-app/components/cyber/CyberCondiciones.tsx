import Link from 'next/link';

/* Condiciones del evento — discretas, cerca del final, sin competir con el
   catálogo.

   ── Qué cambió el 29/10 ─────────────────────────────────────────────────────
   Eran siete acordeones en una sola columna angosta: en desktop dejaban media
   pantalla vacía a la derecha y estiraban la página sin aportar. Ahora son
   **cuatro** —las que de verdad frenan una compra: ofertas, 4 PACK, envíos y
   cambios— en **dos columnas en desktop**, abiertas (no hay nada que esconder
   en cuatro respuestas de dos líneas) y en acordeón solo en mobile, donde el
   espacio sí es escaso.

   Lo legal no se oculta: los 10 días de arrepentimiento están en la respuesta
   de cambios, y el resto vive en /faqs y en las políticas, enlazadas abajo.

   Regla de contenido: SOLO condiciones vigentes y verificables. Nada de envío
   gratis ni porcentajes mientras no estén aprobados — una condición escrita
   en la página es una promesa. */

const CONDICIONES: { q: string; a: string }[] = [
  {
    q: '¿Cómo funcionan los precios del evento?',
    a: 'Todos los precios que ves son finales: lo que ves es lo que pagás, del 2 al 4 de noviembre. El descuento por transferencia aplica como siempre.',
  },
  {
    q: '¿Cómo es el 4 PACK de Regular Tees?',
    a: 'Sumás cuatro Regular al carrito —los colores y talles que quieras— y se cobran al precio del 3 PACK. El ajuste es automático: no hay código que cargar.',
  },
  {
    /* El plazo es **5 a 10 días hábiles**, no 4 a 7: es lo que dice hoy el
       resto del sitio —fichas de producto, confirmación de compra, mail de
       pedido y mail de despacho— y las fichas aclaran además que puede
       estirarse a 15 según zona y demanda. Poner 4 a 7 solo acá dejaría a la
       misma web prometiendo dos cosas distintas, y a la más corta donde menos
       se puede cumplir: durante el evento. Se sacó la frase sobre demoras del
       evento, que sembraba la duda sin dar un dato. */
    q: '¿Cuándo llega mi pedido?',
    a: 'Entre 5 y 10 días hábiles desde que se acredita el pago. Lo despachamos por Andreani y te mandamos el seguimiento por mail para que sepas dónde está.',
  },
  {
    /* ⚠️ PENDIENTE DE APROBACIÓN COMERCIAL Y LEGAL.
       La política oficial (/politicas-de-devolucion) dice hoy que "los
       productos adquiridos en SALE, OUTLET o con descuentos especiales no
       tienen cambio ni devolución". Todo CYBER HYPE son precios de evento, así
       que esta respuesta y esa cláusula no pueden convivir: o se exceptúa al
       evento en la política, o esta FAQ no puede prometer el cambio.
       Mientras tanto queda escrita la versión que Valentín quiere comunicar,
       sin publicar (la rama no está mergeada). */
    q: '¿Puedo cambiar el talle?',
    a: 'Sí. Si no te quedó bien, pedís el cambio dentro de los 30 días corridos desde la compra: la prenda tiene que estar sin uso y con sus etiquetas. El cambio queda sujeto a disponibilidad de talle.',
  },
];

export default function CyberCondiciones() {
  return (
    <section className="bg-[#0a0a0a] px-4 pb-14 pt-6 text-white md:px-10 md:pb-16">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 className="text-[16px] font-black uppercase tracking-[0.02em] md:text-[18px]">
            Antes de comprar
          </h2>
          <Link
            href="/faqs"
            className="text-[12px] text-white/45 underline underline-offset-4 transition-colors hover:text-white/80"
          >
            Todas las preguntas
          </Link>
        </div>

        {/* Mobile: acordeón (el espacio es escaso). Desktop: dos columnas
            abiertas — cuatro respuestas de dos líneas no necesitan esconderse
            y así nadie tiene que hacer clic para leer una condición. */}
        <div className="mt-5 grid grid-cols-1 gap-x-10 gap-y-2 md:grid-cols-2 md:gap-y-6">
          {CONDICIONES.map((c) => (
            <div key={c.q}>
              <details className="group rounded-[10px] border border-white/10 bg-white/[0.03] md:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 text-[13px] font-semibold">
                  {c.q}
                  <span className="text-[17px] leading-none text-white/40 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="px-4 pb-3.5 text-[12.5px] leading-[1.6] text-white/55">{c.a}</p>
              </details>

              <div className="hidden md:block">
                <p className="text-[13.5px] font-semibold text-white">{c.q}</p>
                <p className="mt-1.5 max-w-[46ch] text-[13px] leading-[1.6] text-white/55">{c.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
