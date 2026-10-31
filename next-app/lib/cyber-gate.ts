/**
 * CYBER HYPE — las tres horas del gate, en un solo lugar.
 *
 * Las usan el middleware (que decide si bloquea) y /acceso (que decide qué
 * mostrar). Si vivieran en dos archivos, mover la apertura una hora obligaría
 * a acordarse de los dos y la pantalla terminaría contando hacia una hora
 * distinta de la que abre la tienda.
 *
 *   00:00  LOCK_START   se cierra la tienda pública
 *   19:00  EARLY_START  se comparte la contraseña (Mejores Amigos / WhatsApp)
 *   20:00  PUBLIC_OPEN  apertura para todos, sin contraseña
 *
 * Hora de Argentina (-03:00) explícita en cada fecha: el server corre en UTC.
 */
export const LOCK_START = new Date('2026-11-01T00:00:00-03:00').getTime();
export const EARLY_START = new Date('2026-11-01T19:00:00-03:00').getTime();
export const PUBLIC_OPEN = new Date('2026-11-01T20:00:00-03:00').getTime();

/**
 * Cookie del evento. NO se reusa `hype_early_access`: quien pasó el gate de
 * junio todavía la tiene y se saltearía el bloqueo del Cyber sin contraseña.
 */
export const COOKIE_CYBER = 'hype_cyber_access';

/** ¿La tienda está cerrada en este instante? */
export function cyberBloqueado(ahora: number = Date.now()): boolean {
  return ahora >= LOCK_START && ahora < PUBLIC_OPEN;
}
