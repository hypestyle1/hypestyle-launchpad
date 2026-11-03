// Programa de referidos (Hype Rewards, fase 1). Reglas compartidas por el
// widget postcompra, el modal del amigo, el checkout y /credito. El backend
// (PHP/hypestyle-referidos.php) valida lo mismo: si se cambia acá hay que
// cambiarlo allá.

export const REF_AMIGO = 8000;
export const REF_PREMIO = 12000;
export const REF_MIN_COMPRA = 90000;
export const REF_VIGENCIA_DIAS = 30;
export const REF_HOLD_DIAS = 7;

/** La reserva del amigo: una cookie de 30 días que setea /r/[code]. */
export const REF_COOKIE = 'hype_ref';
export const REF_COOKIE_DIAS = 30;
/** El modal de bienvenida se muestra una vez por sesión. */
export const REF_MODAL_SHOWN = 'hype_ref_modal_visto';

export const formatRefMonto = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

/** El mensaje que sale por WhatsApp. En voz de persona, no de marca. */
export function refWhatsAppText(url: string): string {
  return `Che, te paso esto de Hype. Me dieron un link para regalarte $8.000 en tu primera compra. Fijate si te copa algo. ${url}`;
}

export function refWhatsAppUrl(url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(refWhatsAppText(url))}`;
}

const CODE_RE = /^[A-Z]{1,6}-\d{1,10}$/;

export function isValidRefCode(code: string): boolean {
  return CODE_RE.test(code.toUpperCase());
}

/** Código reservado, de la cookie (la fuente) o de localStorage (respaldo). */
export function getReferralCode(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${REF_COOKIE}=([^;]+)`));
  const deCookie = m ? decodeURIComponent(m[1]).toUpperCase() : '';
  if (deCookie && isValidRefCode(deCookie)) return deCookie;
  try {
    const ls = (localStorage.getItem(REF_COOKIE) || '').toUpperCase();
    if (ls && isValidRefCode(ls)) return ls;
  } catch { /* privado/bloqueado: no hay reserva */ }
  return null;
}

export function hasReferralPending(): boolean {
  return getReferralCode() !== null;
}

/** Respaldo en localStorage por si el navegador pisa la cookie. */
export function mirrorReferralCode(code: string): void {
  try { localStorage.setItem(REF_COOKIE, code.toUpperCase()); } catch { /* ok */ }
}
