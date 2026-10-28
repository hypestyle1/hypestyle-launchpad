/**
 * Origen del tráfico de la landing de CYBER HYPE.
 *
 * Para qué: sin esto, un alta desde la pauta y un alta desde una historia son
 * indistinguibles en Brevo, y no hay forma de saber cuánto cuesta un registro.
 * La convención de la casa es `utm_campaign=cyber-hype` en todo ad nuevo.
 *
 * **Estos valores son datos del usuario, no una credencial.** Cualquiera puede
 * entrar con `?utm_source=loquesea`: viajan al servidor, se limpian y se
 * guardan como atributos del contacto para poder segmentar, y **nunca** se usan
 * para decidir nada —ni un permiso, ni una lista, ni un precio—. Tampoco se le
 * mandan a Meta: el `Lead` va sin datos personales y Meta atribuye por su
 * propio click id.
 *
 * Se leen una vez al montar y se guardan en `sessionStorage`: si la persona
 * recarga o vuelve de la política de privacidad, el origen no se pierde. Es la
 * misma idea que usa el popup del sitio (`readSource`).
 */

export interface OrigenUtm {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
}

const CLAVE = 'hy_cyber_utm';
const CAMPOS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const;

/**
 * Recorte defensivo del lado del cliente: 80 caracteres y fuera lo que no sea
 * texto plano de UTM. El servidor vuelve a limpiar igual — esto es para no
 * mandar basura por la red, no la validación de verdad.
 */
function limpiar(valor: string | null): string | undefined {
  if (!valor) return undefined;
  const v = valor.trim().slice(0, 80).replace(/[^\w\s.\-|/+]/g, '');
  return v || undefined;
}

/** Lee la URL; si no trae nada, recupera lo que se guardó al llegar. */
export function leerOrigen(): OrigenUtm {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  const deUrl: OrigenUtm = {};
  for (const campo of CAMPOS) {
    const v = limpiar(params.get(campo));
    if (v) deUrl[campo] = v;
  }

  if (Object.keys(deUrl).length > 0) {
    try { sessionStorage.setItem(CLAVE, JSON.stringify(deUrl)); } catch { /* modo privado */ }
    return deUrl;
  }

  try {
    const guardado = sessionStorage.getItem(CLAVE);
    if (!guardado) return {};
    const parsed = JSON.parse(guardado);
    const limpio: OrigenUtm = {};
    for (const campo of CAMPOS) {
      const v = limpiar(typeof parsed?.[campo] === 'string' ? parsed[campo] : null);
      if (v) limpio[campo] = v;
    }
    return limpio;
  } catch {
    return {};
  }
}
