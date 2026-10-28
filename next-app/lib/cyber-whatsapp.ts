/**
 * Alta por WhatsApp para CYBER HYPE.
 *
 * **Hoy no hay enlace.** Hasta que exista un canal creado y probado, la landing
 * no muestra ningún botón de unión: uno que lleva a una invitación rota, en la
 * página de captación del evento, es peor que no tenerlo.
 *
 * ── Dos variables, y la diferencia importa ──────────────────────────────────
 *
 * `CYBER_WHATSAPP_URL` (sin prefijo, **la recomendada**)
 *   Se lee en cada request. La landing es `force-dynamic` y server-rendered, y
 *   el enlace baja al componente como prop, así que el navegador nunca necesita
 *   la variable. Para cambiar el enlace alcanza con **redesplegar**: Vercel
 *   toma el valor nuevo sin tener que recompilar.
 *
 * `NEXT_PUBLIC_CYBER_WHATSAPP_URL` (compatibilidad)
 *   Next **incrusta** las variables `NEXT_PUBLIC_` en el bundle durante el
 *   build, también del lado del servidor. Cargarla en el panel de Vercel no
 *   alcanza: el valor viejo queda escrito en el JavaScript ya compilado, así
 *   que hace falta un **build nuevo**, no solo un redeploy.
 *
 * Si están las dos, gana la de servidor. Se acepta la pública porque es la que
 * quedó escrita en el plan, pero la de servidor es la que conviene operar: el
 * canal se crea sobre la fecha y es preferible poder encenderlo sin recompilar.
 *
 * Se lee DENTRO de la función a propósito: a nivel de módulo, el valor quedaría
 * congelado en el primer import y perdería la ventaja de leerse por request.
 */

/**
 * Solo se acepta la forma real de una invitación de WhatsApp. Así un
 * placeholder, una URL a medio escribir o un "TODO" no llegan a renderizar un
 * botón que no lleva a ningún lado.
 *
 * **Canal** (lo aprobado): `https://whatsapp.com/channel/<ID>`, donde el ID es
 * alfanumérico de ~22 caracteres — p. ej. `0029VbALxHmL2ATrx7hqkh1I`. Se acepta
 * con `www.`, porque al copiar desde WhatsApp Desktop puede venir con el
 * prefijo, y con `/` o `?` al final.
 *
 * **Grupo**: `https://chat.whatsapp.com/<código>`. Sigue aceptado por si algún
 * día se usa, pero el componente avisa que ahí el número queda a la vista.
 *
 * Lo que NO se acepta es el enlace a una PUBLICACIÓN del canal
 * (`.../channel/<ID>/123`): lleva a un posteo, no a seguir el canal.
 */
const FORMA_VALIDA =
  /^https:\/\/(?:www\.)?whatsapp\.com\/channel\/[A-Za-z0-9_-]{10,}\/?(?:\?.*)?$|^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]{10,}\/?(?:\?.*)?$/;

/** Para no repetir el mismo aviso en cada request. */
let avisado = '';

/**
 * El enlace si está cargado y es válido; `''` si no. Nunca devuelve algo a
 * medio validar: lo que sale de acá va directo a un `href`.
 */
export function whatsappUrl(): string {
  const crudo = (
    process.env.CYBER_WHATSAPP_URL ||
    process.env.NEXT_PUBLIC_CYBER_WHATSAPP_URL ||
    ''
  ).trim();

  if (crudo === '') return '';
  if (FORMA_VALIDA.test(crudo)) return crudo;

  if (avisado !== crudo) {
    avisado = crudo;
    console.warn(
      '[cyber] el enlace de WhatsApp no tiene forma de invitación ' +
      '(esperado https://whatsapp.com/channel/<ID>). El botón no se muestra.',
    );
  }
  return '';
}

/** ¿Hay una invitación cargada y con forma de invitación? */
export function whatsappDisponible(): boolean {
  return whatsappUrl() !== '';
}

/** `true` si la invitación es a un grupo, donde el número queda a la vista del resto. */
export function esGrupo(url: string): boolean {
  return url.startsWith('https://chat.whatsapp.com/');
}
