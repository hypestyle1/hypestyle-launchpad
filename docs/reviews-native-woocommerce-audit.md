# Auditoría: Customer Review Request nativo de WooCommerce (10.8 / 10.9)

Fecha: 2026-07-26
Alcance: qué hace la feature nativa, cómo funciona técnicamente, y qué partes son o no son reutilizables para una tienda 100% headless (Next.js + WooCommerce como backend puro).

Fuentes verificadas directamente contra el repo público `woocommerce/woocommerce` en GitHub (PRs reales, no resúmenes de terceros): #64395, #64483, #64525/64526, #64527, #64528/64529, #64531, #64701, #64756, #64805, #64832, #64840, #64844/#64845, #64867, y el archivo actual `plugins/woocommerce/includes/emails/class-wc-email-customer-review-request.php`.

---

## 0. Versión estable actual (comprobada, no asumida)

- **WooCommerce 10.9.4** es la versión estable al 2026-07-26 (release 2026-07-07). WooCommerce 11.0 está en beta con release final planificado para 2026-07-28.
- La tienda Hypestyle está en **10.7** (`WC tested up to: 10.7` declarado en `PHP/hype-wally-coupons/hype-wally-coupons.php` y `PHP/hypestyle-purchase-gift/hypestyle-purchase-gift.php`).
- **Customer Review Request se agregó en 10.8.0** (mayo 2026) y sigue existiendo en 10.9.x sin cambios estructurales relevantes detectados en cambios posteriores (solo un fix de moderación para reseñas creadas antes de 10.9.0, ver §8).
- **Conclusión revisada tras feedback del usuario:** subir a 10.8+ solo da acceso a las clases `Internal\OrderReviews\*` (`Endpoint`, `SubmissionHandler`, `Scheduler` nativo, `ItemEligibility`), y la arquitectura final (§9-10 de este documento, y `docs/reviews-headless-architecture.md`) **no usa ninguna de esas clases** — construye las suyas propias. Por lo tanto **la actualización de WooCommerce deja de ser un requisito de esta feature** (ver §0bis, verificación explícita de que todo lo que sí se reutiliza ya está disponible en 10.7). Queda como proyecto de infraestructura separado, a evaluar y aprobar aparte, sin fecha atada a `hypestyle-reviews`.

Fuentes:
- [WooCommerce 10.8.0 Release Notes](https://developer.woocommerce.com/2026/05/26/woocommerce-10-8-0-release/)
- [WooCommerce 11.0 Developer Preview](https://thewpclan.com/woocommerce-11-developer-preview/)

## 0bis. Verificación explícita: ¿hay algo indispensable que falte en 10.7?

Pedido del usuario: confirmar si existe alguna llamada o clase indispensable para `hypestyle-reviews` que no esté disponible en WooCommerce 10.7. Se verificó contra el tag real `10.7.0` del repo (`plugins/woocommerce/...@10.7.0`), no por inferencia:

| Dependencia que usa `hypestyle-reviews` | ¿Existe en 10.7.0? | Evidencia |
|---|---|---|
| Action Scheduler (`as_schedule_single_action`, `as_unschedule_action`, etc.) | **Sí** | Bundleado como `woocommerce/action-scheduler: 3.9.3` en `composer.json` del tag 10.7.0 — está en WooCommerce desde la serie 3.x (2017), no es una adición de 10.8. |
| `WC_Email` (clase base para emails custom) | **Sí** | `plugins/woocommerce/includes/emails/class-wc-email.php` existe en el tag 10.7.0, es la misma clase base desde WC 2.x. |
| `WC_Coupon` / `wc_create_new_coupon`-equivalente (crear cupones programáticos) | **Sí** | `plugins/woocommerce/includes/class-wc-coupon.php` existe en 10.7.0, API CRUD estable desde hace años. |
| Sistema de reseñas nativo (`wp_insert_comment` + `comment_type=review` + meta `rating`/`verified`) | **Sí, y más completo de lo pensado inicialmente** | `plugins/woocommerce/includes/class-wc-comments.php` en 10.7.0 ya incluye `WC_Comments::add_comment_rating()` (mismo patrón `add_comment_meta($id,'rating',...)`), `validate_product_review_verified_owners()`, y la función pública **`wc_customer_bought_product( $email, $user_id, $product_id )`** — que ni siquiera necesitamos reimplementar para chequear "compra verificada", ya existe en el core hace años. |
| `Internal\OrderReviews\*` (Endpoint, SubmissionHandler, Scheduler nativo, ItemEligibility, StarRating) — clases agregadas en 10.8 | No están en 10.7.0 | Pero **`hypestyle-reviews` no las usa** — la arquitectura (§9-10) las reemplaza por completo con código propio. Su ausencia en 10.7 es irrelevante para esta implementación. |

**Conclusión: no existe ninguna llamada o clase indispensable para `hypestyle-reviews` que falte en WooCommerce 10.7.** La actualización a 10.9.4 se elimina del camino crítico de esta feature. Se mantiene como recomendación a futuro (mejoras de HPOS, fixes de seguridad acumulados desde 10.7, y eventualmente poder activar el feature flag nativo si algún día se decide migrar a él), pero **no bloquea ni se agrupa con el despliegue de `hypestyle-reviews`**.

---

## 1. ¿Cómo funciona en 10.8/10.9?

Es un email transaccional opcional que invita al cliente a reseñar los productos de una orden, con una página de destino tokenizada donde deja estrellas + texto. Al enviar, WooCommerce crea comentarios de tipo `review` nativos (los mismos que alimentan Productos → Reseñas), marcados como compra verificada.

Flujo interno real (confirmado por código, no por el changelog de marketing):

1. Orden pasa a `completed` → hook `woocommerce_order_status_completed`.
2. `Scheduler::handle_woocommerce_order_status_completed()` programa una acción única en Action Scheduler: `as_schedule_single_action( time() + delay, 'woocommerce_send_review_request', [ $order_id ] )`.
3. Pasado el delay, Action Scheduler dispara `woocommerce_send_review_request` → `WC_Email_Customer_Review_Request::trigger()` re-valida elegibilidad y envía el mail.
4. El mail linkea a `/review-order/{order_id}/?key={order_key}` — una página real de WordPress (no una API).
5. El cliente entra, ve un `<form>` con una fila por ítem de la orden (estrellas + textarea), lo envía por AJAX (`admin-ajax.php?action=woocommerce_submit_order_reviews`).
6. `SubmissionHandler::handle()` valida el nonce + la `order_key`, y por cada fila con rating > 0 hace `wp_insert_comment()` con `comment_type = 'review'`, más `add_comment_meta( $comment_id, 'rating', $rating )` y `add_comment_meta( $comment_id, 'verified', 1 )`.
7. Si `comment_moderation` está activo en el sitio, el comentario queda `comment_approved = 0` (pendiente) — si no, se publica directo.

## 2. ¿Feature flag?

**Sí.** Gateada por `FeaturesController` bajo el flag **`customer_review_request`** (nombre visible: "Customer review request (beta)"), **apagada por defecto** (`enabled_by_default => false`). Se activa/consulta con `FeaturesUtil::feature_is_enabled( 'customer_review_request' )`, chequeado en `WC_Emails::maybe_init_order_reviews()` (hook `init` prioridad 1). Con el flag apagado, ninguna de las clases internas (`Scheduler`, `Endpoint`, `SubmissionHandler`, `ItemEligibility`) se registra en el contenedor — es como si el código no existiera.

## 3. Clases, hooks y servicios

Namespace: `Automattic\WooCommerce\Internal\OrderReviews\`

| Clase | Responsabilidad |
|---|---|
| `Scheduler` | Programa/cancela el envío vía Action Scheduler |
| `Endpoint` | Crea la página WP `/review-order/{id}/`, rewrite rule, gating de acceso, shortcode `[woocommerce_review_order]` |
| `SubmissionHandler` | Recibe el POST AJAX, crea los comentarios de reseña |
| `ItemEligibility` | Filtra qué ítems de la orden son reseñables (excluye reembolsados) |
| `StarRating` | Renderiza el control de estrellas accesible (server-side) |
| `WC_Email_Customer_Review_Request` | Clase `WC_Email` nativa — asunto, heading, delay, contenido |

Hooks clave (todos verificados en el código fuente):

- Acción que dispara el trigger de scheduling: `woocommerce_order_status_completed`
- Acción de Action Scheduler: `woocommerce_send_review_request` (arg: `order_id`)
- Acción que consume el email: `woocommerce_send_review_request_notification` (WC_Emails la despacha después de que Action Scheduler dispara la anterior)
- Filtro de opt-out por orden: `woocommerce_should_send_review_request( bool $should_send, WC_Order $order )`
- Filtro de delay: `woocommerce_review_request_delay_seconds( int $seconds )`
- Filtro de estados elegibles para enviar: `woocommerce_review_order_eligible_statuses` — **default `[ 'completed' ]` únicamente**
- Filtro de ítems elegibles (excluye reembolsados): `woocommerce_review_order_eligible_items`
- Acción tras guardar las reseñas: `woocommerce_review_order_submitted( WC_Order $order, array $results )`
- Nonce AJAX: `woocommerce_submit_order_reviews`

Meta keys en la orden (todos vía `$order->get_meta()`/`update_meta_data()`, HPOS-safe):

- `_wc_review_request_scheduled_at` — timestamp de cuándo se programó el envío (también sirve de guarda de idempotencia)
- `_wc_review_request_completed_at` — timestamp de cuando el cliente terminó de reseñar todos los ítems elegibles (no se pisa una vez seteado)

## 4. Cómo programa los emails vía Action Scheduler

`as_schedule_single_action( time() + $email->get_delay_seconds(), 'woocommerce_send_review_request', [ $order_id ] )`. El delay sale de la opción `delay_days` del email (1–60 días, default 7), configurable en WooCommerce → Ajustes → Emails → Review request. Es **una sola acción por orden**: antes de programar, chequea `if ( $order->get_meta( SCHEDULED_META_KEY ) ) return;` — así una orden que vuelve a pasar por `completed` dos veces no duplica el envío (confirmado con test `test_is_idempotent` en el PR).

Cancelación: `Scheduler::handle_cancellation()` está enganchado a `woocommerce_order_status_cancelled`, `woocommerce_order_status_refunded`, `woocommerce_trash_order` y `woocommerce_before_delete_order`, y llama `as_unschedule_action()` + borra el meta.

## 5. Cómo genera la URL tokenizada

**No genera un token nuevo.** Reutiliza el **`order_key`** que WooCommerce ya asigna a toda orden (`wc_...` generado en la creación, el mismo que usa la URL de "pay for order" o "order received"). La URL es `wc_get_review_order_url( $order )` → `/review-order/{id}/?key={order_key}`. La validación en el `Endpoint` y en el `SubmissionHandler` es `hash_equals( $order->get_order_key(), $key )`.

Esto es relevante: **no hay expiración de este "token"** — el order_key vive tanto como la orden. La única protección temporal es que el email deja de programarse/reenviarse, pero si alguien guarda el link, sigue funcionando indefinidamente (mientras la orden siga `completed`).

## 6. Cómo valida órdenes y compradores

- `Endpoint::gate_request()` (hook `template_redirect`): sin `order_key` válido o orden inexistente → **404** (nunca revela que la orden existe).
- Si el cliente está logueado y la orden tiene `customer_id`, debe coincidir con `get_current_user_id()`; si es guest, el `order_key` alcanza.
- `SubmissionHandler::handle()` repite exactamente la misma validación (nonce + order_key + ownership + `woocommerce_review_order_eligible_statuses`) — **no confía en que el gating de la página ya haya pasado**, la revalida en el POST.
- El email mismo, al momento de disparar (`WC_Email_Customer_Review_Request::trigger()`), vuelve a chequear `is_order_eligible_for_send()` contra el mismo filtro de estados elegibles — defensa en profundidad ante que la orden haya cambiado de estado entre el scheduling y el envío.

## 7. Cómo crea las reseñas verificadas

Usa la **API de comentarios nativa de WordPress**, no una tabla propia: `wp_insert_comment([ 'comment_post_ID' => $product_id, 'comment_type' => 'review', 'comment_approved' => $moderation ? 0 : 1, ... ])`, seguido de `add_comment_meta($id, 'rating', $rating)` y **`add_comment_meta($id, 'verified', 1)`** — el flag de "compra verificada" se hardcodea a `1` porque en ese punto ya se validó la propiedad de la orden (no se re-consulta el historial de compras como hace la función pública `wc_review_is_from_verified_owner()` en el flujo estándar del frontend de WP).

Detalle importante: la reseña siempre se cuelga del **producto padre** (`$item->get_product_id()`), nunca de la variación — si la orden tenía una variación, `product_id` puede venir como el ID de la variación pero se mapea al padre antes de insertar.

## 8. Cómo excluye productos reembolsados

`ItemEligibility::exclude_fully_refunded_items()`, enganchado al filtro `woocommerce_review_order_eligible_items`. Compara la cantidad reembolsada contra la cantidad comprada por línea: si el ítem está **totalmente** reembolsado se excluye; si es **parcial**, sigue siendo elegible (confirmado con tests explícitos `test_exclude_fully_refunded_items_drops_full_refunds` / `keeps_partial_refunds`).

Nota menor encontrada: hay un fix posterior (#66886/#66897) sobre una guarda de moderación que no contemplaba reseñas creadas **antes** de 10.9.0 (les falta el meta `_review_variation_id`) — no aplica a Hypestyle porque partiríamos desde cero, pero es indicio de que el feature tuvo bugs de compatibilidad hacia atrás poco después del lanzamiento; razón más para no ir a 10.8.0 exacto sino a 10.9.4.

## 9. Qué partes pueden reutilizarse en una tienda headless

Reutilizable **tal cual o con extensión liviana** (todo vive en PHP, no depende de render de WordPress):

- **`Scheduler`** — el patrón completo (Action Scheduler + meta de idempotencia + cancelación en cancelado/reembolsado/trash/delete) es exactamente lo que necesitamos, solo que hay que **cambiar el hook disparador**: el core usa `woocommerce_order_status_completed`, Hypestyle necesita dispararlo desde el evento real de despacho (que hoy no existe formalmente, ver `docs/reviews-headless-architecture.md` §1).
- **`ItemEligibility`** (exclusión de reembolsos parciales/totales) — reutilizable 1:1, es lógica de negocio pura sobre `WC_Order`/`WC_Order_Item_Product`.
- **La creación de reseñas vía `wp_insert_comment` + `comment_type=review` + meta `rating`/`verified`** — reutilizable 1:1. Es justo lo que necesitamos para que las reseñas aparezcan en Productos → Reseñas y se puedan moderar desde ahí.
- **`WC_Email_Customer_Review_Request` como clase base/inspiración** — el patrón de settings (`delay_days`, `subject`, `heading`, `additional_content`, `email_type`) integrado a WooCommerce → Ajustes → Emails es exactamente el que pide el brief; se puede extender o clonar esta clase.
- **El filtro `woocommerce_review_order_eligible_statuses`** — reutilizable como mecanismo, aunque su default (`completed`) no sirve para Hypestyle tal cual.

**NO reutilizable — depende 100% del frontend clásico de WordPress:**

- **`Endpoint`** completo: crea una página real de WP (`wp_posts`), rewrite rules, shortcode `[woocommerce_review_order]`, gating vía `template_redirect`, exclusión de menús/`get_pages()`. Todo esto asume que WordPress renderiza HTML con el theme activo. En una tienda headless no hay theme ni páginas de WP expuestas al público — el frontend es Next.js. **Cero código de esta clase es portable.**
- **`SubmissionHandler`** tal cual: usa `admin-ajax.php` + `wp_verify_nonce()` con un nonce embebido en un formulario **renderizado por el propio WordPress** (`wp_nonce_field()` en el HTML servido por `Endpoint`). Un frontend Next.js en un dominio propio (hypestyle.com.ar) no tiene ese nonce disponible — no hay sesión de WP ni cookie de nonce. **Hay que reemplazar el mecanismo de auth por un endpoint REST propio con su propio esquema de token** (ver `docs/reviews-security.md`).
- El **token = order_key sin expiración** no es aceptable para Hypestyle tal cual — el brief pide tokens con vencimiento. Hay que generar un token propio (no reusar directamente el order_key expuesto indefinidamente).
- El **template PHP `customer-review-order.php`** (HTML con theme chrome) no aplica — el frontend headless renderiza su propia UI en `/review/[token]`.
- La **captura de "completed" como disparador** no aplica: para Hypestyle, `completed` significa "entregado" (confirmado en la auditoría de despacho), no "enviado". Reusar el hook tal cual dispararía el mail en el momento equivocado.

## 10. Resumen ejecutivo

| Pieza | Reutilizar | Notas |
|---|---|---|
| Action Scheduler scheduling + cancelación | Sí (adaptado) | Cambiar el hook de entrada de `order_status_completed` a un evento propio de despacho |
| Exclusión de ítems reembolsados | Sí, 1:1 | `ItemEligibility` es portable sin cambios |
| Creación de reseña (`wp_insert_comment` + meta) | Sí, 1:1 | Es la pieza que nos da moderación nativa gratis en Productos → Reseñas |
| Clase `WC_Email` con settings en Ajustes → Emails | Sí, como base/patrón | Se extiende o clona, ajustando el contenido/URL al frontend headless |
| Página de reseña (`Endpoint`, shortcode, template) | No | 100% frontend WP clásico; se reemplaza por `/review/[token]` en Next.js + REST endpoints propios |
| Envío de formulario (`SubmissionHandler` AJAX + nonce) | No, como mecanismo de transporte | La lógica de validar fila-por-fila y crear el comentario sí se reutiliza; el transporte (admin-ajax + nonce de página) se reemplaza por REST + token propio |
| Token de acceso (order_key) | No | Reemplazar por token propio con expiración; el order_key no expira y ya se usa para otras URLs (pay-for-order) |

**Decisión final (corregida tras revisión del usuario):** **no actualizar WooCommerce como parte de esta feature.** Action Scheduler, `WC_Email`, `WC_Coupon` y el sistema de comentarios/reseñas (incluyendo `wc_customer_bought_product()`) ya están disponibles en 10.7 (ver §0bis) — no hace falta el feature flag `customer_review_request` ni ninguna clase de `Internal\OrderReviews\*` para construir `hypestyle-reviews`. Se implementa un plugin propio, autosuficiente, sobre la versión actual de WooCommerce. La actualización a 10.9.4 queda como proyecto de infraestructura aparte, sin fecha ni dependencia hacia este trabajo. Arquitectura completa en `docs/reviews-headless-architecture.md`.
