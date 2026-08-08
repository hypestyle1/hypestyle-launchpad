/**
 * Eventos de e-commerce de GA4.
 *
 * Los puntos de disparo son los mismos que ya usa el pixel de Meta (ver
 * components/MetaPixel.tsx y las llamadas a `fbq` en ProductCard, checkout y
 * confirmación): este módulo solo traduce el payload a los nombres estándar de
 * GA4 e-commerce, sin duplicar lógica de carrito ni de precios.
 *
 * Todos los importes van en ARS. Los precios del carrito se guardan siempre en
 * pesos y la conversión a USD/EUR es solo de presentación (context/LocaleContext),
 * así que mandar el valor crudo con currency ARS es lo correcto — es el mismo
 * criterio que ya aplica el pixel.
 */

export interface GaItem {
  item_id: string;
  item_name: string;
  price?: number;
  quantity?: number;
  item_category?: string;
  /** Talle. En GA4 el talle es una variante del mismo item, no un item distinto. */
  item_variant?: string;
}

const CURRENCY = 'ARS';

/**
 * `window.gtag` lo define components/GoogleAnalytics.tsx dentro de un useEffect,
 * y los efectos del layout corren DESPUÉS de los de la página. Un evento
 * disparado al montar —el `purchase` de /confirmacion es el caso— puede llegar
 * antes de que gtag exista, así que se reintenta un rato corto. Mismo patrón que
 * el `firePurchase` del pixel en ConfirmacionClient.
 *
 * Si gtag nunca aparece (el visitante eligió "Solo necesarias", o falta
 * NEXT_PUBLIC_GA_ID) el evento se descarta, que es justo lo que corresponde.
 * A propósito no se encola en `dataLayer`: eso haría que los eventos de alguien
 * que optó por salir se terminaran enviando igual si GA cargara más tarde.
 */
function gaEvent(name: string, params: Record<string, unknown>, attempts = 0): void {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag === 'function') {
    window.gtag('event', name, params);
    return;
  }
  if (attempts < 40) setTimeout(() => gaEvent(name, params, attempts + 1), 200);
}

function totalOf(items: GaItem[]): number {
  return items.reduce((sum, i) => sum + (i.price ?? 0) * (i.quantity ?? 1), 0);
}

export function gaViewItem(item: GaItem): void {
  gaEvent('view_item', { currency: CURRENCY, value: item.price ?? 0, items: [item] });
}

export function gaAddToCart(item: GaItem): void {
  const quantity = item.quantity ?? 1;
  gaEvent('add_to_cart', {
    currency: CURRENCY,
    value: (item.price ?? 0) * quantity,
    items: [{ ...item, quantity }],
  });
}

export function gaBeginCheckout(items: GaItem[], value?: number): void {
  gaEvent('begin_checkout', {
    currency: CURRENCY,
    value: value ?? totalOf(items),
    items,
  });
}

/**
 * Solo debe llamarse con el pago efectivamente confirmado — ver el comentario en
 * app/confirmacion/ConfirmacionClient.tsx. `transactionId` es además la clave de
 * deduplicación de GA4: si el cliente recarga la pantalla de confirmación, GA
 * descarta la segunda compra con el mismo id.
 */
export function gaPurchase(args: {
  transactionId: string;
  value: number;
  items: GaItem[];
  shipping?: number;
}): void {
  gaEvent('purchase', {
    transaction_id: args.transactionId,
    currency: CURRENCY,
    value: args.value,
    ...(args.shipping !== undefined ? { shipping: args.shipping } : {}),
    items: args.items,
  });
}
