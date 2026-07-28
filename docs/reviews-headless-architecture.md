# Arquitectura — Sistema de reseñas automáticas headless (Hypestyle)

Fecha: 2026-07-28 (revisión 4 — cierre completo: endpoint público, tanda manual, auditoría final. Ver §15.)
Estado: **implementado y probado contra WordPress+WooCommerce 10.7.0 y 10.9.4 reales (local, SQLite), 101/101 checks. Ver reporte de cierre de sesión para el estado exacto de merge/deploy.**
Ver también: `docs/reviews-native-woocommerce-audit.md` (qué reutilizamos del core, incluye §0bis: verificación de que WooCommerce 10.7 ya tiene todo lo necesario), `docs/reviews-api.md` (endpoints en detalle), `docs/reviews-security.md` (amenazas y mitigaciones), `docs/reviews-test-plan.md` (cómo probar sin staging).

## HALLAZGO CRÍTICO (revisión 3) — `status_enviado` NO es una fuente de despacho funcional hoy

Confirmado con runtime real, no con lectura de código: contra una instalación real de WordPress + WooCommerce 10.9.4 (la versión estable actual), tanto `PUT /wp-json/wc/v3/orders/{id} {status:'enviado'}` (rechaza con `400 Parámetro(s) no válido(s): status` — el schema REST valida contra `wc_get_order_statuses()`) como `$order->set_status('enviado')` llamado directo (sin pasar por REST) **fallan**. En el segundo caso, `WC_Abstract_Order::set_status()` (código real, `includes/abstracts/abstract-wc-order.php` línea ~674) **reemplaza silenciosamente cualquier estado no registrado por `pending`** — no lanza error, no preserva el valor, no llega nunca a persistirse como `'enviado'`.

Esto confirma la sospecha original de la auditoría (`docs/reviews-native-woocommerce-audit.md`): `enviado` nunca fue registrado formalmente como estado de WooCommerce. Como consecuencia:

- El listener `HS_Reviews_Dispatcher::maybe_dispatch_on_status_change()` sobre `woocommerce_order_status_changed` **queda inofensivo pero no funcional** — nunca ve `$status_to === 'enviado'` porque WooCommerce nunca deja que ese valor se persista.
- La **fuente confiable hoy es exclusivamente el botón manual** (`manual_button`, `HS_Reviews_Order_Actions` / endpoint `mark-dispatched`) — probada exhaustivamente con runtime real, funciona correctamente e idempotente.
- **No se implementó un workaround silencioso** (tal como se pidió explícitamente): quedan dos caminos, a decidir por el usuario, ninguno aplicado todavía:
  1. Registrar `enviado` como estado real de WooCommerce (`woocommerce_register_shop_order_post_statuses` + filtro `wc_order_statuses`) — cambio de alcance mayor al de este plugin, afecta el admin panel existente completo (dropdown de estado, filtros, conteos), necesita su propia auditoría/aprobación.
  2. Dejar el botón manual como única fuente primaria (ya es así en el código actual) y remover o mantener inerte el listener de `status_enviado` hasta que (1) se resuelva.
- **Implicancia más amplia, fuera del alcance de este plugin, que se reporta pero no se toca**: si `set_status('enviado')` core-level coacciona a `pending` incluso llamado directamente, el resto del admin panel de Hypestyle que asume que las órdenes quedan realmente en `status='enviado'` (badges, filtros, conteos en `/admin/pedidos`) merece revisión — no se modificó nada de eso acá, se señala como hallazgo a confirmar por el equipo.

**Cambios respecto de la v1 de este documento, a pedido del usuario:**
1. Se elimina la actualización de WooCommerce del camino crítico — `hypestyle-reviews` se implementa sobre 10.7.
2. El evento de despacho pasa a ser una acción explícita e idempotente (`mark_dispatched`), no una inferencia pasiva de `_tracking_number`.
3. Moderación siempre pendiente (`comment_approved = 0` forzado), independiente del setting global.
4. Idempotencia y concurrencia del submission reforzada con un lock atómico a nivel de solicitud, no solo a nivel de cupón.
5. Elegibilidad de productos: exclusión explícita de regalos de Purchase Gift, fees/shipping, y deduplicación de variaciones del mismo producto padre.
6. Modelo de estados simplificado y corregido (sin `coupon_issued` como estado).
7. Autenticación reforzada: secreto server-side entre Next.js y WordPress, además del token.
8. Email: no se asume que Brevo esté conectado a `wp_mail()` — se audita antes de activar envíos reales.

---

## 1. WooCommerce y la versión requerida

**No hace falta actualizar WooCommerce para implementar esta feature.** Verificación completa en `docs/reviews-native-woocommerce-audit.md` §0bis: Action Scheduler (3.9.3, bundleado desde WC 3.x), `WC_Email`, `WC_Coupon`, y el sistema nativo de reseñas (`WC_Comments`, `wp_insert_comment` + `comment_type=review`, meta `rating`/`verified`, y la función pública `wc_customer_bought_product()`) ya están disponibles en la versión actual de producción, **10.7**. Lo único que se agregó en 10.8 (`Internal\OrderReviews\Endpoint`, `SubmissionHandler`, `Scheduler` nativo, `ItemEligibility`) **no se usa** — la arquitectura de abajo construye su propio equivalente de cada una de esas piezas.

La actualización a 10.9.4 queda como proyecto de infraestructura separado, sin dependencia ni fecha atada a `hypestyle-reviews`. No se agrega ese riesgo (cambio de infraestructura sin staging) a este trabajo.

## 2. El evento de despacho — acción explícita e idempotente

### 2.1 Problema con la versión anterior de este documento

La v1 proponía inferir "despacho" pasivamente de la primera aparición de `_tracking_number`. El usuario corrigió esto: **generar una guía de Andreani no siempre significa que el paquete salió** — puede cargarse/generarse antes del retiro real, o incluso quedar huérfana si el envío se cancela en el portal de Andreani sin que se refleje en WooCommerce. Usar esa señal como única fuente de verdad heredaría la misma ambigüedad que ya tiene el sistema de tracking actual.

### 2.2 Diseño: `HS_Reviews_Dispatcher::mark_dispatched()`

Se centraliza el evento de despacho en **un único método idempotente**, que es la única puerta de entrada posible al estado "despachado" — nadie más escribe `_hs_dispatched_at` directamente.

```php
/**
 * Marca una orden como despachada. Idempotente: solo la primera llamada
 * tiene efecto: las siguientes son no-op y devuelven false.
 *
 * @param WC_Order $order  La orden.
 * @param string   $source Origen del evento: 'manual_button' | 'status_enviado' | 'tracking_number' | otro que se registre.
 * @return bool True si esta llamada fue la que efectivamente marcó el despacho, false si ya estaba marcada.
 */
public static function mark_dispatched( WC_Order $order, string $source ): bool
```

Comportamiento exacto:

1. **Lock corto** (`wp_cache_add()` con expiración de pocos segundos, keyed por `order_id`) alrededor de todo el método, para que dos llamadas casi simultáneas (ej. el cron de tracking y un click manual al mismo tiempo) no pasen ambas el chequeo de idempotencia antes de que la primera termine de escribir.
2. Si `$order->get_meta( '_hs_dispatched_at' )` ya tiene valor → **no hace nada**, devuelve `false`. Este es el único chequeo de idempotencia que importa; todo lo demás (guardas de estado, etc.) es adicional.
3. Si no está marcada: `update_meta_data( '_hs_dispatched_at', time() )` + `update_meta_data( '_hs_dispatched_source', $source )` + `save()`.
4. Dispara `do_action( 'hs_order_dispatched', $order->get_id(), $source )`.
5. **`HS_Reviews_Scheduler`** escucha `hs_order_dispatched` y programa **una única** solicitud de reseña (crea la fila en `wp_hs_review_requests` — que además tiene una restricción `UNIQUE` sobre `order_id`, ver §6, como segunda capa de defensa independiente del lock).
6. Devuelve `true`.

**Esto reemplaza por completo el diseño anterior.** No hay una "lógica de tracking" y una "lógica de estado" corriendo en paralelo — todos los caminos de entrada convergen en el mismo método:

| Origen (`$source`) | Cuándo se llama | Activo por defecto |
|---|---|---|
| `status_enviado` | Cuando la orden transiciona a `status = 'enviado'` vía el flujo administrativo actual (dropdown en `/admin/pedidos` → `set-status` → WooCommerce dispara `woocommerce_order_status_changed`) | **Sí** — es el disparador principal, alineado con el flujo que el equipo ya usa hoy para decir "esto se despachó" |
| `manual_button` | Botón dedicado "Marcar como despachado" en el detalle de la orden (§2.3) | Sí, siempre disponible como acción explícita, independiente del estado |
| `tracking_number` | Primera aparición de `_tracking_number` (auto-captura, sync manual/batch, `set-tracking`) | **Configurable, apagado por defecto** (`hs_reviews_dispatch_on_tracking = no` en `wp_options`) — se puede prender como automatización/fallback si en el futuro se confía más en la señal de Andreani, pero no reemplaza a `status_enviado` |

Los tres casos llaman exactamente al mismo `mark_dispatched()` — no hay una segunda implementación paralela para "cuando aparece el tracking". Esto es explícito porque fue el punto que el usuario corrigió: la aparición del tracking es una fuente de entrada más al mismo método, nunca una lógica distinta.

### 2.3 Acción manual + corrección/cancelación

- **Botón "Marcar como despachado"** en `next-app/app/admin/pedidos/[id]/page.tsx`, junto a los botones existentes de tracking — llama a `POST /wp-json/hypestyle-reviews/v1/reviews/mark-dispatched/{order_id}` → `mark_dispatched( $order, 'manual_button' )`. Disponible sin importar el `status` actual de la orden (un admin puede despachar algo que todavía figura `processing` si así lo decide operativamente).
- **Deshacer/corregir un despacho marcado por error**: `POST /wp-json/hypestyle-reviews/v1/reviews/undo-dispatch/{order_id}`. Solo permitido **mientras la solicitud siga en estado `scheduled`** (la acción de Action Scheduler todavía no disparó el email): borra `_hs_dispatched_at`/`_hs_dispatched_source`, cancela la acción programada (`as_unschedule_action`), y borra la fila de `wp_hs_review_requests` (no tiene sentido conservar una fila "cancelada por error de carga" — es distinto de una cancelación de negocio real, que si se conserva como `status=cancelled`, ver §6). Si la solicitud ya pasó a `sent`, `undo-dispatch` devuelve `409` — para ese caso se usa la cancelación normal de la solicitud (`POST /review-requests/{id}/cancel`, que sí preserva el registro histórico).
- Ambos botones (marcar / deshacer) se muestran condicionalmente en el admin según el estado actual (`_hs_dispatched_at` existe o no, y si la solicitud ya se envió).

## 3. Qué reutilizamos del core vs. qué construimos

| Pieza | Origen | Notas |
|---|---|---|
| Action Scheduler (scheduling/cancelación) | Core WooCommerce (disponible en 10.7) | Se usa como infraestructura, con lógica de programación 100% propia (`HS_Reviews_Scheduler`), no la clase `Internal\OrderReviews\Scheduler` de 10.8+ |
| `WC_Email` | Core WooCommerce (disponible en 10.7) | Se extiende para `WC_Email_Hypestyle_Review_Request` y `WC_Email_Hypestyle_Review_Confirmation` |
| `WC_Coupon` | Core WooCommerce (disponible en 10.7) | Creación programática, propia |
| Creación de reseña (`wp_insert_comment` + `comment_type=review` + meta) | Patrón nativo de WooCommerce, disponible desde siempre (no es exclusivo de 10.8) | Reutilizado 1:1, con meta adicional propia (§7) |
| `wc_customer_bought_product()` | Core WooCommerce (disponible en 10.7) | Disponible como respaldo de verificación, aunque en la práctica la verificación real viene de que el token ya prueba la relación orden↔comprador — no hace falta re-chequear compra por email |
| Endpoint / SubmissionHandler / ItemEligibility nativos de 10.8 | **No se usan** | Reemplazados por REST propio + `HS_Reviews_Eligibility` propia |
| Token = order_key nativo | **No se usa** | Token propio, hasheado, con expiración |
| Feature flag `customer_review_request` | **No se activa** | Irrelevante — no se depende de ninguna clase que dicho flag habilite |

## 4. Arquitectura general

```
┌──────────────┐   token en URL    ┌──────────────────────┐  HS_REVIEWS_SECRET   ┌───────────────────────────────┐
│   Navegador   │ ────────────────► │   Next.js (server)    │ ───────────────────► │   WordPress + WooCommerce      │
│  del cliente  │                   │                        │   + token            │                                │
│               │ ◄──────────────── │  app/review/[token]    │ ◄─────────────────── │  plugin hypestyle-reviews      │
└──────────────┘                   │  app/api/reviews/*     │                       │                                │
                                    └──────────────────────┘                       │  - HS_Reviews_Dispatcher       │
                                                                                     │    ::mark_dispatched()         │
                                                                                     │  - HS_Reviews_Scheduler         │
                                                                                     │    (Action Scheduler)          │
                                                                                     │  - HS_Reviews_Tokens            │
                                                                                     │  - HS_Reviews_Eligibility       │
                                                                                     │  - HS_Reviews_Submission        │
                                                                                     │    (lock atómico, §8)          │
                                                                                     │  - HS_Reviews_Coupons           │
                                                                                     │  - WC_Email_Hypestyle_*         │
                                                                                     │  - Admin: Solicitudes de        │
                                                                                     │    reseñas + botón "Marcar      │
                                                                                     │    como despachado"            │
                                                                                     │  - Moderación: Productos →      │
                                                                                     │    Reseñas (nativo)             │
                                                                                     └───────────────────────────────┘
```

**Cambio clave respecto de la v1:** el navegador **nunca** llama directamente a `hypestyle-reviews/v1/reviews/*`. Solo habla con las rutas de Next.js (`/api/reviews/[token]`, `/api/reviews/[token]/submit`), que son las únicas que conocen `HS_REVIEWS_SECRET` y lo agregan al llamar a WordPress server-side. Detalle completo en `docs/reviews-security.md` §5-6 y `docs/reviews-api.md` §0.

Principio rector (sin cambios): **el frontend nunca decide nada de negocio**. Las decisiones (elegibilidad, verificación, cupón, si ya se usó el beneficio) viven 100% en PHP.

### Componentes nuevos

**Backend — plugin `hypestyle-reviews`** (plugin normal activable/desactivable desde wp-admin, bajo `PHP/hypestyle-reviews/`, espejado a `wp-content/plugins/` — no mu-plugin, ver Riesgos §11):

- `hypestyle-reviews.php` — bootstrap, versión, activación (`dbDelta` de la tabla).
- `includes/class-hs-reviews-dispatcher.php` — `mark_dispatched()` (§2.2) + hooks de entrada (`status_enviado`, `tracking_number` configurable).
- `includes/class-hs-reviews-scheduler.php` — escucha `hs_order_dispatched`, programa/cancela vía Action Scheduler.
- `includes/class-hs-reviews-tokens.php` — genera/valida/rota tokens.
- `includes/class-hs-reviews-rest.php` — registra los endpoints `hypestyle-reviews/v1/reviews/*`, valida `HS_REVIEWS_SECRET` en cada request.
- `includes/class-hs-reviews-eligibility.php` — filtra ítems elegibles: excluye reembolsos totales, regalos de Purchase Gift, fees/shipping, y deduplica variaciones del mismo padre (§7).
- `includes/class-hs-reviews-submission.php` — lock atómico, valida, crea reseñas + cupón (§8).
- `includes/class-hs-reviews-coupons.php` — genera/recupera el cupón único.
- `includes/emails/class-wc-email-hypestyle-review-request.php` — extiende `WC_Email`.
- `includes/emails/class-wc-email-hypestyle-review-confirmation.php` — extiende `WC_Email`.
- `includes/admin/class-hs-reviews-admin-page.php` — pantalla WooCommerce → Solicitudes de reseñas.
- `includes/admin/class-hs-reviews-order-actions.php` — botones "Marcar como despachado" / "Deshacer despacho" en el detalle de orden (vía REST, consumidos desde `/admin/pedidos`).
- `includes/class-hs-reviews-install.php` — crea `wp_hs_review_requests` (con `UNIQUE(order_id)`), versionado de schema.

**Frontend — Next.js:**

- `app/review/[token]/page.tsx` — server component.
- `app/review/[token]/ReviewClient.tsx` — client component.
- `app/api/reviews/[token]/route.ts` — proxy, agrega `HS_REVIEWS_SECRET` server-side.
- `app/api/reviews/[token]/submit/route.ts` — ídem.
- `app/admin/pedidos/[id]/page.tsx` — se agregan los dos botones nuevos (marcar/deshacer despacho) y, opcionalmente, el estado de la solicitud de reseña asociada.

## 5. Flujo de tokens (resumen — detalle completo en `docs/reviews-security.md`)

Sin cambios de fondo respecto de la v1 (generación con `random_bytes(32)`, solo se persiste el hash, expiración configurable, un solo uso efectivo), con dos adiciones:

- El token viaja siempre acompañado del `HS_REVIEWS_SECRET` en la llamada Next.js→WordPress — el token por sí solo ya no es suficiente para que WordPress responda (defensa en profundidad, §7 de seguridad).
- El reenvío (`resend`) **rota el token de la misma fila** (`UPDATE ... SET token_hash=?, expires_at=?`), no crea una fila nueva — consistente con la restricción `UNIQUE(order_id)` del modelo de datos (§6).

## 6. Modelo de datos (resumen — detalle completo en `docs/reviews-api.md`)

**Meta en la orden:**

- `_hs_dispatched_at` — timestamp del despacho, escrito únicamente por `mark_dispatched()`.
- `_hs_dispatched_source` — `manual_button` | `status_enviado` | `tracking_number`.
- `_hs_review_coupon_id` — ID del cupón generado (evita generar dos).

**Tabla `wp_hs_review_requests` — corregida:**

- **`UNIQUE KEY (order_id)`** — una sola solicitud lógica por orden, de por vida. El reenvío rota el token de esa misma fila.
- `status`: solo `scheduled | sent | responded | failed | cancelled` como estados "públicos" (visibles en el panel admin). Existe un estado transitorio interno `processing`, usado únicamente durante la ventana del lock atómico del submission (§8) — nunca se expone en el panel como un estado permanente; una fila que quedara en `processing` más de unos segundos indica un fallo a investigar (ver test plan).
- **`coupon_id` es una columna, no un estado** — se corrige el error de diseño de la v1 (`coupon_issued` ya no existe como valor de `status`). Una solicitud `responded` con `coupon_id IS NOT NULL` es "reseña enviada y cupón entregado"; `responded` con `coupon_id IS NULL` sería el caso (hoy no esperado, pero posible si se desactiva el beneficio) de reseña sin beneficio.
- Timestamps independientes: `scheduled_for`, `sent_at`, `opened_at`, `responded_at`, `expires_at`, `used_at`. `responded_at` marca cuándo el cliente completó el envío (evento de negocio); `used_at` marca cuándo el token dejó de ser válido para reuso (evento de seguridad) — en la práctica ocurren en el mismo request, pero son conceptualmente distintos y se guardan por separado por si en el futuro un envío parcial deja el token vivo (ver `docs/reviews-api.md` sobre reintentos).

**Reseñas (`wp_comments` + `wp_commentmeta`) — meta agregada respecto de la v1:**

- `_hs_incentivized_review = yes` — marca explícita de que esta reseña fue generada por el flujo incentivado (para poder mostrar a futuro una etiqueta "Reseña incentivada" sin ocultar que hubo beneficio, ver punto 3 de la corrección del usuario).
- `_hs_review_request_id`, `_hs_review_order_id`, `_hs_review_order_item_id` — trazabilidad completa hacia la solicitud/orden/línea de origen.
- **`_review_variation_id`** — mismo nombre de meta que usa el core nativo de WooCommerce 10.8+ (`Internal\OrderReviews`) para la variación específica reseñada. Se adopta el mismo nombre **a propósito**, no uno propio, para mantener compatibilidad si en el futuro se actualiza WooCommerce y se activa o inspecciona con herramientas nativas — y para evitar exactamente el bug encontrado en la propia auditoría del core (#66886/#66897: reseñas sin este meta rompían una guarda de moderación posterior a 10.9.0).

## 7. Elegibilidad de productos — reglas explícitas

`HS_Reviews_Eligibility::get_reviewable_items( WC_Order $order )` excluye, en este orden:

1. **Cualquier línea que no sea `WC_Order_Item_Product`** — fees (`WC_Order_Item_Fee`) y shipping (`WC_Order_Item_Shipping`) quedan fuera por construcción, no por un chequeo adicional.
2. **Ítems totalmente reembolsados** — mismo criterio que `ItemEligibility` del core (comparación de cantidad reembolsada vs. comprada por línea); los parcialmente reembolsados siguen siendo elegibles.
3. **Regalos de Purchase Gift** — líneas con meta `_hypestyle_purchase_gift = 'yes'` (confirmado en `PHP/hypestyle-purchase-gift/includes/class-hpg-gift-engine.php:24`, constante `HPG_Gift_Engine::META_IS_GIFT`; **nota de corrección**: el usuario mencionó `_hpg_is_gift` en su mensaje, pero el meta key real en el código es `_hypestyle_purchase_gift` — se usa el valor real verificado, no el asumido).
4. **Productos eliminados o no reseñables** — `$item->get_product()` devuelve `false`/no es `WC_Product`, o el producto no es público (`publish`).

### Deduplicación de variaciones del mismo producto padre

Si una orden contiene dos o más líneas que resuelven al mismo `product_id` padre (ej. dos variaciones de talle del mismo jersey), `get_reviewable_items()` **devuelve una sola entrada reseñable por producto padre**, no una por línea. Regla de selección cuando hay más de una candidata:

1. Se prioriza la primera línea, en orden de aparición en la orden, que **no** tenga ya una reseña previa de este cliente para ese producto padre.
2. Se guarda `_review_variation_id` con el ID de la variación específica de la línea elegida — así la reseña sigue siendo trazable a qué variación puntual se compró, aunque públicamente se muestre una sola reseña del producto padre.
3. Si el cliente ya reseñó el producto padre en una solicitud anterior de **otra** orden, esta nueva compra igual genera una entrada reseñable nueva (una reseña por producto **y compra**, tal como pide el brief) — la deduplicación es solo dentro de la misma orden/solicitud, no contra el historial completo del cliente.

Esto es una decisión de producto explícita, documentada acá por si en el futuro se quiere permitir reseñas separadas por variación (razón para hacerlo distinto: por ejemplo, si el catálogo empieza a vender variaciones con calidad/proveedor distintos bajo el mismo padre) — hoy no hay ningún caso así identificado en el catálogo de Hypestyle.

## 8. Moderación obligatoria y entrega del beneficio

- **Todas** las reseñas creadas por `hypestyle-reviews` se insertan con `'comment_approved' => 0`, **hardcodeado**, sin leer `get_option('comment_moderation')`. El comportamiento no depende de un setting global que un admin podría cambiar sin saber que afecta este flujo — es una decisión explícita del plugin, consistente con el brief ("las reseñas deben quedar pendientes de moderación").
- El cupón se genera y entrega **al momento de la submission válida**, no al momento de la aprobación — independientemente del rating y de que la reseña quede pendiente. Esto ya estaba en el brief original y se mantiene sin cambios; lo que cambia es que ahora la moderación pendiente está garantizada por código, no por configuración.

## 9. Concurrencia e idempotencia del submission — lock atómico

### 9.1 Problema con la v1

La protección de la v1 solo cubría el cupón (`if ($order->get_meta('_hs_review_coupon_id')) return;`). El usuario señaló correctamente que dos `POST /submit` simultáneos con el mismo token válido podrían ambos pasar ese chequeo (ninguno ve todavía el meta del otro) y crear **reseñas duplicadas** antes de que cualquiera llegue a marcar `used_at`.

### 9.2 Diseño: reclamo atómico a nivel de solicitud, con recuperación por etapa

Corrección final pedida por el usuario, ya reflejada en el código (`HS_Reviews_Submission::handle_submit()`): **un fallo parcial nunca vuelve el estado a `'sent'` si ya existe al menos una reseña creada** — eso permitiría que un reintento se tratara como una submission completamente nueva. `'sent'` es exclusivamente para "este intento no dejó ningún rastro". Si hay progreso real pero el proceso no terminó, el estado final es `'failed'` — recuperable, pero un reintento solo completa lo que falta, nunca recrea lo que ya existe.

Flujo exacto:

1. **Buscar el token**: re-hashear, `SELECT` en `wp_hs_review_requests` por `token_hash`. Si no existe, o expiró estando en `sent`/`failed` → 404 genérico.
2. **Reclamar la solicitud con una actualización condicional** (compare-and-swap a nivel SQL, aprovechando que MySQL/InnoDB serializa `UPDATE`s sobre la misma fila):
   ```sql
   UPDATE wp_hs_review_requests
   SET status = 'processing', updated_at = NOW()
   WHERE id = %d AND status IN ('sent','failed') AND used_at IS NULL
   ```
   Nótese `status IN ('sent','failed')`, no solo `'sent'` — un reintento sobre una solicitud `failed` (con progreso parcial ya guardado) debe poder reclamar el lock de nuevo. Solo **una** de N llamadas concurrentes logra afectar 1 fila.
3. Si el `UPDATE` afectó 0 filas: releer el estado actual.
   - `processing` → la otra request está en curso ahora mismo → `409` ("ya estamos procesando tu solicitud, reintentá en unos segundos" — el cliente reintenta, no es un error terminal).
   - `responded` → **devolver el resultado ya existente**, reconstruido desde los comentarios + el cupón ya guardados (nunca se reprocesa) — respuesta idempotente, código `200`.
   - `cancelled`/expirado/no encontrado → 404 genérico.
4. Con el lock adquirido (`status = 'processing'`), revalidar la orden vigente (no cancelada/reembolsada totalmente) e ítems (vía `HS_Reviews_Eligibility`).
5. Por cada fila del payload: **comprobar si ya existe una reseña para `(request_id, order_item_id)`** (meta `_hs_review_request_id` + `_hs_review_order_item_id`) antes de crear — crear únicamente las que faltan. Cubre el reintento parcial (la request anterior creó 1 de 2 reseñas y falló antes de terminar).
6. **Si ninguna reseña existe** (ni nueva ni de un intento anterior) — todas las filas inválidas, o el cliente no marcó ningún rating: este es el **único** camino de vuelta a `'sent'` (`finish_with_no_progress()`), porque es un no-op real y seguro de reintentar desde cero. Devuelve `422`.
7. Si al menos una reseña existe: **crear o recuperar** el cupón (`_hs_review_coupon_id` en la orden, chequeado primero — mismo criterio que la v1, ahora ejecutado dentro de la ventana protegida por el lock).
   - Si la creación del cupón lanza una excepción: **NO se revierte a `sent`** — la(s) reseña(s) ya existen y son progreso real. Se marca `status = 'failed'`, `fail_reason = 'coupon_creation_failed'`, y se devuelve `500` con un mensaje que deja claro que la reseña sí se guardó. Un reintento posterior reclama desde `'failed'` (paso 2), encuentra la reseña vía el chequeo del paso 5 (no la duplica) y solo reintenta el cupón.
8. Si el cupón se obtuvo (o no aplica porque el beneficio está desactivado): marcar `responded_at = NOW()`, `used_at = NOW()`, `status = 'responded'`, guardar `coupon_id` si corresponde, disparar el email de confirmación (best-effort — si falla, se loguea pero no revierte nada, la reseña y el cupón ya están guardados).
9. Cualquier excepción no controlada en cualquier punto del proceso: se consulta cuántas reseñas existen para `request_id` en ese momento. **Si hay ≥1, el estado final es `'failed'`** (progreso preservado); **solo si hay 0** el estado vuelve a `'sent'`. Nunca queda una fila permanentemente en `'processing'` — el `try/catch/finally` siempre resuelve a uno de los tres estados terminales (`responded`/`failed`/`sent`).

Esto cubre exactamente lo que pidió el usuario: la idempotencia cubre **reseñas y cupón** como unidad, el reclamo es a nivel de toda la solicitud (una fila, un `UPDATE` condicional), y un fallo parcial nunca se disfraza de "solicitud nueva".

## 10. Archivos que se crearían

Sin cambios de fondo respecto de la v1, con las siguientes adiciones:

- `includes/admin/class-hs-reviews-order-actions.php` (nuevo — botones marcar/deshacer despacho)
- `includes/class-hs-reviews-eligibility.php` (ya estaba prevista, ahora con la lógica de dedup de variaciones y exclusión de Purchase Gift explícita)

Frontend: se agrega la integración en `app/admin/pedidos/[id]/page.tsx` (botones nuevos), sin archivos nuevos ahí (se extiende el archivo existente).

## 11. Archivos existentes que se modificarían

- **`hypestyle-launchpad/next-app/app/api/admin/set-status/route.ts`** — sin cambios de lógica propia (sigue siendo un `PUT wc/v3/orders/{id}`), pero es el punto donde, del lado de WordPress, `woocommerce_order_status_changed` hacia `enviado` dispara `mark_dispatched( $order, 'status_enviado' )`. No se modifica este archivo de Next.js — el hook vive enteramente en PHP, escuchando la transición de estado que este endpoint ya provoca.
- `PHP/hypestyle-tracking-fix.php` — se agrega la llamada opcional (config apagada por defecto) a `mark_dispatched( $order, 'tracking_number' )` en los puntos donde `_tracking_number` se escribe por primera vez.
- `PHP/hypestyle-api.php` — ídem en `hype_set_tracking()`, y bump de versión del header por convención del proyecto.
- `PHP/README.md` — documentar el nuevo plugin.
- `hypestyle-launchpad/next-app/app/admin/pedidos/[id]/page.tsx` — botones "Marcar como despachado" / "Deshacer despacho", y opcionalmente el estado de la solicitud de reseña asociada a la orden.

**No se toca:** el flujo de Andreani/tracking existente (el nuevo código solo agrega un observador opcional), el flujo de emails de Brevo existente (sigue siendo un sistema paralelo), el plugin `hype-wally-coupons` (se verificó que usa un prefijo/mecanismo de cupón distinto — a confirmar en el detalle de implementación, no bloqueante para esta auditoría).

## 12. Riesgos (actualizados)

1. ~~Actualización de WooCommerce sin staging~~ — **eliminado como riesgo de esta feature** (§1).
2. **La señal principal de despacho (`status_enviado`) sigue siendo, en el fondo, una acción manual** — el riesgo real no es técnico sino operativo: si el equipo no usa el botón/dropdown de forma consistente, la reseña no se dispara. Mitigación: el botón dedicado "Marcar como despachado" es más explícito y menos ambiguo que el dropdown de estado genérico, y queda como automatización opcional la señal de tracking.
3. **`processing` colgado por un fallo no manejado** — mitigado por el `try/catch`+`finally` explícito en el diseño (§9.2 punto 9), pero se agrega al plan de pruebas un chequeo de "no debe haber filas en `processing` por más de unos segundos" (ver `docs/reviews-test-plan.md`).
4. **Plugin normal vs. mu-plugin**: se mantiene la recomendación de plugin normal activable/desactivable (no mu-plugin), para poder apagarlo desde wp-admin sin acceso a archivos del servidor.
5. **Colisión con `hype-wally-coupons`**: verificar formato/prefijo de código antes de implementar, para que un cliente no vea dos sistemas de cupones con apariencia distinta y se confunda.
6. **`wp_mail()` / entrega de email no confirmada** — no se asume que Brevo esté conectado como transporte de `wp_mail()` solo porque Next.js lo usa vía API HTTP para otros flujos (son sistemas independientes). Se audita explícitamente y se hace un test de entrega antes de activar solicitudes reales (§13, y detalle en `docs/reviews-test-plan.md`).
7. **Volumen y reintentos de Action Scheduler** — sin cambios respecto de la v1: se recomienda un chequeo periódico que alerte si hay solicitudes `scheduled` vencidas sin pasar a `sent`, o `processing` vencidas sin resolver.

## 13. Plan de despliegue (actualizado)

1. Aprobar esta revisión del documento + los 3 restantes (`reviews-api.md`, `reviews-security.md`, `reviews-test-plan.md`).
2. **Auditar `wp_mail()` en el hosting actual** (¿hay un plugin SMTP conectado a Brevo u otro proveedor, o sale por el mail default de Hostinger con riesgo de spam/bloqueo?) — bloqueante antes de activar cualquier envío real, no bloqueante para desarrollar el resto del plugin.
3. Implementar `hypestyle-reviews` en una rama (`feature/reviews-automation`), **sobre WooCommerce 10.7, sin ninguna actualización de infraestructura**.
4. Flag propio `hs_reviews_enabled = no` por defecto en `wp_options` — nada corre automáticamente hasta activarlo.
5. Pruebas locales (PHPUnit) + pruebas de integración manuales contra producción con `hs_reviews_enabled` activado **solo para 1-2 órdenes de prueba** (allowlist de `order_id`), **sin envío de emails reales** hasta confirmar el punto 2.
6. Una vez confirmada la entrega de email real (test dedicado, ver plan de pruebas), activar el envío real para esas mismas órdenes de prueba.
7. Mostrar el diff completo + resultados de las pruebas locales al usuario **antes de mergear** — no hay merge ni deploy a producción sin esa revisión explícita.
8. Recién entonces: PR a `main`, deploy vía el flujo normal de Vercel (frontend) + subida manual del plugin a `wp-content/plugins/` (backend).
9. Activación gradual en producción con delay conservador y cupón inicialmente desactivado, igual que proponía la v1 (§7-8 de la v1, sin cambios en este punto).

## 14. Plan de rollback

Sin cambios de fondo respecto de la v1, salvo que **se elimina la sección de rollback de WooCommerce** (ya no aplica, no se toca la versión de WooCommerce). Rollback de plugin (desactivar desde wp-admin), de flag interno (`hs_reviews_enabled=no` + `as_unschedule_all_actions`), y de cupón individual (desactivar desde WooCommerce → Cupones) se mantienen sin cambios. Detalle completo actualizado en `NUEVAS IMPLEMENTACIONES/REVIEWS/release/ROLLBACK.md`.

## 15. Actualización 1.1.0 — endpoint público, tanda manual, fix de scheduling

Cierre del sistema completo (backend + frontend público + dashboard), auditado de punta a punta y mergeado a `main`. Cambios de arquitectura respecto de la revisión 3:

- **Experiencia pública** (`next-app/app/reviews`, sección de home, drawer/tab lateral) se agrega como una capa de solo lectura sobre el mismo dato: consume `GET /wp-json/hypestyle/v1/public-reviews` (nuevo, `HS_Reviews_Public_Rest`, sin secreto, namespace público compartido con `hypestyle-api.php` sin tocar ese archivo — ver `docs/reviews-api.md` §2ter). No introduce ningún dato ni tabla nueva: lee directamente `wp_comments`/`wp_commentmeta` con los mismos criterios que Productos → Reseñas nativo (aprobada + rating válido + producto vigente).
- **Primera tanda controlada** (`docs/reviews-api.md` §2bis): la única vía para arrancar el sistema con órdenes históricas sin esperar a que se despachen órdenes nuevas. Reusa `HS_Reviews_Dispatcher::mark_dispatched()` + la lógica de scheduling existente — cero lógica de despacho duplicada.
- **Fix de arquitectura real** (no cosmético): la creación de la fila de solicitud se desacopló del evento `hs_order_dispatched` (que solo dispara una vez por orden). Antes, una orden despachada mientras el modo test bloqueaba la autorización quedaba **permanentemente** sin fila, sin forma de recuperarla. Ahora `HS_Reviews_Scheduler::maybe_schedule_for_order()` es invocable independientemente del evento, y se llama explícitamente después de cada acción de despacho (botón individual, tanda manual) — permite recuperar órdenes bloqueadas por modo test simplemente repitiendo la acción tras autorizarlas. Encontrado y corregido durante la auditoría final, con test de integración real que reproduce el escenario exacto (ver `PHP/hypestyle-reviews/CHANGELOG.md` 1.1.0).
- Vencimiento del cupón por defecto: 30 días (antes 60). Copy por defecto del email actualizado para dejar explícito que el beneficio no depende de la calificación.

Estado tras esta revisión: **auditado con 101/101 checks de integración real contra WooCommerce 10.7.0 exacto (ver `PHP/hypestyle-reviews/CHANGELOG.md`), código en PR #265, demo mode/emails/cupón general todavía apagados por defecto.** Ver el reporte de cierre de la sesión para el estado exacto de merge/deploy y qué sigue pendiente de autorización explícita antes de activar para clientes reales.
