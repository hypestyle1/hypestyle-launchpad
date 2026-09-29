/**
 * Línea de envío de un pedido nacional, como la espera el plugin de Andreani.
 *
 * WooCommerce guarda en la línea de envío el ID del MÉTODO (`andreani_flexipaas`)
 * y el de la INSTANCIA de la zona. El cotizador devuelve otra cosa: el ID de la
 * TARIFA (`andreani_pyme_estándar`, `andreani_pyme_sucursal`), que es lo que el
 * checkout manda como `shippingMethodId`.
 *
 * Hasta el 29/09/2026 escribíamos la tarifa como `method_id`. El plugin 1.5.2 no
 * miraba ese campo; la 1.6.9 sí, y con el valor mal la grilla de envíos sale
 * vacía y el recuadro de Andreani no aparece en el pedido. La tarifa elegida
 * sigue viajando en el meta `_chosen_shipping`, que es de donde la lee el plugin.
 *
 * TODOS los pedidos nacionales del sitio se crean por acá (WC REST), no por
 * `hypestyle-api.php`: el mismo arreglo en el PHP no alcanza a ningún pedido
 * del checkout.
 */
export const ANDREANI_METHOD_ID = 'andreani_flexipaas';

/**
 * Instancia del método en Ajustes → Envíos → Argentina. Verificada por WC REST
 * (`/shipping/zones/1/methods`). Si se recrea la zona cambia: se pisa con la
 * variable de entorno sin tocar código.
 */
const INSTANCIA_POR_DEFECTO = '1';

export function andreaniInstanceId(): string {
  return (process.env.ANDREANI_INSTANCE_ID || '').trim() || INSTANCIA_POR_DEFECTO;
}

export function esTarifaAndreani(tarifaId: string | null | undefined): boolean {
  return (tarifaId ?? '').toLowerCase().startsWith('andreani');
}

export interface LineaDeEnvio {
  method_id: string;
  instance_id?: string;
  method_title: string;
  total: string;
}

/**
 * Con envío gratis el total llega en 0 y la línea se crea igual: sin ella el
 * plugin no tiene de dónde sacar el método y rechaza el pedido al empaquetar.
 */
export function lineasDeEnvio(
  tarifaId: string | null | undefined,
  label: string | null | undefined,
  total: number | null | undefined,
): LineaDeEnvio[] {
  if (!tarifaId) return [];
  const base = { method_title: label ?? tarifaId, total: String(total ?? 0) };
  if (!esTarifaAndreani(tarifaId)) return [{ method_id: tarifaId, ...base }];
  return [{ method_id: ANDREANI_METHOD_ID, instance_id: andreaniInstanceId(), ...base }];
}
