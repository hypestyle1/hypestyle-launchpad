/**
 * Eventos del pixel de Meta.
 *
 * Espejo de `lib/ga.ts`: mismos puntos de disparo, payload traducido a los
 * nombres estándar de Meta. Existe para que los eventos del pixel dejen de
 * estar escritos a mano en cada componente — así fue como el `AddToCart` quedó
 * solo en ProductCard y nunca llegó a la ficha de producto, y como ViewContent
 * y AddPaymentInfo nunca se escribieron (audit de medición del 11-12/08/2026,
 * ver `12 - Analytics` en el vault).
 *
 * Todos los importes van en ARS, mismo criterio que GA4: los precios del
 * carrito se guardan en pesos y la conversión a USD/EUR es solo de presentación
 * (context/LocaleContext).
 *
 * NOTA SOBRE content_ids — deuda conocida, no se resuelve acá:
 * el `id` que usa el frontend es el SLUG del producto (`id: node.slug` en
 * lib/products-normalize.ts), mientras el catálogo de Meta indexa por el ID
 * numérico de WooCommerce (`retailer_id`). Nunca matchean, y Meta lo reporta
 * como diagnóstico en estado failed (`pixel_has_low_event_source_match_rate`).
 * Este módulo mantiene deliberadamente la convención actual para no mezclar dos
 * cambios: unificar el identificador toca el modelo de datos del frontend y va
 * en su propio PR. Cuando se haga, se cambia acá y aplica a los cuatro eventos.
 */

export interface FbItem {
  /** Hoy es el slug. Ver nota sobre content_ids arriba. */
  id: string;
  name?: string;
  price?: number;
  quantity?: number;
}

const CURRENCY = 'ARS';

/**
 * `window.fbq` lo define components/MetaPixel.tsx dentro de un useEffect, y los
 * efectos del layout corren DESPUÉS de los de la página. Un evento disparado al
 * montar —el ViewContent de la ficha de producto es exactamente ese caso— puede
 * llegar antes de que fbq exista. Mismo patrón de reintento que `gaEvent` en
 * lib/ga.ts y que el `firePurchase` de ConfirmacionClient.
 *
 * Si fbq nunca aparece (el visitante eligió "Solo necesarias", que es cuando
 * MetaPixel no carga el script) el evento se descarta, que es lo que
 * corresponde. A propósito no se encola en ningún lado: eso terminaría enviando
 * los eventos de alguien que optó por salir si el pixel cargara más tarde.
 */
function fbTrack(name: string, params: Record<string, unknown>, attempts = 0): void {
  if (typeof window === 'undefined') return;
  if (typeof window.fbq === 'function') {
    window.fbq('track', name, params);
    return;
  }
  if (attempts < 40) setTimeout(() => fbTrack(name, params, attempts + 1), 200);
}

function contentsOf(items: FbItem[]) {
  return items.map(i => ({ id: i.id, quantity: i.quantity ?? 1 }));
}

function totalOf(items: FbItem[]): number {
  return items.reduce((sum, i) => sum + (i.price ?? 0) * (i.quantity ?? 1), 0);
}

export function fbViewContent(item: FbItem & { category?: string }): void {
  fbTrack('ViewContent', {
    content_ids: [item.id],
    content_type: 'product',
    content_name: item.name,
    content_category: item.category,
    value: item.price ?? 0,
    currency: CURRENCY,
  });
}

export function fbAddToCart(item: FbItem): void {
  const quantity = item.quantity ?? 1;
  fbTrack('AddToCart', {
    content_ids: [item.id],
    content_type: 'product',
    content_name: item.name,
    contents: [{ id: item.id, quantity }],
    value: (item.price ?? 0) * quantity,
    currency: CURRENCY,
  });
}

/**
 * `value` se recibe explícito en vez de sumarse de los items: el total del
 * checkout incluye envío, cupones y descuentos que no viven en el renglón.
 */
export function fbInitiateCheckout(items: FbItem[], value?: number): void {
  fbTrack('InitiateCheckout', {
    content_ids: items.map(i => i.id),
    content_type: 'product',
    contents: contentsOf(items),
    num_items: items.reduce((s, i) => s + (i.quantity ?? 1), 0),
    value: value ?? totalOf(items),
    currency: CURRENCY,
  });
}

export function fbAddPaymentInfo(items: FbItem[], value?: number): void {
  fbTrack('AddPaymentInfo', {
    content_ids: items.map(i => i.id),
    content_type: 'product',
    contents: contentsOf(items),
    value: value ?? totalOf(items),
    currency: CURRENCY,
  });
}
