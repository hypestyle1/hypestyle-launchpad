import type { Language, Currency } from '@/context/LocaleContext';

/**
 * De qué país entró el visitante, y qué idioma y moneda le corresponden.
 *
 * El país lo resuelve el middleware con la geolocalización que Vercel ya
 * adjunta a cada request, y lo deja en una cookie legible por el cliente.
 * Antes esto dependía de un fetch del navegador a ipapi.co (gratuita, con
 * límite de requests y bloqueada por buena parte de los ad-blockers): cuando
 * fallaba, el visitante de afuera se quedaba viendo pesos argentinos sin
 * ninguna referencia y un checkout en español con Argentina preseleccionada.
 *
 * La cookie es una sugerencia, nunca una imposición: si la persona ya eligió
 * idioma o moneda a mano, eso gana (ver LocaleContext).
 */

export const COUNTRY_COOKIE = 'hs-country';

const US_LIKE = ['US', 'CA', 'AU', 'NZ', 'GB', 'IE', 'SG', 'HK'];
// Países con idioma propio en el sitio. Suiza y Bélgica son multilingües:
// se les sugiere el idioma mayoritario (alemán y francés) y la persona lo
// cambia desde el selector si no le sirve.
const DE_ZONE = ['DE', 'AT', 'CH', 'LI'];
const FR_ZONE = ['FR', 'BE', 'LU', 'MC'];
const IT_ZONE = ['IT', 'SM', 'VA'];
// El resto de Europa cae a inglés con euro.
const EUR_ZONE = ['NL', 'PT', 'FI', 'SE', 'NO', 'DK', 'PL', 'GR', 'CZ', 'HU', 'RO', 'ES'];
const ES_LATAM = ['MX', 'CO', 'CL', 'PE', 'UY', 'PY', 'BO', 'EC', 'VE', 'CR', 'GT', 'HN', 'SV', 'NI', 'PA', 'DO', 'CU', 'PR'];

export interface LocaleGuess {
  language: Language;
  currency: Currency;
  /** Etiqueta corta para ofrecer el cambio, en el idioma que se sugiere. */
  label: string;
}

/**
 * Devuelve null para Argentina: es el default del sitio y no hay nada que
 * sugerir ni que cambiar.
 */
export function localeForCountry(code: string | null | undefined): LocaleGuess | null {
  if (!code) return null;
  const c = code.toUpperCase();
  if (c === 'AR') return null;

  if (c === 'BR') return { language: 'PT', currency: 'USD', label: 'Português · Dólar' };
  if (c === 'PT') return { language: 'PT', currency: 'EUR', label: 'Português · Euro' };
  if (US_LIKE.includes(c)) return { language: 'EN', currency: 'USD', label: 'English · US Dollar' };
  if (DE_ZONE.includes(c)) return { language: 'DE', currency: 'EUR', label: 'Deutsch · Euro' };
  if (FR_ZONE.includes(c)) return { language: 'FR', currency: 'EUR', label: 'Français · Euro' };
  if (IT_ZONE.includes(c)) return { language: 'IT', currency: 'EUR', label: 'Italiano · Euro' };
  if (EUR_ZONE.includes(c)) return { language: 'EN', currency: 'EUR', label: 'English · Euro' };
  // España e Hispanoamérica: el idioma ya les sirve, lo que cambia es la moneda.
  if (c === 'ES') return { language: 'ES', currency: 'EUR', label: 'Español · Euro' };
  if (ES_LATAM.includes(c)) return { language: 'ES', currency: 'USD', label: 'Español · Dólar' };

  return { language: 'EN', currency: 'USD', label: 'English · US Dollar' };
}

/** Solo en el browser. En el server el país se lee del request. */
export function readCountryCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const hit = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${COUNTRY_COOKIE}=`));
  return hit ? decodeURIComponent(hit.slice(COUNTRY_COOKIE.length + 1)) || null : null;
}
