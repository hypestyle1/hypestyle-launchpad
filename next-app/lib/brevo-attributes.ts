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

  await Promise.all([create('SIGNUP_DATE', 'text'), create('WELCOME_STEP', 'float')]);
}
