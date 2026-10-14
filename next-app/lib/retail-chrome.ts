// Dónde NO se monta el "chrome" de la tienda minorista: barras de promo,
// intro de marca, takeover, sugerencia de idioma, WhatsApp flotante.
//
// Cada componente tenía su propia lista (y alguno ninguna). El 13/10/2026 la
// auditoría del portal mayorista encontró la barra de promo tapando el header
// del portal, el WhatsApp minorista ("Hola Hype!") encima del formulario de
// solicitud y la intro corriendo en /mayoristas. Una sola lista, un solo lugar.

export const RETAIL_CHROME_HIDDEN_PREFIXES = [
  '/admin',
  '/checkout',
  '/pendiente-de-pago',
  '/confirmacion',
  '/pagar',
  // Canal mayorista: otro público, otra navegación, sus propios contactos.
  '/mayoristas',
] as const;

export function isRetailChromeHidden(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return RETAIL_CHROME_HIDDEN_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`) || pathname.startsWith(p));
}
