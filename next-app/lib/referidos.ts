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
/** Crédito emitido que viene de /credito ("Usar mis $X") rumbo al checkout. */
const CREDIT_KEY = 'hype_credit';

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
const COUPON_RE = /^HYPE-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export function isValidRefCode(code: string): boolean {
  return CODE_RE.test(code.toUpperCase());
}

/* ─── Storage con vencimiento ────────────────────────────────────────────────
 * La cookie expira sola; localStorage no. Todo lo que se guarda acá lleva su
 * propio vencimiento y se limpia al leerlo: un formato viejo (string pelado),
 * un JSON roto o una entrada vencida se borran en el acto y devuelven null.
 * Nunca queda una "reserva zombie" más allá de los 30 días. */

type Guardado = { c: string; a?: number; e: number };

function leerGuardado(key: string, valida: (c: string) => boolean): Guardado | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const v = JSON.parse(raw) as Guardado;
    if (!v || typeof v.c !== 'string' || typeof v.e !== 'number' || !valida(v.c.toUpperCase()) || v.e < Date.now()) {
      localStorage.removeItem(key);
      return null;
    }
    return { ...v, c: v.c.toUpperCase() };
  } catch {
    // JSON roto o formato legacy: se limpia y listo.
    try { localStorage.removeItem(key); } catch { /* ok */ }
    return null;
  }
}

function guardar(key: string, v: Guardado): void {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* privado/bloqueado */ }
}

/** Código reservado: la cookie es la fuente, localStorage el respaldo (con
 *  su propio vencimiento, para no sobrevivirla). */
export function getReferralCode(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${REF_COOKIE}=([^;]+)`));
  const deCookie = m ? decodeURIComponent(m[1]).toUpperCase() : '';
  if (deCookie && isValidRefCode(deCookie)) return deCookie;
  return leerGuardado(REF_COOKIE, isValidRefCode)?.c ?? null;
}

export function hasReferralPending(): boolean {
  return getReferralCode() !== null;
}

/** Respaldo en localStorage por si el navegador pisa la cookie: expira junto
 *  con la reserva (30 días desde que se vio por primera vez). */
export function mirrorReferralCode(code: string): void {
  const limpio = code.toUpperCase();
  if (!isValidRefCode(limpio)) return;
  const previo = leerGuardado(REF_COOKIE, isValidRefCode);
  if (previo?.c === limpio) return; // ya guardado: el vencimiento original manda
  guardar(REF_COOKIE, { c: limpio, e: Date.now() + REF_COOKIE_DIAS * 24 * 60 * 60 * 1000 });
}

/* ─── Crédito emitido rumbo al checkout (desde /credito) ───────────────── */

export function setPendingCredit(coupon: string, amount: number, venceIso?: string): void {
  const limpio = coupon.toUpperCase();
  if (!COUPON_RE.test(limpio)) return;
  // Hasta el vencimiento real del cupón si se conoce; si no, 30 días.
  const e = venceIso ? new Date(`${venceIso}T23:59:59`).getTime() : Date.now() + REF_VIGENCIA_DIAS * 24 * 60 * 60 * 1000;
  guardar(CREDIT_KEY, { c: limpio, a: amount, e });
}

export function getPendingCredit(): { code: string; amount: number } | null {
  const v = leerGuardado(CREDIT_KEY, (c) => COUPON_RE.test(c));
  return v && v.a && v.a > 0 ? { code: v.c, amount: v.a } : null;
}

export function clearPendingCredit(): void {
  try { localStorage.removeItem(CREDIT_KEY); } catch { /* ok */ }
}
