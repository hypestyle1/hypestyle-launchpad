/**
 * Alta por WhatsApp para CYBER HYPE.
 *
 * **Hoy no hay enlace.** La constante está vacía a propósito: hasta que exista
 * un canal creado y probado, la landing no muestra ningún botón de unión. Un
 * botón que lleva a una invitación rota en la página de captación del evento
 * es peor que no tener el botón.
 *
 * Para encenderlo: crear el canal, probar la invitación desde un teléfono que
 * no sea el administrador, y cargar `NEXT_PUBLIC_CYBER_WHATSAPP_URL` en Vercel.
 * No hace falta tocar código ni volver a desplegar la rama.
 *
 * Es `NEXT_PUBLIC_` porque el enlace es público por definición: va en un href
 * que cualquiera ve. No hay nada que proteger.
 *
 * Canal y no grupo (comparación del 28/10): en un grupo los 1.024 miembros ven
 * el teléfono de todos los demás, y acá se trata de gente que entra desde una
 * pauta sin conocerse entre sí. Un canal no tiene tope de seguidores, nadie ve
 * el número de nadie y solo publican los administradores, que es exactamente lo
 * que se necesita para avisos.
 */

const CRUDO = (process.env.NEXT_PUBLIC_CYBER_WHATSAPP_URL || '').trim();

/**
 * Solo se acepta la forma real de una invitación de WhatsApp. Así un
 * placeholder, una URL a medio escribir o un "TODO" no llegan a renderizar un
 * botón que no lleva a ningún lado.
 *
 * **Canal** (lo que vamos a usar): `https://whatsapp.com/channel/<ID>`, donde
 * el ID es alfanumérico de ~22 caracteres — p. ej.
 * `0029VbALxHmL2ATrx7hqkh1I`. Se acepta también con `www.`, porque al copiar
 * el enlace desde WhatsApp Desktop puede venir con el prefijo, y con `/` o
 * `?` al final.
 *
 * **Grupo**: `https://chat.whatsapp.com/<código>`. Sigue aceptado por si algún
 * día se usa, pero el componente avisa que ahí el número queda a la vista.
 *
 * Lo que NO se acepta es el enlace a una PUBLICACIÓN del canal
 * (`.../channel/<ID>/123`): lleva a un posteo, no a seguir el canal. Si se
 * carga uno de esos no se dibuja el botón y queda el aviso en consola, que es
 * mejor que un botón que manda al lugar equivocado.
 */
const FORMA_VALIDA =
  /^https:\/\/(?:www\.)?whatsapp\.com\/channel\/[A-Za-z0-9_-]{10,}\/?(?:\?.*)?$|^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]{10,}\/?(?:\?.*)?$/;

export const CYBER_WHATSAPP_URL = FORMA_VALIDA.test(CRUDO) ? CRUDO : '';

if (CRUDO !== '' && CYBER_WHATSAPP_URL === '') {
  // Se carga una variable pero no tiene forma de invitación: hay que enterarse.
  console.warn(
    '[cyber] NEXT_PUBLIC_CYBER_WHATSAPP_URL no tiene forma de invitación de WhatsApp ' +
    '(esperado https://whatsapp.com/channel/<ID>). El botón no se muestra.',
  );
}

/** ¿Hay una invitación cargada y con forma de invitación? */
export function whatsappDisponible(): boolean {
  return CYBER_WHATSAPP_URL !== '';
}

/** `true` si la invitación es a un grupo, donde el número queda a la vista del resto. */
export function esGrupo(url = CYBER_WHATSAPP_URL): boolean {
  return url.startsWith('https://chat.whatsapp.com/');
}
