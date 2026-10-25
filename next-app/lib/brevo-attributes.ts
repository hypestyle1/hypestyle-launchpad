// Atributos custom de contacto que necesita la secuencia de bienvenida (welcome-sweep).
// Brevo rechaza attributes que no estén dados de alta en la cuenta, así que se
// aseguran acá antes de usarlos — llamado tanto al suscribir (newsletter-subscribe)
// como en cada corrida del cron (welcome-sweep), es idempotente y se ignoran los
// errores de "ya existe".
export async function ensureWelcomeAttributes(apiKey: string) {
  const create = (name: string, type: 'text' | 'float') =>
    fetch(`https://api.brevo.com/v3/contacts/attributes/normal/${name}`, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    }).catch(() => {});

  // PREFERENCIA: hombre / mujer / todo, lo que eligió en el popup de newsletter.
  await Promise.all([create('SIGNUP_DATE', 'text'), create('WELCOME_STEP', 'float'), create('PREFERENCIA', 'text')]);
}

/**
 * Atributos del alta de HYPE 72 (el "Avisame" de la landing /hype72).
 *
 * HYPE72='yes' es la etiqueta del segmento: con eso se arma la lista del envío
 * del evento sin mezclarla con la newsletter. HYPE72_DATE es cuándo dejó el mail
 * (NO se usa SIGNUP_DATE a propósito: ese atributo es el que dispara la secuencia
 * de bienvenida en welcome-sweep, y el que deja el mail acá no la recibe).
 *
 * Se llama solo en el alta de HYPE 72 — el alta normal del popup no necesita
 * estos atributos y no paga dos requests más por cada suscripción.
 */
export async function ensureHype72Attributes(apiKey: string) {
  const create = (name: string, type: 'text' | 'float') =>
    fetch(`https://api.brevo.com/v3/contacts/attributes/normal/${name}`, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    }).catch(() => {});

  await Promise.all([create('HYPE72', 'text'), create('HYPE72_DATE', 'text')]);
}
