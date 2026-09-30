/**
 * Carga el nombre real en el contacto de Brevo cuando el cliente compra.
 *
 * El popup de newsletter pide solo el email; el nombre bueno es el del pedido
 * (el que escribían en el popup era "valen", "vv" o nada). Solo se actualiza
 * un contacto que ya existe: comprar no es suscribirse, así que a quien no
 * está en la lista no se lo crea. El 404 de Brevo es ese caso y se ignora.
 *
 * Nunca falla hacia afuera: es un dato de personalización, no puede frenar
 * la confirmación del pedido.
 */
export async function setBrevoContactName(apiKey: string, email: string, nombre: string): Promise<void> {
  const name = nombre.trim();
  if (!apiKey || !email || !name) return;
  try {
    await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
      method: 'PUT',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ attributes: { NOMBRE: name } }),
    });
  } catch {}
}
