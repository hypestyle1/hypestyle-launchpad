/**
 * Atribución de origen para formularios (hoy, la solicitud mayorista).
 *
 * Los ads de Meta llegan con `utm_*` y `fbclid` en la URL, pero hasta ahora nada
 * los guardaba: el comercio completaba el formulario y en Woo quedaba una cuenta
 * sin rastro de por dónde entró. La auditoría del 03/09/2026 no pudo confirmar ni
 * una sola solicitud de la campaña MAYORISTA por eso.
 *
 * Se guarda el PRIMER toque en sessionStorage: si la persona llega desde el ad,
 * navega el catálogo y recién después vuelve al formulario, la URL ya no trae los
 * parámetros pero el origen sigue siendo el ad. Todo va en texto plano y acotado
 * en largo: son etiquetas de campaña, no datos personales.
 */

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  referrer?: string;
  landing?: string;
}

const KEY = 'hy_attribution';
const MAX = 200;

const cut = (v: string | null | undefined) => (v ? v.slice(0, MAX) : undefined);

export function captureAttribution(): Attribution {
  if (typeof window === 'undefined') return {};
  let previous: Attribution = {};
  try {
    previous = JSON.parse(sessionStorage.getItem(KEY) || '{}');
  } catch {
    previous = {};
  }
  const p = new URLSearchParams(window.location.search);
  const current: Attribution = {
    utm_source: cut(p.get('utm_source')),
    utm_medium: cut(p.get('utm_medium')),
    utm_campaign: cut(p.get('utm_campaign')),
    utm_content: cut(p.get('utm_content')),
    utm_term: cut(p.get('utm_term')),
    fbclid: cut(p.get('fbclid')),
    referrer: cut(document.referrer),
    landing: cut(window.location.pathname),
  };
  // Primer toque manda: solo se pisa lo que todavía no estaba.
  const hasPrevious = Boolean(previous.utm_source || previous.fbclid);
  const merged: Attribution = hasPrevious ? { ...current, ...previous } : { ...previous, ...current };
  const clean = Object.fromEntries(Object.entries(merged).filter(([, v]) => v)) as Attribution;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(clean));
  } catch {
    /* modo privado o storage lleno: se devuelve igual lo leído de la URL */
  }
  return clean;
}
