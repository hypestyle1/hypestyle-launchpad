/**
 * CYBER HYPE — el evento propio de Hype del 2 al 4 de noviembre de 2026.
 *
 * NO es Cyber Monday ni CACE: ni esos nombres ni esos logos aparecen en la
 * página. Es un evento de la marca.
 *
 * ESTE ARCHIVO ES LA FUENTE DE VERDAD DE LA LANDING /cyberhype (el nombre de la
 * ruta sigue siendo interno; el nombre público es CYBER HYPE).
 *
 * Qué NO hay acá, a propósito:
 *   - **ninguna cartelera de drops.** La mecánica de 6 drops acumulativos quedó
 *     sin efecto el 27/10: las ofertas están disponibles desde la apertura. Esta
 *     landing es de captación: fechas, registro y nada más.
 *   - **ningún monto, ningún porcentaje.** 89 de 145 productos tienen
 *     `sale_price` permanente sin fecha de fin, así que un porcentaje contra el
 *     "precio de lista" sería un precio de referencia que nunca se transó.
 *   - **ninguna promesa de acceso anticipado.** Todo lo comercial arranca el
 *     domingo 1/11 a las 20:00 ART, igual para todos (movida del lunes 00:00 el 28/10: prime time contra medianoche).
 *
 * Horario: todo se escribe con el offset -03:00 (America/Argentina/Buenos_Aires).
 * Argentina no tiene horario de verano, así que -03:00 es siempre el offset
 * correcto y el instante queda anclado sin depender de la TZ del server (Vercel
 * corre en UTC). El estado lo calcula el servidor; el browser solo dibuja el
 * tiempo que falta.
 */

/**
 * Arranque del evento y de TODO lo comercial.
 *
 * ── TIENE QUE COINCIDIR CON LAS OTRAS DOS RAMAS ──────────────────────────────
 * El mismo instante vive en tres lugares, uno por superficie:
 *   - landing  → CYBER_START (este archivo)
 *   - 4 PACK   → PACK_REGULAR_X4_DESDE (lib/promo-pack-regular.ts, ya en main)
 *   - home     → el banner de la previa (components/cyber/CyberHomeBanner.tsx),
 *                que lee CYBER_START de acá: no duplica la fecha
 * La apertura original (2/11 00:00) se verificó contra producción el 27/10 vía
 * `GET /api/pack-regular-status`; al moverla al 1/11 20:00 las dos constantes
 * cambiaron en el mismo commit, y el test de arriba lo exige. Si se separan,
 * la landing diría "abrió" mientras el carrito todavía cobra el precio viejo.
 * Al mover uno, mover los tres.
 * ──────────────────────────────────────────────────────────────────────────── */
export const CYBER_START = '2026-11-01T20:00:00-03:00';

/**
 * Cierre. Instante exclusivo: a las 00:00 del 5/11 ya terminó, que es lo mismo
 * que "hasta el 4/11 23:59" y deja los bordes limpios. Coincide con el `hasta`
 * de la ventana del 4 PACK en producción (2026-11-05T03:00:00.000Z).
 *
 * Una extensión al 5–7/11 es una decisión que todavía no está tomada: si se
 * aprueba, se mueve esta constante (y las otras dos superficies), no se agrega
 * una excepción.
 */
export const CYBER_END = '2026-11-05T00:00:00-03:00';

/** El único dato duro que la landing comunica en la previa. */
export const CYBER_FECHAS = '2, 3 y 4 de noviembre';

/** Hora de apertura, en texto, para el copy. */
export const CYBER_HORA_APERTURA = '20:00';

export type CyberEstado = 'previa' | 'evento' | 'cerrado';

/**
 * En qué momento del evento estamos. Lo resuelve el servidor en cada request.
 * `now` se inyecta en los tests; en producción es la hora del server (UTC), que
 * se compara contra instantes absolutos, así que el resultado es el mismo.
 */
export function cyberEstado(now: Date = new Date()): CyberEstado {
  // Solo para revisar en local: NEXT_PUBLIC_CYBER_FASE fuerza la fase
  // (previa|evento|cerrado) en el server y el cliente a la vez. En producción
  // se ignora SIEMPRE: la fase la deciden las fechas y nada más.
  if (process.env.NODE_ENV !== 'production') {
    const forzada = process.env.NEXT_PUBLIC_CYBER_FASE;
    if (forzada === 'previa' || forzada === 'evento' || forzada === 'cerrado') return forzada;
  }
  const t = now.getTime();
  if (t < new Date(CYBER_START).getTime()) return 'previa';
  if (t < new Date(CYBER_END).getTime()) return 'evento';
  return 'cerrado';
}

/**
 * Hacia dónde cuenta el reloj: a la apertura en la previa, al cierre durante el
 * evento, y a ningún lado cuando terminó.
 */
export function cyberProximoHito(now: Date = new Date()): { iso: string; label: string } | null {
  switch (cyberEstado(now)) {
    case 'previa':
      return { iso: CYBER_START, label: 'Abre en' };
    case 'evento':
      return { iso: CYBER_END, label: 'Cierra en' };
    default:
      return null;
  }
}

/**
 * ¿La captación de emails está abierta? Solo en la previa: una vez que abrió,
 * el aviso ya no tiene sentido y el formulario se reemplaza por el acceso a la
 * tienda. Así nadie deja el mail esperando un aviso que ya pasó.
 */
export function cyberCapturaAbierta(now: Date = new Date()): boolean {
  return cyberEstado(now) === 'previa';
}
