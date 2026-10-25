import type { Preferencia } from '@/lib/newsletter-popup';

/**
 * Alta en la newsletter desde el browser. Un solo lugar para no tener dos
 * formularios pegándole distinto al mismo endpoint: lo usan el popup
 * (components/NewsletterPopup.tsx) y el "Avisame" de /hype72.
 *
 * El endpoint (app/api/newsletter-subscribe/route.ts) da de alta el contacto
 * en Brevo. No tira: los formularios no tienen nada que hacer con el error más
 * que seguir.
 *
 * Los dos formularios mandan el mismo payload salvo `origen`, que es lo que
 * decide A QUÉ LISTA entra y SI se dispara la bienvenida:
 *   - popup  → lista de newsletter + mail de bienvenida con el cupón HYPE10.
 *   - hype72 → lista propia del evento, etiquetado HYPE72, SIN bienvenida y
 *              SIN cupón (el que deja el mail en la landing quiere el aviso del
 *              drop, no un 10% que después se le suma a los packs del evento).
 */
export type OrigenAlta = 'popup' | 'hype72';

export interface AltaNewsletterBody {
  email: string;
  preferencia: Preferencia | null;
  origen?: OrigenAlta;
}

/**
 * El cuerpo exacto que viaja al endpoint. El alta del popup NO manda `origen`:
 * así el payload de siempre queda byte por byte igual y el default del servidor
 * ('popup') es el único camino que dispara la bienvenida.
 */
export function altaNewsletterBody(
  email: string,
  preferencia: Preferencia | null = null,
  origen: OrigenAlta = 'popup',
): AltaNewsletterBody {
  return { email, preferencia, ...(origen === 'popup' ? {} : { origen }) };
}

export async function subscribeNewsletter(
  email: string,
  preferencia: Preferencia | null = null,
  origen: OrigenAlta = 'popup',
): Promise<void> {
  await fetch('/api/newsletter-subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(altaNewsletterBody(email, preferencia, origen)),
  });
}

/** El "Avisame" de /hype72: captura el mail para el evento, sin bienvenida. */
export async function subscribeHype72(email: string): Promise<void> {
  await subscribeNewsletter(email, null, 'hype72');
}
