/**
 * Alta por WhatsApp para CYBER HYPE.
 *
 * El canal existe desde el 28/10/2026 y el enlace viaja **en el código**, no en
 * una variable de entorno. La razón es operativa: la landing y las historias de
 * Instagram salen el mismo día, y un botón que depende de que alguien se acuerde
 * de cargar una variable en un panel es un botón que el día del lanzamiento no
 * está. El enlace de un canal es público por definición — se reparte por
 * historias y por bio — así que no hay nada que esconder acá.
 *
 * ── Cómo se cambia o se apaga ───────────────────────────────────────────────
 *
 * `CYBER_WHATSAPP_URL` (sin prefijo, **la que conviene operar**)
 *   Pisa el enlace del código. Se lee en cada request: la landing es
 *   `force-dynamic` y server-rendered, y el enlace baja al componente como prop,
 *   así que el navegador nunca necesita la variable. Para cambiarlo alcanza con
 *   **redesplegar**, sin recompilar.
 *
 * `NEXT_PUBLIC_CYBER_WHATSAPP_URL` (compatibilidad)
 *   Next **incrusta** las `NEXT_PUBLIC_` en el bundle durante el build, también
 *   del lado del servidor. Cargarla en el panel no alcanza: el valor viejo queda
 *   escrito en el JavaScript ya compilado y hace falta un **build nuevo**.
 *
 * Si están las dos, gana la de servidor.
 *
 * **Para apagar el botón** sin revertir nada: cargar `CYBER_WHATSAPP_URL=off` y
 * redesplegar. Es el nivel 3 del rollback. Dejarla vacía NO apaga nada — vuelve
 * al enlace del código —, justamente para que un borrado accidental no deje la
 * página a medias.
 *
 * Se lee DENTRO de la función a propósito: a nivel de módulo, el valor quedaría
 * congelado en el primer import y perdería la ventaja de leerse por request.
 */

/**
 * El canal oficial: **HYPE® STYLE&CULTURE**, creado el 28/10/2026.
 *
 * Verificado ese día: responde 200 sin sesión y el `og:title` de la página es
 * exactamente el nombre del canal. Es un canal, no un grupo, así que el número
 * de nadie queda a la vista.
 *
 * **No es del Cyber: es de la marca y queda para siempre** (decisión de
 * Valentín del 29/10). Por eso se exporta: el footer del sitio lo linkea de
 * forma permanente, así que cuando el evento termine y los bloques de campaña
 * dejen de renderizarse, el canal sigue teniendo su lugar. Una sola definición
 * de la URL para las dos superficies.
 *
 * Ojo con las palancas de abajo: apagan los botones de CAMPAÑA (server-rendered,
 * leen la variable por request). El link del footer es permanente y vive en un
 * componente de cliente, igual que Instagram o TikTok: para sacarlo se edita el
 * footer. Es a propósito — una variable pensada para bajar un botón de campaña
 * no debería además borrar una red social del pie del sitio.
 */
export const CANAL_OFICIAL = 'https://whatsapp.com/channel/0029Vb8xziY89injZvFrch2l';

/** Valores que apagan el botón a propósito. */
const APAGADO = new Set(['off', 'none', 'no', '0', 'false']);

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
 * El enlace del canal: el de la variable si está cargada, el del código si no,
 * `''` si se apagó a mano o si lo cargado no tiene forma de invitación. Nunca
 * devuelve algo a medio validar: lo que sale de acá va directo a un `href`.
 */
export function whatsappUrl(): string {
  const crudo = (
    process.env.CYBER_WHATSAPP_URL ||
    process.env.NEXT_PUBLIC_CYBER_WHATSAPP_URL ||
    ''
  ).trim();

  if (APAGADO.has(crudo.toLowerCase())) return '';

  const valor = crudo === '' ? CANAL_OFICIAL : crudo;
  if (FORMA_VALIDA.test(valor)) return valor;

  if (avisado !== valor) {
    avisado = valor;
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
