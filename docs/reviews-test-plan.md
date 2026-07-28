# Plan de pruebas — Sistema de reseñas automáticas (Hypestyle)

Fecha: 2026-07-26 (revisión 2)
Estado: propuesta, no implementado.
Contexto: **no hay staging real hoy.** WordPress corre en Hostinger sirviendo producción directamente; Vercel sí tiene preview deploys por PR, pero el backend WordPress no tiene un entorno espejo.

**Cambios respecto de la v1:** se elimina toda la sección de pruebas de actualización de WooCommerce (ya no es parte de este trabajo — ver `docs/reviews-headless-architecture.md` §1); se agrega un test de entrega de `wp_mail()` como paso obligatorio antes de activar cualquier envío real (§2, nuevo); se agregan pruebas de concurrencia sobre el lock atómico del submission (§4); se agregan pruebas de la acción `mark_dispatched` y sus tres orígenes (§4).

---

## 1. Estrategia general sin staging

Sin cambios de fondo:

1. **Local/aislado**: PHPUnit contra WordPress+WooCommerce local o dockerizado (sobre la misma versión 10.7 de producción, ya que no se actualiza como parte de este trabajo — esto además simplifica el entorno local, no hay que reproducir una versión distinta a la real).
2. **Producción, con guardas activas pero el flujo apagado**: plugin subido con `hs_reviews_enabled = no`, invocable manualmente (WP-CLI o endpoint de debug protegido).
3. **Producción, activado selectivamente sobre 1-2 órdenes reales de bajo riesgo**, con el envío de email real todavía apagado hasta confirmar el §2.

## 2. Test de entrega de email — obligatorio antes de activar envíos reales (nuevo)

El usuario pidió explícitamente no asumir que Brevo está conectado como transporte de `wp_mail()` de WordPress solo porque Next.js lo usa vía API HTTP para otros flujos — son sistemas independientes y no hay evidencia en el código auditado de que estén conectados.

**Pasos:**

1. Auditar la configuración actual: ¿hay un plugin tipo "WP Mail SMTP" o equivalente instalado y activo en el WordPress de Hostinger? ¿Qué proveedor tiene configurado (Brevo, el SMTP default de Hostinger, ninguno — cae a la función `mail()` de PHP)? Esto se revisa desde wp-admin → Plugins y, si existe, sus ajustes — no es algo que se pueda confirmar solo leyendo el repo de `PHP/`, porque un plugin de SMTP se configura desde la base de datos/UI, no necesariamente desde código versionado.
2. Si no hay ningún plugin SMTP conectado: `wp_mail()` cae al `mail()` nativo de PHP del hosting, con alto riesgo de spam/bloqueo por parte de Gmail/Outlook (falta de SPF/DKIM propios para envíos transaccionales) — en ese caso, antes de activar el flujo real, evaluar conectar Brevo (u otro proveedor) como SMTP de WordPress vía un plugin, reusando las credenciales SMTP ya conocidas (`aadd6e001@smtp-brevo.com`, ver memoria del proyecto) en vez de la integración HTTP que ya usa Next.js — son configuraciones independientes.
3. **Test de entrega dedicado, antes de tocar código de reseñas**: desde wp-admin, con cualquier mecanismo simple (un plugin de test de SMTP, o `wp_mail('tu-email-real@...', 'Test', 'Test body')` ejecutado vía WP-CLI/`wp eval`), confirmar que un email sale y llega a una bandeja real (Gmail, no solo que la función devuelva `true` — `wp_mail()` puede devolver éxito aunque el mensaje termine en spam o rebote silencioso).
4. Repetir el test después de subir el plugin `hypestyle-reviews` (con `hs_reviews_enabled=no` todavía) para confirmar que la clase `WC_Email` extendida no introduce ningún problema de configuración (headers, `From`, etc.) antes de que dependa de ella el flujo real.
5. Solo después de confirmar 1-4, se activa el envío real en el plan de despliegue (`docs/reviews-headless-architecture.md` §13).

## 3. Pruebas unitarias/PHPUnit (entorno local, sobre WooCommerce 10.7)

- **Dispatcher / `mark_dispatched()`**:
  - Primera llamada marca `_hs_dispatched_at`/`_hs_dispatched_source` y dispara `hs_order_dispatched`; devuelve `true`.
  - Segunda llamada (mismo `$source` o distinto) no hace nada, devuelve `false` — probar los tres orígenes (`manual_button`, `status_enviado`, `tracking_number`) llamando dos veces en cualquier combinación de orden.
  - Dos llamadas simulando concurrencia real (ej. invocar el método desde dos procesos/hilos de test, o mockear el lock para forzar la ventana de carrera) — solo una debe tener efecto.
  - `status_enviado` se dispara correctamente al enganchar `woocommerce_order_status_changed` hacia `enviado` (simulando el flujo que ya usa `/admin/pedidos`).
  - `tracking_number` respeta el flag `hs_reviews_dispatch_on_tracking` (apagado por defecto — no debe dispararse si el flag está en `no`).
- **Scheduler**: al recibir `hs_order_dispatched`, crea exactamente una fila en `wp_hs_review_requests` (la restricción `UNIQUE(order_id)` debería hacer fallar un segundo intento de insert — testear que el código maneja ese error de constraint sin romper, en vez de asumir que nunca puede pasar); programa la acción en Action Scheduler con el delay configurado; cancela correctamente ante `cancelled`/`refunded`/`trash`/`delete`.
- **Tokens**: entropía suficiente; hash sin texto plano persistido; expiración respetada; rotación en `resend` actualiza la misma fila (no crea otra).
- **Eligibility**: excluye ítems totalmente reembolsados, regalos de Purchase Gift (`_hypestyle_purchase_gift = 'yes'`), fees y shipping; deduplica dos variaciones del mismo producto padre en una sola entrada, con `_review_variation_id` apuntando a la línea elegida.
- **Submission handler / lock atómico** (ver §4, casos de concurrencia específicos).
- **Coupons**: no genera dos; aplica `usage_limit`, `email_restrictions`, `date_expires`, `minimum_amount`, `exclude_sale_items` correctamente; recuperar (no regenerar) el cupón existente en un reintento post-`responded`.
- **Moderación**: toda reseña creada por el flujo tiene `comment_approved = 0` **incluso si** `get_option('comment_moderation')` está en `no` a nivel de sitio (test explícito de que no se lee ese option).
- **Meta de reseña**: `_hs_incentivized_review`, `_hs_review_request_id`, `_hs_review_order_id`, `_hs_review_order_item_id`, `_review_variation_id` presentes y correctos en cada comentario creado.
- **REST endpoints**: `401` sin `HS_REVIEWS_SECRET` o con uno incorrecto, **antes** de evaluar el token (test que confirma que ni siquiera se consulta la tabla de tokens si el secreto falla); rotación de secreto (actual + anterior con vencimiento) aceptada correctamente durante la ventana de gracia; `404` genérico para token inválido/expirado/usado; rate limit corta tras N requests.

## 4. Pruebas de concurrencia — nuevo, específico al lock atómico

Estas pruebas son las que más importan para validar la corrección pedida por el usuario (idempotencia real de reseñas + cupón, no solo del cupón):

1. **Dos submits simultáneos, mismo token válido, mismo payload**: disparar ambos requests en paralelo (ej. con dos procesos curl lanzados al mismo tiempo, o un test que use conexiones de BD separadas simulando la carrera). Resultado esperado: uno recibe `200` con las reseñas creadas + cupón; el otro recibe `409` (si llegó mientras el primero seguía en `processing`) o `200` con el mismo resultado idempotente (si llegó después de que el primero ya terminó) — en ningún caso deben existir dos reseñas para el mismo `(order_item_id)`, ni dos cupones para la misma orden.
2. **Submit que falla a mitad de camino** (simular una excepción forzada después de crear 1 de 2 reseñas, antes de terminar): confirmar que `status` vuelve a `sent` (no queda en `processing`), y que un reintento posterior detecta la reseña ya creada (por `_hs_review_order_item_id`) y solo crea la que falta, sin duplicar la primera.
3. **Reintento después de éxito completo**: llamar al submit de nuevo con el mismo token después de un `responded` exitoso — debe devolver `200` con el mismo `coupon.code` (no uno nuevo), sin crear reseñas adicionales.
4. **Fila atascada en `processing`**: simular manualmente una fila con `status='processing'` y `updated_at` de hace varios minutos (más que cualquier request HTTP razonable) — confirmar que existe una forma de detectarlo (consulta de monitoreo, ver criterio de salida) aunque no se implemente auto-recuperación automática en la v1.
5. **`GET /reviews/{token}` durante un `POST` en curso**: confirmar que el `GET` no se cae ni corrompe nada al leer una fila en `processing` (debe responder `409` o el estado más reciente disponible, nunca un error 500).

## 5. Pruebas de `mark_dispatched` y sus acciones administrativas (nuevo)

1. **Botón "Marcar como despachado"**: sobre una orden sin `_hs_dispatched_at`, confirmar que crea la fila `scheduled` con la fecha correcta (`scheduled_for = now + delay_days`).
2. **Click duplicado del mismo botón** (doble click, o dos pestañas del admin abiertas): confirmar que la segunda llamada no reprograma ni crea una segunda fila.
3. **"Deshacer despacho"** mientras la solicitud sigue `scheduled`: confirmar que borra el meta de la orden, desprograma la acción, y borra la fila — y que después de deshacer, `mark_dispatched()` se puede volver a llamar y arranca de cero correctamente (no queda ningún residuo que lo bloquee).
4. **"Deshacer despacho" intentado sobre una solicitud ya `sent`**: debe devolver `409` y no alterar nada — confirmar que el único camino válido ahí es `cancel`.
5. **Transición de estado a `enviado` vía el dropdown existente de `/admin/pedidos`**: confirmar que dispara `mark_dispatched(..., 'status_enviado')` end-to-end, sin tocar el código de `set-status/route.ts` (el hook vive en PHP, escuchando `woocommerce_order_status_changed`).
6. **Orden cancelada/reembolsada después del despacho pero antes del envío**: confirmar que la acción programada se cancela (comportamiento ya cubierto en la v1, revalidar que sigue funcionando con el nuevo `mark_dispatched`).

## 6. Pruebas de integración manuales (contra producción, datos controlados)

Sin cambios de fondo respecto de la v1, actualizado para reflejar el nuevo flujo de despacho y el secreto server-side:

1. Crear una orden de prueba real con productos distintos, incluyendo si es posible un regalo de Purchase Gift (para validar la exclusión) y, si el catálogo lo permite, dos variaciones del mismo producto padre (para validar la deduplicación).
2. Usar el botón "Marcar como despachado" (no forzar vía `_tracking_number`, que ahora es opcional/configurable) para disparar el flujo.
3. Confirmar en `WooCommerce → Estado → Logs` (fuente `hs-reviews`) que se programó la acción con el delay correcto.
4. Forzar un delay corto vía filtro o ejecutar manualmente por WP-CLI para no esperar días reales.
5. Confirmar que el email llega **solo después de haber validado el §2** (test de entrega) — si el §2 todavía no se completó, este paso se salta y se marca explícitamente como bloqueado.
6. Abrir el link real (`hypestyle.com.ar/review/{token}`, no localhost) y confirmar: se ven los productos comprados elegibles (sin el regalo, con una sola entrada por producto padre si había variaciones duplicadas), formulario funcional.
7. Confirmar que las llamadas del navegador van solo a `/api/reviews/*` de Next.js (inspeccionar network tab) — nunca directo a `hypestyle-reviews/v1/reviews/*` de WordPress.
8. Enviar una reseña de un producto, dejar otro sin calificar.
9. Confirmar: reseña en Productos → Reseñas, **siempre pendiente** (`comment_approved=0`) sin importar el setting global de moderación del sitio; meta `_hs_incentivized_review`/`_review_variation_id`/etc. presentes; se generó exactamente un cupón; llegó el email de confirmación.
10. Reintentar el mismo submit (mismo token) — debe devolver el mismo resultado (mismo cupón), no error, no duplicado (ver §4.3).
11. Probar vía curl directo contra `hypestyle-reviews/v1/reviews/{token}/submit` **sin el header del secreto** — debe devolver `401` sin importar que el token sea válido.
12. Probar cancelación y "deshacer despacho" (§5.3-5.4).
13. Probar reembolso posterior a la apertura del link — confirmar rechazo del submit.
14. Probar panel admin: buscar, reenviar (confirmar que rota el token de la misma fila, no crea otra), cancelar, ver logs.
15. Limpieza de datos de prueba.

## 7. Pruebas de carga (opcional para v1)

Sin cambios respecto de la v1 — no bloqueante dado el volumen actual de Hypestyle.

## 8. Criterio de salida

- [ ] Todas las pruebas de las secciones 4, 5 y 6 pasadas sin intervención manual de corrección.
- [ ] **Test de entrega de email (§2) confirmado con un mensaje real llegando a una bandeja de Gmail**, no solo `wp_mail()` devolviendo `true`.
- [ ] Cero errores nuevos en el log de PHP atribuibles al plugin durante al menos 48hs con el flag activado solo en órdenes de prueba.
- [ ] Confirmado que el flujo de Andreani/tracking existente sigue funcionando exactamente igual (el dispatcher es un observador opcional, no reemplaza nada).
- [ ] Ninguna fila quedó en `processing` por más de unos segundos durante las pruebas de concurrencia.
- [ ] Diff completo del plugin + resultados de las pruebas locales mostrados al usuario antes de cualquier merge o subida a producción (requisito explícito del usuario, sin excepción).
- [ ] Aprobación explícita del usuario para pasar de "activado en órdenes de prueba, sin email real" a "email real activado" (§2), y luego a "activado para el 100% del tráfico".
