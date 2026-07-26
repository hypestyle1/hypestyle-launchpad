# Purchase Gift — auditoría de arquitectura

## 1. Contexto

Hypestyle es 100% headless: el comprador nunca ve el carrito ni el checkout nativo de WooCommerce. El carrito vive en `next-app/context/CartContext.tsx` — un `useReducer` con persistencia en `localStorage` (`hy_cart`). No hay sesión de WooCommerce, no hay `wc_session`, no hay Store API consumida por el navegador.

Existen **tres flujos distintos** de creación de orden en producción:

1. **`create-order`** (`next-app/app/api/create-order/route.ts`) → proxy hacia el mu-plugin (`PHP/hypestyle-api.php`, función `hypestyle_create_order()`), que arma la orden manualmente con `wc_create_order()` + `add_product()`/`WC_Order_Item_Product` a mano.
2. **`create-order-gocuotas`** (`next-app/app/api/create-order-gocuotas/route.ts`) → `POST /wp-json/wc/v3/orders` directo (REST API real de WooCommerce).
3. **`create-order-intl`** (`next-app/app/api/create-order-intl/route.ts`) → mismo `POST /wp-json/wc/v3/orders`, para pedidos internacionales.

Ninguno de los tres pasa por Cart/Checkout Blocks ni por el checkout clásico de WooCommerce — esos hooks nunca se disparan en este sitio.

## 2. Historia: por qué NO se usa `woocommerce_new_order`

La primera versión de este plugin enganchaba `woocommerce_new_order` como único punto de integración, asumiendo que "dispara siempre que se guarda un pedido nuevo, sin importar el flujo". Se verificó contra el **código real de WooCommerce 10.7.0** (no por asunción) y esa premisa era falsa para los tres flujos:

- **Flujo 1 (mu-plugin)**: `hypestyle_create_order()` llama `wc_create_order()` (que internamente hace `new WC_Order(0)` + `$order->save()`, `wc-core-functions.php` líneas 100 y 136) **antes** de agregar un solo producto, envío, descuento o dirección. Ese `save()` dispara `OrdersTableDataStore::create()` (HPOS), que en su línea final ejecuta `do_action('woocommerce_new_order', $order->get_id(), $order)` — con la orden completamente vacía (0 line items, total 0, status `''`). El hook corría minutos-de-código antes de que el mu-plugin agregara cualquier dato real.
- **Flujos 2 y 3 (REST)**: `WC_REST_Orders_Controller::save_object()` sí puebla el objeto en memoria (billing/shipping/line_items/fees/cupones) antes del primer `->save()`. Pero la implementación original hacía `wc_get_order($order_id)` dentro del handler de `woocommerce_new_order` — y `WC_Order_Factory::get_order()` siempre construye una instancia **nueva**, leyendo de la base de datos. Como `save_items()` (que persiste los ítems a las tablas reales) corre recién **después** de que `create()` dispare el hook (`abstract-wc-order.php`, `save()`: `create()` en la línea 225, `save_items()` en la 228, ambas dentro de la misma llamada síncrona), esa relectura llegaba antes de que los ítems existieran en la base — el resultado era el mismo pedido vacío que en el flujo 1.

**Conclusión verificada**: la integración vía `woocommerce_new_order` no funcionaba en ninguno de los tres flujos.

## 3. Arquitectura actual (corregida)

Un único motor, `HPG_Gift_Engine` (`PHP/hypestyle-purchase-gift/includes/class-hpg-gift-engine.php`), con dos métodos:

- `evaluate(float $eligible_amount): array` — cálculo puro, no toca ningún `WC_Order`. Usado por el endpoint de preview.
- `apply_to_order(WC_Order $order): array` — muta la orden (agrega/reemplaza/quita líneas de regalo), idempotente, devuelve un resultado estructurado con un código de entre 14 posibles (`gift_applied`, `gift_already_correct`, `gift_replaced`, `gift_removed`, `all_gifts_out_of_stock`, `campaign_inactive`, etc.)

Tres adaptadores delgados llaman al mismo motor, ninguno reimplementa lógica comercial:

1. **Flujo mu-plugin**: llamada explícita `HPG_Gift_Engine::apply_to_order($order)` dentro de `hypestyle_create_order()` (`PHP/hypestyle-api.php`), justo después de agregar productos y descuentos, antes de `calculate_totals()`/`save()`/iniciar el pago. Envuelta en `try/catch`: si el motor devuelve un error bloqueante (`calculation_failed`/`invalid_order`/`invalid_product`), la orden recién creada se borra (`$order->delete(true)`) y no se reduce stock ni se inicia el pago.
2. **Flujos REST (2 y 3)**: como ambos pegan al mismo endpoint WooCommerce `POST /wc/v3/orders`, un único enganche los cubre — `HPG_Order_Integration` (`class-hpg-order-integration.php`) usa el filtro `woocommerce_rest_pre_insert_shop_order_object`. Verificado que este filtro se dispara **dentro de** `prepare_object_for_database()`, **antes** de cualquier `->save()`, y recibe como segundo argumento el objeto `WC_Order` YA poblado (billing, shipping, line_items, shipping_lines, fee_lines, coupon_lines — todo excepto `status`). El callback muta ese mismo objeto directamente y lo retorna — sin relectura, sin `wc_get_order()`. Un error bloqueante se propaga como `WC_REST_Exception`, que el propio `save_object()` de WooCommerce convierte en un `WP_Error` HTTP 500 antes del primer `->save()` — el pedido nunca llega a crearse.
   - El filtro también se dispara en actualizaciones administrativas por REST (`$creating = false`) — el callback lo ignora explícitamente para no reprocesar un pedido ya existente.

## 4. El regalo SÍ vive en el carrito headless

A diferencia del diseño original, el regalo se sincroniza automáticamente como línea real y visible en `CartContext` (Next.js), no solo en la orden de WooCommerce:

- `next-app/hooks/useGiftProgress.ts` llama a `POST /api/gift-progress` (proxy server-side con `HPG_SECRET`, nunca expuesto al navegador) → `POST /wp-json/hypestyle-gift/v1/evaluate` en WordPress.
- El endpoint de preview NUNCA confía en precio/subtotal/monto elegible/nivel/IDs de regalo mandados por el cliente — resuelve cada producto/variación real vía WooCommerce, calcula el precio vigente (`get_price()`, incluye promociones), valida cupones reales, y recién ahí llama a `HPG_Gift_Engine::evaluate()`.
- El hook agrega/reemplaza/quita automáticamente una única línea `isGift:true, locked:true` en el carrito (acción `SET_GIFT`/`CLEAR_GIFT` del reducer) — sin que el usuario tenga que hacer nada. Esa línea no puede editarse (cantidad fija 1, sin botones de +/−/eliminar en `CartDrawer.tsx`), y no cuenta para el badge de cantidad del carrito ni para otras promos (3x2/CAMPEON50 la excluyen explícitamente).
- **Este preview nunca garantiza el regalo.** Al crear la orden, las 3 rutas de Next.js (`create-order`, `create-order-gocuotas`, `create-order-intl`) filtran cualquier línea `isGift===true` del payload antes de enviarlo a WordPress — y aunque no lo hicieran, el backend ignora cualquier dato de regalo que llegara desde el navegador: `HPG_Gift_Engine::apply_to_order()` es la única fuente de verdad, y se re-ejecuta de forma autoritativa en el momento de crear la orden real.

## 5. Estados de campaña

`HPG_Settings::campaign_state`: `disabled` | `shadow` | `test` | `live`.

- **Shadow**: el motor evalúa y loguea (`HPG_Logger`) qué habría pasado en los tres flujos, sin agregar líneas, sin tocar stock, sin mostrarse al público. Pensado para validar en producción antes de exponerlo.
- **Test**: solo aplica a una allowlist de emails (`test_mode_allowlist`). La validación es siempre server-side (el endpoint de preview y el motor chequean el email real, nunca un parámetro público tipo `?test=1`).
- **Live**: pública.

## 6. Metadata

Ítem de regalo (`WC_Order_Item_Product` real, sin tocar `_price`/`_regular_price`/`_sale_price` del producto): `_hypestyle_purchase_gift`, `_hypestyle_gift_campaign_id`, `_hypestyle_gift_campaign_name`, `_hypestyle_gift_level_id`, `_hypestyle_gift_level_name`, `_hypestyle_gift_threshold`, `_hypestyle_gift_eligible_amount`, `_hypestyle_gift_original_product_id`, `_hypestyle_gift_original_variation_id`, `_hypestyle_gift_alternative_used`, `_hypestyle_gift_internal_cost` (solo métricas admin, nunca en emails ni al frontend), `_hypestyle_gift_engine_version`.

Orden: `_hypestyle_purchase_gift_applied`, `_hypestyle_purchase_gift_campaign_id`, `_hypestyle_purchase_gift_level_id`, `_hypestyle_purchase_gift_eligible_amount`, `_hypestyle_purchase_gift_mode`.

## 7. Idempotencia

`apply_to_order()` identifica las líneas de regalo ya presentes por **campaña+nivel** (no solo por `product_id`, porque dos niveles pueden compartir el mismo producto de regalo). Llamarlo dos veces seguidas sobre la misma orden no duplica nada — compara contra lo que ya está y hace el mínimo cambio necesario (no-op / reemplazo / remoción).

## 8. Pendiente antes de producción

- Subir el plugin actualizado (`PHP/hypestyle-purchase-gift/`) y la nueva versión del mu-plugin (`PHP/hypestyle-api.php`) al servidor — no hay staging, esto requiere FTP/File Manager manual.
- Cargar `HPG_SECRET` en Vercel (si no está ya).
- Cargar niveles reales y costos internos desde el panel de admin.
- Validar en Shadow, después en Test, recién después pasar a Live.
- Ejecutar el plan de pruebas manual completo (`docs/purchase-gift-test-plan.md`) contra el sitio real antes de mergear el PR.
