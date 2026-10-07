/**
 * Atribución de origen: por dónde entró la visita (utm, fbclid, referrer, landing).
 *
 * Los ads de Meta llegan con `utm_*` y `fbclid` en la URL, pero hasta ahora nada
 * los guardaba: el comercio completaba el formulario y en Woo quedaba una cuenta
 * sin rastro de por dónde entró. La auditoría del 03/09/2026 no pudo confirmar ni
 * una sola solicitud de la campaña MAYORISTA por eso. Lo mismo con los pedidos:
 * el 06/10/2026 no se pudo saber qué ad trajo cada venta de Regular Tees.
 *
 * Se guarda el PRIMER toque en sessionStorage: si la persona llega desde el ad,
 * navega el catálogo y recién después va al checkout o al formulario, la URL ya no
 * trae los parámetros pero el origen sigue siendo el ad. <AttributionCapture /> lo
 * captura en cada página. Todo va en texto plano y acotado en largo: son etiquetas
 * de campaña, no datos personales.
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

/** Referrer de otro sitio; la navegación interna no cuenta como origen. */
function externalReferrer(): string | undefined {
  const ref = document.referrer;
  if (!ref) return undefined;
  try {
    if (new URL(ref).host === window.location.host) return undefined;
  } catch {
    return undefined;
  }
  return cut(ref);
}

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
    referrer: externalReferrer(),
    landing: cut(window.location.pathname),
  };
  // Primer toque manda: solo se pisa lo que todavía no estaba. La landing y el
  // referrer son siempre los de la primera página de la sesión, aunque esa
  // primera visita no trajera utm.
  const hasPrevious = Boolean(previous.utm_source || previous.fbclid);
  const merged: Attribution = hasPrevious ? { ...current, ...previous } : { ...previous, ...current };
  if (previous.landing) {
    merged.landing = previous.landing;
    merged.referrer = previous.referrer;
  }
  const clean = Object.fromEntries(Object.entries(merged).filter(([, v]) => v)) as Attribution;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(clean));
  } catch {
    /* modo privado o storage lleno: se devuelve igual lo leído de la URL */
  }
  return clean;
}

const FIELDS: (keyof Attribution)[] = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'referrer', 'landing',
];

/** Server-side: lo que manda el navegador, reducido a strings cortos y sin caracteres de control. */
export function sanitizeAttribution(raw: unknown): Attribution {
  if (!raw || typeof raw !== 'object') return {};
  const out: Attribution = {};
  for (const k of FIELDS) {
    const v = (raw as Record<string, unknown>)[k];
    if (typeof v !== 'string') continue;
    const s = v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, MAX);
    if (s) out[k] = s;
  }
  return out;
}

/**
 * Meta del pedido con las claves de la atribución nativa de WooCommerce
 * (`_wc_order_attribution_*`): así el admin de Woo muestra la columna "Origen"
 * y el panel/los scripts leen siempre las mismas claves.
 */
export function attributionOrderMeta(raw: unknown): { key: string; value: string }[] {
  const a = sanitizeAttribution(raw);
  const meta: { key: string; value: string }[] = [];
  const add = (key: string, value?: string) => { if (value) meta.push({ key: `_wc_order_attribution_${key}`, value }); };
  if (!Object.keys(a).length) return meta;
  add('source_type', a.utm_source ? 'utm' : a.referrer ? 'referral' : 'typein');
  add('utm_source', a.utm_source);
  add('utm_medium', a.utm_medium);
  add('utm_campaign', a.utm_campaign);
  add('utm_content', a.utm_content);
  add('utm_term', a.utm_term);
  add('referrer', a.referrer);
  add('session_entry', a.landing);
  if (a.fbclid) meta.push({ key: '_hs_fbclid', value: a.fbclid });
  return meta;
}
