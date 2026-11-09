/**
 * Alta a la newsletter desde el navegador — el único camino para hablar con
 * /api/newsletter-subscribe.
 *
 * Existe por el issue #625: el footer mostraba "¡Listo!" sin llamar a la API y
 * el popup llamaba pero no miraba la respuesta. Las dos cosas terminaban igual:
 * la persona veía "listo" y el mail nunca llegaba a Brevo. Acá el resultado se
 * lee siempre (status + JSON) y se devuelve, para que el formulario muestre
 * "listo" SOLO cuando el servidor lo confirmó.
 *
 * Lo usan el footer, el popup (modal y barra) y el "Avisame" de CYBER HYPE
 * (vía lib/cyber-registro-cliente).
 */

export type MotivoAlta =
  /** Alta nueva confirmada por el servidor. */
  | 'alta'
  /** El mail ya estaba en la lista: cuenta como éxito, con mensaje propio. */
  | 'ya-suscripto'
  /** 400: la dirección no pasa la validación del servidor. */
  | 'email-invalido'
  /** 429: tope de altas por IP (puede ser una IP compartida, no culpa de la persona). */
  | 'demasiados-intentos'
  /** 5xx, sin red, o una respuesta que no confirma el alta. */
  | 'error';

export interface ResultadoAlta {
  ok: boolean;
  motivo: MotivoAlta;
}

/**
 * De dónde viene el alta. Hoy el endpoint solo distingue `cyber` (lista propia,
 * sin bienvenida); el resto es el alta normal del sitio. Se manda igual para
 * que quede en el request y se pueda registrar sin tocar los formularios.
 */
export type OrigenAlta = 'footer' | 'popup' | 'barra' | 'cyber';

export interface DatosAlta {
  email: string;
  origen: OrigenAlta;
  /** hombre / mujer / todo — la pregunta del primer paso del popup. */
  preferencia?: string | null;
  /** Campos extra del formulario (honeypot, tiempo, UTM del Cyber). */
  extra?: Record<string, unknown>;
}

/**
 * Traduce la respuesta HTTP a un resultado. Separada del fetch para poder
 * probarla sin red.
 */
export function interpretarRespuesta(status: number, data: unknown): ResultadoAlta {
  if (status === 400) return { ok: false, motivo: 'email-invalido' };
  if (status === 429) return { ok: false, motivo: 'demasiados-intentos' };
  if (status < 200 || status >= 300) return { ok: false, motivo: 'error' }; // 500, 503 (config/reoptin), etc.

  // 200 sin `ok: true` no es un alta: no se adivina.
  const d = (data && typeof data === 'object' ? data : {}) as { ok?: unknown; estado?: unknown };
  if (d.ok !== true) return { ok: false, motivo: 'error' };
  return { ok: true, motivo: d.estado === 'ya-suscripto' ? 'ya-suscripto' : 'alta' };
}

export async function altaNewsletter({ email, origen, preferencia = null, extra }: DatosAlta): Promise<ResultadoAlta> {
  try {
    const res = await fetch('/api/newsletter-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), preferencia, origen, ...extra }),
    });
    const data = await res.json().catch(() => null);
    return interpretarRespuesta(res.status, data);
  } catch {
    // Sin red: el formulario ofrece reintentar con el mail que ya tipeó.
    return { ok: false, motivo: 'error' };
  }
}

/**
 * Textos de cada resultado. En un solo lugar para que el footer y el popup
 * digan lo mismo y para que los tests puedan afirmar que un error nunca dice
 * "listo". Voz Hype: corto, sin emojis, sin "No + te".
 */
export const MENSAJES_ERROR: Record<Exclude<MotivoAlta, 'alta' | 'ya-suscripto'>, string> = {
  'email-invalido': 'Revisá el mail: parece que falta algo.',
  // Puede ser una IP compartida (CGNAT, wifi de facultad): no se le echa la culpa.
  'demasiados-intentos': 'Hubo muchas altas desde esta conexión. Probá de nuevo en un rato.',
  error: 'No pudimos anotarte. Probá de nuevo.',
};

export const MENSAJES_EXITO = {
  alta: 'Listo. Revisá tu mail, ahí está el código.',
  'ya-suscripto': 'Ese mail ya estaba en la lista.',
} as const;

export function mensajeError(motivo: MotivoAlta): string | null {
  return motivo === 'alta' || motivo === 'ya-suscripto' ? null : MENSAJES_ERROR[motivo];
}
