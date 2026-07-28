# API — Sistema de reseñas automáticas (Hypestyle)

Fecha: 2026-07-26 (revisión 2)
Estado: propuesta, no implementado.

**Cambios respecto de la v1:** el navegador nunca llama a `hypestyle-reviews/v1/reviews/*` directamente (§0); el submit usa un reclamo atómico en vez de un chequeo simple (§1.2); el modelo de estados elimina `coupon_issued` (§3); se agregan endpoints de marcar/deshacer despacho (§2).

---

## 0. Quién llama a qué (capas de transporte)

```
Navegador ──► Next.js (app/api/reviews/[token]/*)  ──► WordPress (hypestyle-reviews/v1/reviews/*)
           (sin secreto,               (agrega HS_REVIEWS_SECRET     (exige secreto + token)
            solo el token en la URL)    server-side, nunca al cliente)
```

- El navegador **solo** conoce `/api/reviews/[token]` y `/api/reviews/[token]/submit` (rutas de Next.js).
- Las rutas de Next.js son `route.ts` server-side (no client components) — leen `process.env.HS_REVIEWS_SECRET` (sin prefijo `NEXT_PUBLIC_`, por lo tanto nunca se bundlea al cliente) y lo agregan como header al llamar a WordPress.
- WordPress expone `hypestyle-reviews/v1/reviews/*` pero **rechaza cualquier request sin el secreto correcto**, incluso con un token válido — el token ya no es la única credencial (ver `docs/reviews-security.md` §7).

Namespace REST: **`hypestyle-reviews/v1`** — namespace propio, separado de `hypestyle/v1` (mu-plugin `hypestyle-api.php`) y de `hs/v1` (mu-plugin `hypestyle-tracking-fix.php`). Mismo patrón ya usado por `hypestyle-gift/v1` en `PHP/hypestyle-purchase-gift/` — cada plugin nuevo registra su propio namespace en vez de agregarse a uno existente (corrección respecto de la v1 de este documento, que asumía reusar `hypestyle/v1`).

---

## 1. Endpoints internos WordPress↔Next.js (nunca llamados desde el navegador)

### `GET /wp-json/hypestyle-reviews/v1/reviews/{token}`

**Headers requeridos:** `X-HS-Reviews-Secret: {HS_REVIEWS_SECRET}`.

**Orden de validación (importante, ver seguridad):** 1) secreto — si falta o no matchea, `401` genérico, sin ni siquiera mirar el token; 2) token.

**Respuesta 200:**
```json
{
  "order_number": "1847",
  "items": [
    { "order_item_id": 5510, "product_id": 231, "name": "Jersey LA NUESTRA", "image": "https://.../thumb.jpg", "already_reviewed": false }
  ],
  "incentive": { "type": "percent", "value": 10, "label": "10% OFF en tu próxima compra" }
}
```

`items` ya viene **deduplicado por producto padre** (`HS_Reviews_Eligibility::get_reviewable_items()`, ver `docs/reviews-headless-architecture.md` §7) — si la orden tenía 2 variaciones del mismo producto, acá aparece una sola entrada. El `order_item_id` devuelto es el de la línea elegida internamente para esa entrada; el frontend no necesita saber que hubo una deduplicación.

Nunca se incluye: email, dirección, total, método de pago, otros productos no comprados.

**Errores:**
- `401` — secreto inválido/ausente (nunca llega a evaluar el token).
- `404` — token inexistente, expirado, ya usado, u orden ya no elegible.
- `409` — la solicitud está en `processing` (un submit concurrente la tiene tomada en este instante) — caso raro para un GET, pero posible si el cliente refresca justo durante un submit; el frontend puede reintentar tras un momento.
- `429` — rate limit excedido.

### `POST /wp-json/hypestyle-reviews/v1/reviews/{token}/submit`

**Headers requeridos:** `X-HS-Reviews-Secret`.

**Body:**
```json
{
  "reviews": [
    { "order_item_id": 5510, "rating": 5, "text": "Excelente calidad, llegó rápido." }
  ]
}
```
Filas con `rating: 0`/ausente = el cliente eligió no reseñar ese producto.

### 1.2 Flujo interno del submit — reclamo atómico con recuperación por etapa

Implementado en `HS_Reviews_Submission::handle_submit()`. Ver diseño completo y motivación en `docs/reviews-headless-architecture.md` §9. Resumen del contrato HTTP resultante:

1. Token inválido → `404`. Si el status es `sent`/`failed` y ya expiró → también `404`.
2. **Reclamo atómico** (`UPDATE ... SET status='processing' WHERE status IN ('sent','failed') AND used_at IS NULL` — nótese que **`failed` también es reclamable**, no solo `sent`, para que un reintento con progreso parcial pueda continuar):
   - 0 filas afectadas + re-lectura en `sent`/`failed`/`processing` → se reintenta el `UPDATE` una vez más (cubre la ventana angosta donde la fila quedó libre justo entre el primer intento y la lectura). Si el segundo intento también falla → **`409`**, `{"code": "processing", "message": "...", "data": {"status": 409, "retry_after_ms": 1500}}` — el cliente puede reintentar.
   - Re-lectura en `responded` → **`200`**, se devuelve el mismo payload de éxito ya calculado (resultados reconstruidos + `coupon` desde `coupon_id`) — **idempotente**, nunca se reprocesa.
   - Re-lectura en `cancelled`/inexistente → `404` genérico (indistinguible de un token inválido a propósito).
3. Con el lock tomado (`processing`): revalida orden vigente + elegibilidad, crea únicamente las reseñas faltantes (chequeo por `order_item_id` ya reseñado dentro de esta misma solicitud — cubre reintentos parciales).
4. **Si ninguna reseña existe (ni nueva ni de un intento previo)** — único camino de vuelta a `'sent'`: `422`, `status→'sent'` (no queda trabado, es un no-op real y seguro de reintentar desde cero).
5. Si ≥1 reseña existe: crea o recupera el cupón.
   - Si la creación del cupón falla: **NO vuelve a `'sent'`** (la reseña ya es progreso real) — `status→'failed'`, `500`, mensaje que aclara que la reseña sí se guardó. Un reintento posterior reclama desde `'failed'` (paso 2) y solo completa el cupón.
   - Si el cupón se obtiene (o el beneficio está desactivado): `200` con resultados + cupón, `status→'responded'`, dispara el email de confirmación (best-effort).
6. Cualquier excepción no controlada en cualquier paso: si ya existe ≥1 reseña para la solicitud → `'failed'` (progreso preservado); si no existe ninguna → `'sent'`. Nunca queda una fila permanentemente en `'processing'`.

**Respuesta 200 (éxito, primera vez o reintento idempotente):**
```json
{
  "results": [
    { "order_item_id": 5510, "status": "pending_moderation" }
  ],
  "coupon": { "code": "GRACIAS-7F3A2C", "label": "10% OFF en tu próxima compra", "expires_at": "2026-09-24" }
}
```
Nota: `status` de cada resultado ya no puede ser `"ok"` (publicado directo) — con moderación siempre forzada (`docs/reviews-headless-architecture.md` §8), el único valor de éxito posible es `"pending_moderation"`. Se mantiene el campo `status` por fila para no acoplar el frontend a un valor fijo, pero en la práctica hoy siempre es ese.

`coupon` aparece si al menos una fila resultó en reseña creada (nueva o preexistente) y el beneficio está activo.

**Errores:**
- `401` — secreto inválido.
- `404` — token inválido/expirado/usado/cancelado.
- `409` — `processing` concurrente (reintentar).
- `422` — todas las filas inválidas, nada que crear (`status` vuelve a `sent`).
- `500` — la reseña se creó pero falló la generación del cupón, o una excepción no controlada con progreso ya guardado (`status` queda en `failed`, recuperable con un reintento — nunca se pierde la reseña ya creada).
- `429` — rate limit.

---

## 2. Endpoints administrativos (consumidos por `next-app/app/admin`)

### `GET /wp-json/hypestyle-reviews/v1/review-requests`

Lista para "WooCommerce → Solicitudes de reseñas". Query params: `status` (uno de `scheduled|sent|responded|failed|cancelled` — **`processing` no es un filtro válido para el usuario**, es transitorio interno; si una fila queda ahí más de lo esperado, es un bug a investigar en logs, no un estado a mostrar como normal), `search`, `date_from`, `date_to`, `page`, `per_page`.

Cada fila incluye `coupon_id`/`coupon_code` como **campo**, no como parte del filtro de `status` — corrección respecto de la v1, que proponía `coupon_issued` como un estado más (error señalado por el usuario: el cupón se representa con una columna, nunca reemplaza a `responded`).

### `POST /wp-json/hypestyle-reviews/v1/review-requests/{id}/resend`

Rota el token de la **misma fila** (no crea una nueva — la tabla tiene `UNIQUE(order_id)`, ver `docs/reviews-headless-architecture.md` §6): nuevo `token_hash`, nuevo `expires_at`, `sent_at = NOW()`, `status` vuelve a `sent` si estaba en `failed` (no se puede reenviar una `responded` o `cancelled`, devuelve `409`).

### `POST /wp-json/hypestyle-reviews/v1/review-requests/{id}/cancel`

Cancela una solicitud `scheduled` o `sent` no usada: desprograma en Action Scheduler si aplica, invalida el token, `status = 'cancelled'`. Distinto de "deshacer despacho" (§3) — esto cancela la *solicitud de reseña*, no borra el evento de despacho de la orden.

### `POST /wp-json/hypestyle-reviews/v1/reviews/mark-dispatched/{order_id}` (nuevo)

Llama a `HS_Reviews_Dispatcher::mark_dispatched( $order, 'manual_button' )`. Devuelve `200` con `{ "dispatched": true, "already_marked": false }` si esta llamada efectivamente marcó el despacho, o `{ "dispatched": true, "already_marked": true }` si ya estaba marcado (idempotente, no es un error).

**Desde 1.1.0**, después de `mark_dispatched()` este handler llama siempre a `HS_Reviews_Scheduler::maybe_schedule_for_order()` — independientemente de si la llamada anterior marcó el despacho o no. Corrige un bug real encontrado en la auditoría final: antes, si una orden se despachaba mientras el modo test bloqueaba la creación de la fila (orden no autorizada), esa fila **nunca** se creaba después, ni sumando la orden al allowlist — porque el evento `hs_order_dispatched` solo se dispara una vez por orden. Ahora, repetir esta acción (o la tanda manual, ver §2bis) sobre una orden ya despachada reintenta la creación de la fila si todavía no existe, sin volver a "despachar" nada.

### `POST /wp-json/hypestyle-reviews/v1/reviews/undo-dispatch/{order_id}` (nuevo)

Solo permitido si la solicitud asociada sigue en `scheduled` (el email todavía no se envió). Borra `_hs_dispatched_at`/`_hs_dispatched_source`, desprograma la acción, **borra** la fila de `wp_hs_review_requests` (a diferencia de `cancel`, que la preserva con `status=cancelled` para historial — acá se trata como "esto nunca debió marcarse"). Si la solicitud ya está `sent` o más adelante, devuelve `409` — el camino correcto ahí es `cancel`, no `undo-dispatch`.

### `GET /wp-json/hypestyle-reviews/v1/review-requests/{id}/logs`

Sin cambios respecto de la v1 — historial de eventos vía `WC_Logger` (fuente `hs-reviews`), leído y filtrado por `order_id`/`request_id`.

La moderación de la reseña (aprobar/rechazar/responder/spam) sigue sin reimplementarse — Productos → Reseñas nativo, con link directo desde el panel (`edit-comments.php?c={comment_id}`).

---

## 2bis. Primera tanda controlada (nuevo, 1.1.0)

Consumido por `/admin/reviews/nueva-tanda`.

### `GET /wp-json/hypestyle-reviews/v1/review-requests/eligible-orders`

Lista órdenes candidatas para programar manualmente: status `processing` o `completed` (no existe un status `enviado` real, ver `docs/reviews-headless-architecture.md`), sin fila existente en `wp_hs_review_requests`, y `HS_Reviews_Eligibility::order_is_dispatch_eligible()` en `true` (excluye canceladas/reembolsadas/sin ítems reseñables — misma guarda que usa el flujo automático, sin lógica duplicada). Devuelve por orden: `order_id`, `order_number`, `customer_email`, `customer_name`, `date`, `status`, `products` (nombres de los ítems elegibles), `already_dispatched`. Paginado (`page`, `per_page`) y con `search`.

### `POST /wp-json/hypestyle-reviews/v1/review-requests/bulk-dispatch`

Body: `{ "order_ids": [123, 456, ...] }` (máx. 50). Por cada orden: si ya tiene una fila existente o no es elegible, se saltea (`status: "skipped"`, con `reason`); si no, se llama a `mark_dispatched()` + `maybe_schedule_for_order()` (exactamente el mismo camino que el botón individual, origen `admin_batch` solo para trazabilidad). Cada resultado individual devuelve uno de: `dispatched` (fila creada, programada), `dispatched_no_request` (despacho marcado, pero el modo test bloqueó la creación de la fila — recuperable repitiendo la acción tras autorizar la orden), `skipped`, `error`. **Este endpoint nunca envía un email por sí mismo** — solo programa la fila, sujeto a las mismas guardas de modo test/allowlist que cualquier otro despacho.

---

## 2ter. Endpoint público de reseñas reales (nuevo, 1.1.0 — sin autenticación)

### `GET /wp-json/hypestyle/v1/public-reviews`

A diferencia de todo lo anterior (namespace `hypestyle-reviews/v1`, secreto o capability obligatorios), este endpoint vive en el namespace **`hypestyle/v1`** — el mismo que usa el mu-plugin `hypestyle-api.php` — y es de lectura pública (`permission_callback` solo aplica un rate limit por IP, 60 req/min, sin secreto ni nonce). Registrarlo ahí no requiere tocar `hypestyle-api.php`: cualquier plugin puede sumar rutas al mismo namespace mientras el path no colisione (verificado, no existe `/public-reviews` en ese archivo).

Consumido por `next-app/app/api/public-reviews/route.ts` (proxy sin secreto) → `next-app/lib/reviews/public.ts` → `/reviews`, la sección de home y el drawer lateral — única fuente para los tres.

Query params: `page`, `per_page` (máx. 50), `stars` (1-5), `sort` (`recent` default, `top`, `low`).

Devuelve únicamente reseñas `comment_type=review`, `comment_approved=1`, con `rating` de meta válido (1-5), asociadas a un producto `publish`. Nunca devuelve: email, nombre completo (se abrevia server-side, `"Lucía Martínez"` → `"Lucía M."`), order ID/item ID, token, cupón, IP, ni datos de moderación. El campo `incentivized` (booleano) SÍ se devuelve — el dato se mantiene en el modelo aunque el frontend hoy decida no mostrarlo como badge.

```json
{
  "summary": { "average": 4.8, "total": 126, "distribution": { "5": 108, "4": 14, "3": 3, "2": 1, "1": 0 } },
  "reviews": [
    { "id": "review-123", "customerName": "Lucía M.", "rating": 5, "text": "Excelente calidad.", "createdAt": "2026-07-10", "productId": 456, "productName": "Hoodie Faith", "productSlug": "hoodie-faith", "productImage": "https://...", "verified": true, "incentivized": true }
  ],
  "pagination": { "page": 1, "pages": 13, "total": 126 }
}
```

Verificado con 25 checks de integración real (sección B de la auditoría final) + `tests/class-hs-reviews-public-rest-test.php` — ver `NUEVAS IMPLEMENTACIONES/REVIEWS/release/wc107-integration-test-output-1.1.0.txt`.

---

## 3. Modelo de datos — detalle completo (corregido)

### Tabla `wp_hs_review_requests`

```sql
CREATE TABLE {$wpdb->prefix}hs_review_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  customer_email VARCHAR(190) NOT NULL,
  customer_name VARCHAR(190) NULL,
  scheduled_for DATETIME NOT NULL,
  sent_at DATETIME NULL,
  opened_at DATETIME NULL,
  responded_at DATETIME NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  coupon_id BIGINT UNSIGNED NULL,
  fail_reason VARCHAR(190) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY order_id (order_id),
  UNIQUE KEY token_hash (token_hash),
  KEY status (status),
  KEY customer_email (customer_email)
);
```

**Cambios respecto de la v1:**
- **`UNIQUE KEY (order_id)`** agregada — una sola solicitud lógica por orden, de por vida. Resend rota el token de esta misma fila (§2).
- `status` — valores válidos: `scheduled | sent | processing | responded | failed | cancelled`. **`processing` es transitorio** (ver §1.2 y arquitectura §9) — no debería persistir más que el tiempo de un request HTTP; el panel admin lo trata como una señal de "en curso ahora mismo", no como un filtro útil para el usuario.
- **`coupon_issued` eliminado como valor de `status`** — el cupón se representa con la columna `coupon_id`, nunca con un estado propio (corrección explícita pedida por el usuario).

### Meta en la orden

| Meta key | Escrita por | Propósito |
|---|---|---|
| `_hs_dispatched_at` | `HS_Reviews_Dispatcher::mark_dispatched()` (única puerta de entrada) | Timestamp del despacho |
| `_hs_dispatched_source` | ídem | `manual_button` \| `status_enviado` \| `tracking_number` |
| `_hs_review_coupon_id` | `HS_Reviews_Coupons` | Evita generar un segundo cupón |

No se guarda ninguna referencia a `_hs_review_request_scheduled_at` como meta separada de la orden en esta revisión — la fuente de verdad de "¿está programada?" es directamente la fila de `wp_hs_review_requests` (gracias al `UNIQUE(order_id)`, hay como máximo una fila por orden, así que no hace falta un meta espejo en la orden para la idempotencia de scheduling — sería redundante con la restricción de la tabla).

### Reseñas — meta agregada (corregido/ampliado respecto de la v1)

En `wp_commentmeta`, además de `rating` y `verified` (nativos):

- `_hs_incentivized_review = 'yes'` — marca explícita de reseña incentivada.
- `_hs_review_request_id` — FK lógica a `wp_hs_review_requests.id`.
- `_hs_review_order_id`, `_hs_review_order_item_id` — trazabilidad hacia la orden/línea de origen.
- `_review_variation_id` — **mismo nombre que usa el core nativo de WooCommerce 10.8+**, adoptado a propósito por compatibilidad futura (ver `docs/reviews-headless-architecture.md` §6).

---

## 4. Endpoints que NO se exponen (sin cambios respecto de la v1, reafirmado)

- Ningún endpoint recibe `product_id` directamente del cliente — solo `order_item_id`, resuelto server-side.
- Ningún endpoint devuelve email/nombre/dirección/total/método de pago al frontend público.
- Ningún endpoint permite al frontend elegir el porcentaje del cupón — sale de configuración server-side.
- **Ningún endpoint de `hypestyle-reviews/v1/reviews/*` es alcanzable sin `HS_REVIEWS_SECRET`** — ni siquiera con un token de solicitud válido (nuevo, corrige la v1, que solo confiaba en el token).
