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

/* ─── Cookie firmada ──────────────────────────────────────────────────────
 *
 * El valor no puede ser `true`: cualquiera abre las devtools, escribe
 * `document.cookie` y entra sin la clave. Ahora es `<vence>.<firma>`, donde
 * la firma es un HMAC-SHA256 del vencimiento con la propia contraseña como
 * secreto. Sin conocerla no se puede fabricar una cookie válida, y como el
 * vencimiento va firmado tampoco se puede estirar.
 *
 * Va con Web Crypto y no con `node:crypto` porque el middleware corre en el
 * runtime edge, donde `node:crypto` no existe.
 *
 * Que el secreto sea la contraseña tiene un efecto buscado: si se cambia
 * `EARLY_ACCESS_PASSWORD`, todas las cookies emitidas dejan de valer.
 */
const codificar = new TextEncoder();

async function firmar(mensaje: string, secreto: string): Promise<string> {
  const clave = await crypto.subtle.importKey(
    'raw', codificar.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const firma = await crypto.subtle.sign('HMAC', clave, codificar.encode(mensaje));
  return Array.from(new Uint8Array(firma)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Valor a guardar en la cookie. `vence` es epoch en ms. */
export async function emitirCookie(vence: number, secreto: string): Promise<string> {
  return `${vence}.${await firmar(String(vence), secreto)}`;
}

/**
 * ¿La cookie es auténtica y sigue vigente? Comparación en tiempo constante
 * para no filtrar la firma byte a byte.
 */
export async function cookieValida(
  valor: string | undefined,
  secreto: string,
  ahora: number = Date.now(),
): Promise<boolean> {
  if (!valor || !secreto) return false;
  const corte = valor.lastIndexOf('.');
  if (corte < 1) return false;
  const vence = Number(valor.slice(0, corte));
  const firma = valor.slice(corte + 1);
  if (!Number.isFinite(vence) || vence <= ahora) return false;
  const esperada = await firmar(String(vence), secreto);
  if (firma.length !== esperada.length) return false;
  let dif = 0;
  for (let i = 0; i < firma.length; i++) dif |= firma.charCodeAt(i) ^ esperada.charCodeAt(i);
  return dif === 0;
}
