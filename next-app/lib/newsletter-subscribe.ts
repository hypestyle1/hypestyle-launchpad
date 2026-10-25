import type { Preferencia } from '@/lib/newsletter-popup';

/**
 * Alta en la newsletter desde el browser. Un solo lugar para no tener dos
 * formularios pegándole distinto al mismo endpoint: lo usan el popup
 * (components/NewsletterPopup.tsx) y el "Avisame" de /hype72.
 *
 * El endpoint (app/api/newsletter-subscribe/route.ts) da de alta el contacto
 * en Brevo y manda el mail de bienvenida con el cupón. No tira: los
 * formularios no tienen nada que hacer con el error más que seguir.
 */
export async function subscribeNewsletter(
  email: string,
  preferencia: Preferencia | null = null,
): Promise<void> {
  await fetch('/api/newsletter-subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, preferencia }),
  });
}
