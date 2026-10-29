/* Condiciones del evento — lo que alguien se pregunta antes de pagar.

   Está al final a propósito: no compite con el producto, pero evita la
   consulta por WhatsApp que frena una compra de noche, cuando no hay nadie
   para responder.

   Regla de contenido: acá SOLO van condiciones vigentes y verificables. Nada
   de envío gratis, regalos ni porcentajes mientras no estén aprobados — una
   condición escrita en la página es una promesa, y es el lugar donde más caro
   sale prometer de más. Lo que todavía no está definido sencillamente no se
   menciona. */

const CONDICIONES: { q: string; a: string }[] = [
  {
    q: '¿Cuándo empieza y cuándo termina?',
    a: 'El evento va del 2 al 4 de noviembre y cierra el miércoles 4 a las 23:59. Lo que se agota antes, se agota: el stock es el que hay.',
  },
  {
    q: '¿Cómo funcionan los precios?',
    a: 'Todos los precios que ves son finales: lo que ves es lo que pagás. No publicamos porcentajes sobre precios anteriores.',
  },
  {
    q: '¿Cómo es el 4 PACK de Regular Tees?',
    a: 'Sumás cuatro Regular al carrito —los colores y talles que quieras, repetidos o distintos— y se cobran al precio del 3 PACK. El ajuste es automático: no hay código que cargar.',
  },
  {
    q: '¿Los drops quedan disponibles?',
    a: 'Sí. Cada día se revela un lanzamiento nuevo y lo que ya salió queda disponible hasta el cierre del evento, mientras haya stock.',
  },
  {
    q: '¿Puedo pagar por transferencia?',
    a: 'Sí, y el descuento por transferencia aplica también durante el evento, como siempre.',
  },
  {
    q: '¿Cómo son los envíos?',
    a: 'Despachamos por orden de compra, con seguimiento de Andreani por mail. En días de evento el despacho puede demorar un poco más de lo habitual.',
  },
  {
    q: '¿Puedo cambiar o devolver?',
    a: 'Sí: cambios y devoluciones como siempre, y tenés 10 días de arrepentimiento desde que recibís el pedido, según la ley 24.240.',
  },
];

export default function CyberCondiciones() {
  return (
    <section className="bg-[#0a0a0a] px-4 pb-12 pt-4 text-white md:px-10 md:pb-16">
      <div className="mx-auto max-w-[1400px]">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-white/45 md:text-[11px]">
          Comprá tranquilo
        </p>
        <h2 className="mb-6 text-[22px] font-black uppercase leading-[0.95] tracking-[-0.01em] md:text-[28px]">
          Cómo funciona el evento
        </h2>

        <div className="grid max-w-[900px] grid-cols-1 gap-2">
          {CONDICIONES.map((c) => (
            <details
              key={c.q}
              className="group rounded-[12px] border border-white/12 bg-white/[0.03] transition-colors open:bg-white/[0.06]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[13px] font-semibold text-white md:text-[14px]">
                {c.q}
                <span className="text-[18px] leading-none text-white/40 transition-transform duration-200 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="px-5 pb-4 text-[13px] leading-[1.6] text-white/55">{c.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
