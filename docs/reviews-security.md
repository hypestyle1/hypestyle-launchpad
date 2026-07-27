# Seguridad — Sistema de reseñas automáticas (Hypestyle)

Fecha: 2026-07-26 (revisión 2)
Estado: propuesta, no implementado.

**Cambios respecto de la v1:** se agrega el secreto server-side `HS_REVIEWS_SECRET` como capa de autenticación principal entre Next.js y WordPress (§7, nuevo); CORS pasa a ser una capa adicional, no la principal (§6, corregido); la idempotencia del submit se refuerza con un lock atómico a nivel de solicitud, no solo del cupón (§10, corregido); moderación forzada sin depender de `comment_moderation` (§13, nuevo).

---

## 1. Modelo de amenaza

Sin cambios de fondo respecto de la v1: el endpoint es alcanzable por cualquiera con el link — la seguridad vive en que el token sea impredecible y en que el backend nunca confíe en nada que llegue del cliente. Con la corrección de este documento, se agrega una segunda capa: **ni siquiera con el token alcanza** si no se tiene también el secreto server-side (que el navegador nunca ve).

Actores a considerar: interceptor de link de email, cliente legítimo manipulando el request (DevTools/curl), bot de fuerza bruta sobre `/review/{token}`, cliente reintentando el submit buscando dos cupones, **dos requests simultáneos del mismo cliente** (doble click, tab duplicado) intentando crear reseñas duplicadas — este último caso es el que motivó el rediseño del §10.

## 2. Tokens

Sin cambios respecto de la v1:

- **Generación:** `random_bytes(32)` → hex (256 bits). Nunca `wp_rand()` ni derivado de `order_id`/timestamp.
- **Almacenamiento:** solo el hash SHA-256, nunca el texto plano.
- **Comparación:** siempre `hash_equals()`.
- **Expiración:** `expires_at` configurable (`delay_days + 30 días` sugerido).
- **Un solo uso efectivo:** se marca `used_at` al llegar a `status = 'responded'` (ver §10 — ya no es un simple flag, es consecuencia del reclamo atómico).
- **Reenvío rota el token de la misma fila** (no crea una fila nueva — la tabla tiene `UNIQUE(order_id)`, ver `docs/reviews-api.md` §3).

## 3. No exponer por qué falla

Sin cambios: todo fallo de token devuelve el mismo código/mensaje genérico. Se agrega una precisión: **el fallo de secreto (`HS_REVIEWS_SECRET` inválido) se resuelve antes de tocar el token** y devuelve `401` — un mensaje distinto del `404` de token, porque son capas distintas (autenticación de servicio vs. autorización de solicitud), pero **nunca** se distingue "secreto inválido" de "secreto ausente", y un `401` no revela si el token en la URL era válido o no.

## 4. Rate limiting

Sin cambios de fondo: rate limit por IP (sugerido 20 req/min combinando GET+POST) vía transient, y límite de intentos fallidos por token antes de invalidarlo preventivamente. El rate limit por IP sigue siendo el control principal contra fuerza bruta de descubrimiento de tokens.

Precisión nueva: el rate limit se evalúa **después** de validar `HS_REVIEWS_SECRET` — como el navegador nunca llama directo, el volumen real de requests a `hypestyle-reviews/v1/reviews/*` debería ser bajo y previsible (viene de un solo origen: el propio Next.js server). Un pico de tráfico sin el secreto correcto (bots probando el endpoint público de WordPress directamente) se corta en la capa de secreto, antes de gastar una consulta a la tabla de tokens.

## 5. Nonces / CSRF

Sin cambios: no hay sesión de WordPress ni cookie de nonce disponible del lado del cliente headless. El rol de "prueba de intención legítima" ahora lo cumplen **dos capas**: el secreto (prueba de que el request viene del propio Next.js) y el token (prueba de que corresponde a una solicitud de reseña real).

**Confirmado durante la implementación (punto 2 de las verificaciones pedidas):** para "Marcar como despachado" y "Deshacer despacho", **sí existe un camino real con nonce y capability de WordPress**, no solo el secreto compartido. Ambas acciones se agregaron también al dropdown nativo "Order actions" de WooCommerce (`HS_Reviews_Order_Actions`, hook `woocommerce_order_actions` + `woocommerce_order_action_{action}`), visible en el edit clásico de la orden en wp-admin. El guardado de ese meta box (`WC_Meta_Box_Order_Actions::save()`, verificado contra el código real de WooCommerce 10.7.0) corre dentro del guardado normal de un post en wp-admin — protegido por el nonce estándar de `post.php` y por `current_user_can('edit_post'/'edit_shop_order')` **antes** de que el código del plugin se ejecute. Es el mismo mecanismo que ya protege "Reenviar detalles de la orden" o "Regenerar permisos de descarga" nativos de WooCommerce. El panel de "Solicitudes de reseñas" (`HS_Reviews_Admin_Page`) usa el mismo patrón para reenviar/cancelar/rotar el secreto: `check_admin_referer()` + `current_user_can('manage_woocommerce')`. El endpoint REST (`HS_Reviews_Rest::permission_admin()`) es el camino que usa el panel *headless* (Next.js) — ahí no hay nonce posible (no hay sesión de WordPress del lado de Next.js), así que se autentica con `HS_REVIEWS_SECRET`; si en cambio la request SÍ trae una cookie de WordPress válida con nonce (`X-WP-Nonce`), la propia REST API de WordPress la valida antes de que el `permission_callback` corra, y ahí sí alcanza con `current_user_can('manage_woocommerce')`. Ambos caminos llaman a los mismos métodos (`HS_Reviews_Dispatcher::mark_dispatched()`, `HS_Reviews_Scheduler::undo_dispatch()`) — no hay lógica de negocio duplicada entre wp-admin y el panel headless.

## 6. CORS — corregido, capa adicional, no principal

**Corrección explícita pedida por el usuario:** en la v1, CORS aparecía implícitamente como control de acceso. Se aclara: **CORS no es un mecanismo de seguridad servidor-a-servidor** — es una restricción que aplica el navegador, no algo que WordPress pueda hacer cumplir contra un cliente HTTP directo (`curl`, Postman, un bot) que simplemente no manda el header `Origin` o lo falsea. Por eso:

- CORS se mantiene configurado (`Access-Control-Allow-Origin: https://hypestyle.com.ar`) como higiene general y para bloquear que un script corriendo en otro sitio web haga requests "en nombre" de un usuario que tiene la pestaña abierta.
- **La autenticación real es `HS_REVIEWS_SECRET` (§7)**, que sí es verificable server-side contra cualquier origen de la request, venga o no de un navegador.
- Como el navegador ya no llama directo a `hypestyle-reviews/v1/reviews/*` (solo a las rutas de Next.js), el CORS de WordPress para ese namespace en la práctica solo necesita permitir al propio servidor de Next.js (server-to-server no está sujeto a CORS de todos modos — CORS es una restricción de navegador). El CORS de WooGraphQL/otros namespaces existentes no se toca.

## 7. Secreto server-side `HS_REVIEWS_SECRET` — nuevo

### 7.1 Por qué

El diseño de la v1 dependía únicamente del token para autenticar el acceso a `hypestyle-reviews/v1/reviews/*`. Eso es razonable para un endpoint pensado para ser llamado desde un navegador (el token es justamente el mecanismo pensado para eso), pero acá el llamador real es el **servidor** de Next.js, que puede tener una credencial más fuerte y de larga duración sin exponerla nunca al cliente. El usuario pidió agregar esta capa explícitamente.

### 7.2 Requisitos (todos obligatorios)

- **Variable de entorno sin prefijo `NEXT_PUBLIC_`** en Vercel (ej. `HS_REVIEWS_SECRET`) — Next.js solo expone al bundle del cliente las variables con ese prefijo; sin él, la variable **no puede** filtrarse al navegador por accidente, ni siquiera vía un import mal ubicado, siempre que se use exclusivamente dentro de `route.ts` (Route Handlers, que corren solo en el servidor).
- **Nunca se envía al navegador** — no viaja en ninguna respuesta HTTP hacia el cliente, no se incluye en props de React, no se loguea en `console.log` del lado del cliente.
- **No aparece en logs** — ni en los logs de Vercel (cuidado con loguear headers completos de la request saliente; loguear la request sin el header, o con el valor enmascarado tipo `***`), ni en `WC_Logger` del lado de WordPress (el middleware de validación del secreto no debe loguear el valor recibido, solo "válido"/"inválido").
- **Se valida con `hash_equals()`** en WordPress — nunca `===`, para evitar timing attacks.
- **Rotable sin downtime**: WordPress acepta el secreto **actual** y, durante una ventana de transición, también el **anterior** (dos constantes: `HS_REVIEWS_SECRET` y `HS_REVIEWS_SECRET_PREVIOUS`, esta última opcional y con fecha de vencimiento corta) — así se puede rotar el secreto en Vercel y en WordPress sin que haya un instante de corte total si el deploy de un lado tarda más que el del otro.

### 7.3 Dónde vive

- **WordPress**: constante en `wp-config.php` (fuera del repo, igual que cualquier otro secreto de la instalación) o en una opción autoloaded=no de `wp_options` si se prefiere rotarla sin acceso a archivos — a decidir en implementación, con preferencia por `wp-config.php` por ser el patrón ya usado para otros secretos de la instalación.
- **Next.js**: variable de entorno de Vercel (Production + Preview con valores distintos si se quiere aislar pruebas), nunca en `.env.local` committeado (mismo patrón que las WC REST keys existentes, que ya están en `.env.local` gitignored).

### 7.4 Validación en WordPress — orden de checks

```
1. ¿Header X-HS-Reviews-Secret presente? No → 401 genérico.
2. hash_equals($secreto_actual, $recibido) === true, o
   hash_equals($secreto_anterior_si_existe_y_no_vencio, $recibido) === true? No → 401 genérico.
3. Recién acá se evalúa el token de la solicitud (§2-3).
```

## 8. No aceptar Product IDs arbitrarios / verificación de pertenencia

Sin cambios respecto de la v1: el cliente nunca envía `product_id`, solo `order_item_id`, resuelto server-side. Reembolso total re-chequeado en el submit. Una reseña por producto y compra (ver regla de deduplicación de variaciones en `docs/reviews-headless-architecture.md` §7 — la dedup es dentro de la misma orden, no contra el historial completo del cliente).

## 9. Sanitización

Sin cambios: `rating` clamp 1–5, `text` vía `sanitize_textarea_field()` con límite de longitud, autor tomado de la orden nunca del POST.

## 10. Idempotencia y concurrencia — reforzado (corrección central pedida por el usuario)

### 10.1 Por qué la v1 no alcanzaba

La v1 protegía únicamente la creación del cupón (`if ($order->get_meta('_hs_review_coupon_id')) return;`). El usuario señaló el hueco real: **dos `POST /submit` simultáneos con el mismo token**, ambos llegando antes de que cualquiera termine de escribir, podían pasar ese chequeo en paralelo y **cada uno insertar sus propias reseñas** — el chequeo de cupón llega demasiado tarde en el flujo para evitar el problema de fondo.

### 10.2 Solución: lock atómico a nivel de la solicitud completa

Detalle completo del flujo en `docs/reviews-headless-architecture.md` §9 y `docs/reviews-api.md` §1.2. Resumen de seguridad:

- El lock se adquiere con un **`UPDATE` condicional** (`WHERE status = 'sent' AND used_at IS NULL`) — no con un `SELECT` seguido de un `UPDATE` separado (eso sí tendría una ventana de carrera). MySQL/InnoDB garantiza que, de dos `UPDATE`s concurrentes sobre la misma fila, solo uno ve el `WHERE` cumplirse.
- Mientras el lock está tomado (`status = 'processing'`), cualquier otro request sobre el mismo token recibe `409` (reintentar) o, si ya terminó, la respuesta idempotente ya calculada (`responded`) — **nunca** una segunda ejecución de la lógica de creación de reseñas.
- La creación de reseñas en sí **también** es idempotente dentro de la ventana del lock: se chequea `(request_id, order_item_id)` contra `wp_commentmeta` antes de insertar cada una — cubre el caso de un reintento después de un fallo parcial (1 de 2 reseñas creadas, la request murió, el cliente reintenta).
- El cupón se crea/recupera **dentro** de esa misma ventana protegida — el chequeo de `_hs_review_coupon_id` que ya proponía la v1 se mantiene, pero ahora ejecuta dentro de una sección que ya está serializada por el lock, no como única defensa.
- Toda excepción no controlada revierte `status` a `'sent'` (nunca queda una fila permanentemente `processing`) — cubierto con `try/catch/finally` explícito.

**Resultado:** la idempotencia cubre reseñas y cupón como una unidad, no el cupón por separado — corrige exactamente el punto señalado por el usuario.

## 11. Compatibilidad con HPOS / CRUD de WooCommerce

Sin cambios: todo acceso a orden vía `wc_get_order()` + CRUD, nunca `get_post_meta()`/SQL directo sobre tablas de HPOS (recordatorio del bug ya encontrado en `PHP/hypestyle-tracking-fix.php:504`, a no replicar). La tabla `wp_hs_review_requests` es auxiliar, no de órdenes — sin implicancia HPOS.

## 12. Emails — no filtrar información

Sin cambios: el email de solicitud no incluye el `order_key` nativo ni otro identificador reutilizable. El de confirmación va solo al `billing_email` de la orden.

## 13. Moderación forzada — no depender de configuración global (nuevo)

Corrección explícita del usuario: **todas** las reseñas de este flujo se insertan con `'comment_approved' => 0` **hardcodeado en el código**, sin leer `get_option('comment_moderation')`. Esto no es estrictamente un control de seguridad en el sentido de "amenaza externa", pero se documenta acá porque es un control de integridad de datos importante: si un admin cambia el setting global de moderación de WordPress por cualquier otro motivo (ej. para otro plugin), el flujo de reseñas incentivadas no debe verse afectado — la moderación de *este* flujo específico es una decisión de producto fija, no una consecuencia de un ajuste global.

Meta agregada para trazabilidad y transparencia (a pedido del usuario): `_hs_incentivized_review = 'yes'` en cada reseña creada por este flujo — permite en el futuro mostrar públicamente una etiqueta tipo "Reseña incentivada" sin ocultar que hubo un beneficio a cambio, en vez de mezclar silenciosamente estas reseñas con las orgánicas.

## 14. Checklist de seguridad (actualizado)

- [ ] Token de 256 bits, hasheado, comparado con `hash_equals`.
- [ ] Expiración aplicada en cada validación.
- [ ] Reenvío rota el token de la misma fila (no crea una nueva — `UNIQUE(order_id)`).
- [ ] Errores de token siempre genéricos; errores de secreto (`401`) distintos de errores de token (`404`), pero sin distinguir causa dentro de cada categoría.
- [ ] **`HS_REVIEWS_SECRET` validado con `hash_equals` antes de tocar el token; sin prefijo `NEXT_PUBLIC_`; no logueado; rotable con período de gracia.**
- [ ] Rate limiting por IP en GET y POST, evaluado después del secreto.
- [ ] CORS configurado como higiene adicional, no como autenticación principal.
- [ ] `order_item_id`, nunca `product_id`, aceptado del cliente.
- [ ] Reembolso total re-chequeado en el submit.
- [ ] Rating clamp 1–5, texto sanitizado con límite de longitud.
- [ ] Nombre/email del autor tomados de la orden, nunca del body.
- [ ] **Reclamo atómico (`UPDATE` condicional) antes de crear cualquier reseña — no solo antes de crear el cupón.**
- [ ] Creación de reseña individual también idempotente por `(request_id, order_item_id)`.
- [ ] Ninguna fila queda permanentemente en `processing` ante una excepción no controlada.
- [ ] **Moderación (`comment_approved = 0`) hardcodeada, no leída de `comment_moderation`.**
- [ ] Meta `_hs_incentivized_review` presente en toda reseña de este flujo.
- [ ] Todo acceso a orden vía CRUD de WooCommerce.
- [ ] Ningún endpoint devuelve email/dirección/total/método de pago al frontend público.
