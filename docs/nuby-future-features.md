# Futuras funciones inspiradas en Nuby — evaluación (sin desarrollar)

Evaluación de las funciones de [nubyapp.com](https://nubyapp.com/es) que quedan **fuera de esta tarea**. Ninguna se implementó — es únicamente un análisis para priorizar trabajo futuro. No se copió código, marca ni recursos de Nuby; esto es una lectura conceptual de qué problema resuelve cada función y cómo se vería aplicada a Hypestyle.

Para cada una: problema que resuelve, dificultad, si ya existe una solución confiable para WooCommerce, si conviene desarrollar interno o instalar una integración, riesgos, prioridad recomendada.

## Reseñas automáticas

- **Problema que resuelve:** juntar reseñas sin pedirlas manualmente una por una.
- **Dificultad:** media. WooCommerce tiene reseñas de producto nativas; falta el disparo automático post-entrega.
- **Solución existente confiable:** sí — plugins de reviews para WooCommerce hay varios maduros (ej. los que se integran con Klaviyo, que **ya está instalado** en este sitio, ver auditoría §3).
- **Recomendación:** revisar primero si Klaviyo (ya activo) puede cubrir el flujo de solicitud de reseña vía email antes de sumar otro plugin.
- **Riesgos:** bajo.
- **Prioridad:** media-alta — es la función de Nuby más directamente aprovechable con lo que ya está instalado.

## Solicitud de reseña después de la entrega

- **Problema que resuelve:** pedir la reseña en el momento correcto (post-entrega, no post-compra), cuando el cliente ya probó el producto.
- **Dificultad:** media — requiere saber cuándo se entregó, no solo cuándo se despachó. Hoy el tracking de Andreani tiene problemas conocidos (ver memoria del proyecto: guías/eventos no siempre llegan solos a Woo), así que "entrega confirmada" no es un dato 100% confiable todavía en este sitio.
- **Solución existente:** depende de resolver primero el tracking.
- **Recomendación:** no priorizar hasta que el tracking de Andreani sea confiable, o disparar por tiempo transcurrido desde el envío como proxy.
- **Riesgos:** medio — mandar el pedido de reseña antes de que llegue el producto genera mala experiencia.
- **Prioridad:** baja, bloqueada por otro problema del proyecto.

## Reseñas con fotos o videos

- **Problema que resuelve:** prueba social más persuasiva que texto solo.
- **Dificultad:** media, depende del plugin de reviews elegido (no todos soportan adjuntos).
- **Solución existente:** sí, varios plugins de reviews para Woo soportan media.
- **Recomendación:** evaluar junto con el punto de "reseñas automáticas", no por separado.
- **Riesgos:** moderación de contenido (alguien podría subir algo inapropiado) — necesita revisión manual antes de publicar.
- **Prioridad:** media.

## Cupones por reseña

- **Problema que resuelve:** incentivo para que el cliente efectivamente deje la reseña.
- **Dificultad:** baja — el proyecto ya genera cupones custom vía `WC_Coupon` (ver `hype-wally-coupons`, plugin propio ya en producción). Extenderlo a "cupón automático al dejar reseña" es directo con ese mismo patrón.
- **Solución existente:** se puede resolver 100% con la API nativa de cupones, sin plugin externo.
- **Recomendación:** desarrollo interno, reutilizando el patrón de `hype-wally-coupons`.
- **Riesgos:** bajo.
- **Prioridad:** media-alta — bajo esfuerzo, encastra con lo ya construido.

## Notificaciones de reposición de stock ("avisame cuando vuelva")

- **Problema que resuelve:** capturar demanda de productos agotados en vez de perder la venta.
- **Dificultad:** media. Requiere un formulario en la ficha de producto (frontend Next.js) + guardado del pedido de aviso + disparo cuando el stock vuelve a estar disponible.
- **Solución existente:** hay plugins de WooCommerce para esto, pero como el frontend es headless (Next.js, no templates de WooCommerce — ver auditoría §2), un plugin pensado para inyectarse en la página de producto nativa de Woo **no serviría sin adaptación**, porque el cliente nunca ve esa página.
- **Recomendación:** desarrollo interno — un endpoint propio (mismo patrón que el resto de la API headless) + un hook en `woocommerce_product_set_stock`/`woocommerce_variation_set_stock` para disparar el aviso (Klaviyo, ya instalado, o WP Mail SMTP, también ya instalado).
- **Riesgos:** bajo-medio (hay que evitar mandar el aviso más de una vez).
- **Prioridad:** media.

## Alertas por WhatsApp y email

- **Problema que resuelve:** canal de reactivación de clientes.
- **Dificultad:** alta para WhatsApp (requiere una cuenta de WhatsApp Business API aprobada). **Ya hay un chatbot de WhatsApp/Instagram en este proyecto** (ver memoria: bot activo en IG, WhatsApp nunca se conectó — no hubo cuenta 360dialog). Reutilizar esa infraestructura para alertas salientes es un proyecto en sí mismo, no una función chica.
- **Solución existente:** para email, sí (Klaviyo/Brevo, ya instalados). Para WhatsApp, no hay nada armado todavía.
- **Recomendación:** email primero (bajo esfuerzo, infraestructura lista); WhatsApp queda condicionado a resolver la conexión de la cuenta de negocio, que es un bloqueo externo ya documentado en el proyecto, no técnico.
- **Riesgos:** alto para WhatsApp (cuentas de WhatsApp Business pueden banearse por spam si no se maneja bien el opt-in).
- **Prioridad:** media para email, baja para WhatsApp hasta resolver el bloqueo de cuenta.

## Alertas de stock bajo (para el admin, no el cliente)

- **Problema que resuelve:** anticipar quiebres de stock antes de que pasen.
- **Dificultad:** baja. WooCommerce ya tiene un umbral de "stock bajo" nativo con notificación por email al admin — puede que ya esté parcialmente disponible sin desarrollar nada, solo configurando WooCommerce → Ajustes → Productos → Inventario.
- **Solución existente:** sí, nativa de WooCommerce.
- **Recomendación:** revisar la configuración nativa antes de construir nada custom.
- **Riesgos:** ninguno.
- **Prioridad:** alta, por lo bajo del esfuerzo (podría ser solo un ajuste, no una función nueva).

## Prueba social de compras recientes ("Fulano compró esto hace 5 min")

- **Problema que resuelve:** urgencia/confianza en el momento de decisión de compra.
- **Dificultad:** media — necesita un feed de compras recientes expuesto por la API y un widget en el frontend Next.js (no hay nada de esto reutilizable de WooCommerce nativo, ya que de nuevo el frontend es headless).
- **Solución existente:** no aplicable directo por el mismo motivo headless que las notificaciones de stock.
- **Recomendación:** desarrollo interno, endpoint propio + componente en Next.js, similar en espíritu a cómo se construyó Purchase Gift en esta tarea (REST propio + UI en Next.js).
- **Riesgos:** medio — hay que anonimizar bien los datos del comprador (nombre parcial, ciudad sin dirección) para no exponer información personal.
- **Prioridad:** media.

## Wishlist

- **Problema que resuelve:** guardar productos para después, reducir fricción de "no puedo comprarlo ahora".
- **Dificultad:** baja-media. Ya existe un ícono de "favoritos" en la navbar del sitio actual (visible en las capturas de esta sesión) — hay que confirmar si ya está funcional o es solo visual.
- **Solución existente:** depende de qué tan armado esté ya lo que se ve en la navbar.
- **Recomendación:** auditar primero si ya existe antes de proponerlo como nueva función.
- **Riesgos:** bajo.
- **Prioridad:** a confirmar según auditoría de lo ya existente.

## Barra fija de "agregar al carrito"

- **Problema que resuelve:** conversión en mobile, mantener el CTA visible al scrollear la ficha de producto.
- **Dificultad:** baja — es un componente de UI puro en Next.js, sin backend nuevo.
- **Solución existente:** no aplica (es frontend propio).
- **Recomendación:** desarrollo interno, bajo esfuerzo.
- **Riesgos:** ninguno relevante.
- **Prioridad:** media-alta, esfuerzo bajo con impacto directo en conversión mobile.

## Bundles

- **Problema que resuelve:** vender combos a un precio conjunto.
- **Dificultad:** media-alta. El proyecto YA tiene un caso de esto hecho a mano (el combo "CAMO FULL SET", que descuenta stock de sus dos componentes por separado — ver `PHP/hypestyle-api.php`). Generalizar esto a "cualquier bundle configurable" es un proyecto de tamaño similar a Purchase Gift, no una función chica.
- **Solución existente:** hay plugins de bundles para WooCommerce, pero de nuevo chocan con que el frontend es headless — igual habría que construir la parte de Next.js.
- **Recomendación:** evaluar si vale la pena generalizar el caso ya hardcodeado del combo Camo antes de construir un sistema nuevo desde cero.
- **Riesgos:** medio (la lógica de stock vinculado ya mostró ser delicada en el caso existente).
- **Prioridad:** baja-media, ya cubierto parcialmente para el único caso que existe hoy.

## Cross-sell

- **Problema que resuelve:** aumentar ticket sugiriendo productos relacionados.
- **Dificultad:** baja. **Ya existe** parcialmente: "Shop the Look" y "Completa el look" en el carrito ya sugieren productos (ver `ShopTheLook.tsx`, `CartDrawer.tsx`).
- **Solución existente:** sí, interna, ya construida.
- **Recomendación:** no es una función nueva — mejorar lo que ya existe (ej. hacerlo basado en categoría/co-compra real en vez de aleatorio, que es como funciona hoy) en vez de agregar algo paralelo.
- **Riesgos:** ninguno nuevo.
- **Prioridad:** baja como función nueva (ya existe); media como mejora de lo existente.

## Automatizaciones de carrito abandonado

- **Problema que resuelve:** recuperar ventas de carritos que no se completaron.
- **Dificultad:** ya resuelto. **Ya está en producción** (ver memoria del proyecto: cron de carrito abandonado activo, 3-72h, con deduplicación por cliente, cupón `HYPEVUELVE10`).
- **Solución existente:** sí, propia, ya funcionando.
- **Recomendación:** ninguna acción — monitorear el primer ciclo real como ya estaba pendiente, no es una función nueva a evaluar.
- **Riesgos:** ninguno nuevo.
- **Prioridad:** no aplica (ya implementado).

## Métricas de conversión

- **Problema que resuelve:** entender qué tan bien convierte el sitio, embudo completo.
- **Dificultad:** alta para hacerlo bien (requiere tracking de eventos consistente en todo el embudo). Hoy el pixel de Meta ya tuvo problemas de subreporte documentados (ver memoria: diagnóstico pixel/CAPI, ~1 de 14 ventas se atribuye bien).
- **Solución existente:** parcialmente — CAPI server-side para Purchase ya está andando; falta view_content/add_to_cart consistentes y una vista unificada.
- **Recomendación:** antes de invertir en un dashboard de conversión propio, terminar de cerrar el subreporte de Purchase que ya está diagnosticado (plan A/B/C documentado en la memoria del proyecto) — sin eso, cualquier métrica de conversión nueva hereda el mismo problema de datos.
- **Riesgos:** medio — decisiones de negocio basadas en datos de conversión no confiables.
- **Prioridad:** alta como *arreglo* de lo existente, no como función nueva hasta resolver eso.

## Resumen de prioridad recomendada (de mayor a menor)

1. Alertas de stock bajo — probable que ya exista nativo, solo falta configurarlo.
2. Cerrar el subreporte de conversión ya diagnosticado (prerequisito de cualquier métrica nueva).
3. Cupones por reseña — bajo esfuerzo, reutiliza `hype-wally-coupons`.
4. Barra fija de "agregar al carrito" — bajo esfuerzo, impacto directo en mobile.
5. Reseñas automáticas — evaluar Klaviyo primero.
6. Notificación de reposición de stock.
7. Prueba social de compras recientes.
8. Mejorar el cross-sell existente (no construir uno nuevo).
9. Wishlist — auditar qué tan hecho está ya.
10. Alertas por WhatsApp — bloqueado externamente (cuenta de negocio).
11. Bundles generalizados — evaluar generalizar el caso Camo antes de un sistema nuevo.
