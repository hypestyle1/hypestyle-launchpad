import { createHmac, timingSafeEqual } from 'crypto';

// GOcuotas (api_redirect v1) no firma sus webhooks ni manda un header verificable,
// así que la única forma de autenticar el POST es un token compartido en la URL
// que le registramos al crear el checkout (webhook_url).
//
// El token es POR PEDIDO — HMAC(api_key, orderId) — no un secreto global: si la
// URL de un pedido se filtra (logs, historial del navegador, soporte de GOcuotas),
// no sirve para marcar como pagado ningún OTRO pedido. Los IDs de WooCommerce son
// secuenciales, así que un secreto global reutilizable sería mucho peor.
//
// Deriva del GOCUOTAS_API_KEY que ya está en Vercel: no hay que cargar ninguna
// variable de entorno nueva. Se puede pisar con GOCUOTAS_WEBHOOK_SECRET si algún
// día hay que rotar el token sin rotar la API key.
function webhookKey(): string {
  const override = (process.env.GOCUOTAS_WEBHOOK_SECRET || '').trim();
  if (override) return override;
  return (process.env.GOCUOTAS_API_KEY || '').trim();
}

export function gocuotasWebhookToken(orderId: number | string): string {
  const key = webhookKey();
  if (!key) return '';
  return createHmac('sha256', key).update(`gocuotas-webhook:${orderId}`).digest('hex').slice(0, 32);
}

export function verifyGocuotasWebhookToken(orderId: number | string, provided: string): boolean {
  const expected = gocuotasWebhookToken(orderId);
  // Fail closed: sin API key configurada no se puede verificar nada, y un webhook
  // sin verificar deja marcar cualquier pedido como pagado.
  if (!expected || !provided) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
