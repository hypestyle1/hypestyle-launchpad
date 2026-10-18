/**
 * Correlación pedido ↔ sesión de Microsoft Clarity.
 *
 * Clarity guarda sus IDs en cookies propias: `_clck` (ID de usuario del
 * navegador) y `_clsk` (ID de la sesión en curso), con formato `id|otros|datos`.
 * Acá se extrae solo el primer segmento (el ID anónimo) para guardarlo como
 * meta del pedido (`_clarity_user` / `_clarity_session`): con eso la grabación
 * se encuentra en el dashboard sin adivinar fecha y hora.
 *
 * Además, al crear el pedido se etiqueta la sesión con el número de orden
 * (custom tag `order_id`), que es filtrable en Recordings → Filters → Custom
 * tags. Solo viaja el número de pedido: nunca mandar nombre, email, teléfono,
 * DNI ni ningún dato personal a Clarity.
 */

function leerCookie(cookies: string, nombre: string): string | undefined {
  const m = cookies.match(new RegExp('(?:^|; )' + nombre + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : undefined;
}

/** Parte pura, testeable: recibe el `document.cookie` como string. */
export function parseClarityCookies(cookies: string): { clarityUser?: string; claritySession?: string } {
  const user = (leerCookie(cookies, '_clck') ?? '').split('|')[0] || undefined;
  const session = (leerCookie(cookies, '_clsk') ?? '').split('|')[0] || undefined;
  const out: { clarityUser?: string; claritySession?: string } = {};
  if (user) out.clarityUser = user;
  if (session) out.claritySession = session;
  return out;
}

export function getClarityCookies(): { clarityUser?: string; claritySession?: string } {
  if (typeof document === 'undefined') return {};
  return parseClarityCookies(document.cookie);
}

/**
 * Etiqueta la sesión de Clarity con el número de pedido. Best-effort: si
 * Clarity no cargó (consentimiento, bloqueador, todavía sin interacción) no
 * pasa nada — queda el meta del pedido como camino alternativo.
 */
export function tagClarityOrder(orderNumber: string | number): void {
  try {
    const w = typeof window !== 'undefined' ? (window as any) : null;
    if (w && typeof w.clarity === 'function') w.clarity('set', 'order_id', String(orderNumber));
  } catch { /* medición: nunca romper el checkout */ }
}
