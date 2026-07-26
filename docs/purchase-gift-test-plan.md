# Plan de pruebas — Hypestyle Purchase Gift

No hay ningún framework de testing instalado en este proyecto (ni PHPUnit del lado de WordPress, ni Jest/Vitest del lado de Next.js — verificado en la auditoría, `docs/purchase-gift-audit.md` §7). El brief permite explícitamente un plan de pruebas manual documentado en este caso. Cada escenario indica **qué mirar** y **dónde** (log del plugin, meta de la orden, pantalla de admin).

Dónde mirar en cada prueba:
- **Log del plugin**: `wp-content/hypestyle-purchase-gift-debug.log` (solo se escribe con `WP_DEBUG` activo o "Modo debug" tildado en Ajustes).
- **Meta de la orden**: WooCommerce → Pedidos → [pedido] → bloque "Purchase Gift" que agrega el plugin debajo de los datos del pedido.
- **Panel**: WooCommerce → Purchase Gift (niveles/ajustes), → Análisis de costos, → Métricas.

## Configuración sugerida para probar

Crear 2 o 3 niveles de prueba con montos bajos (ej. $1.000 / $2.000 / $3.000) sobre productos reales con stock, para no tener que armar carritos grandes. **Hacerlo con la campaña en un nombre de campaña de prueba claramente distinguible**, y desactivarla antes de irse de la sesión de pruebas si el sitio está en producción real (no hay staging — ver auditoría §7).

## Escenarios

1. **Carrito debajo del primer nivel.** Agregar productos por menos del monto del nivel 1. Esperado: barra visible en carrito/checkout mostrando "Sumá $X más...", sin ningún regalo al finalizar la compra (verificar en la orden creada: no aparece meta `_hpg_processed=yes` con líneas de regalo, o si aparece, `_hpg_levels_unlocked` vacío).
2. **Carrito exactamente en el primer nivel.** Mismo monto exacto del nivel 1. Esperado: barra marca el nivel 1 como alcanzado; la orden creada tiene una línea de producto a $0 con el nombre "— Regalo por compra".
3. **Carrito entre el primer y segundo nivel.** Esperado: en modo "nivel más alto" (default), el regalo entregado sigue siendo el del nivel 1; el mensaje de la barra apunta al nivel 2 con el remanente correcto.
4. **Carrito exactamente en el segundo nivel.** Esperado: en modo "nivel más alto", solo el regalo del nivel 2 (no el del 1 también). Cambiar a modo "acumulativo" y repetir: ahora deben aparecer DOS líneas de regalo (nivel 1 y nivel 2).
5. **Carrito por encima del último nivel.** Esperado: barra muestra "Desbloqueaste el regalo máximo"; se entrega el regalo de mayor monto (o todos, en acumulativo).
6. **Aplicar un cupón y perder el nivel.** Con el carrito justo en un nivel, aplicar un cupón que baje el monto elegible por debajo. Probar en los dos flujos de cupón del sitio (ver auditoría §4): (a) cupón aplicado como fee negativa en el flujo `create-order` normal (MP/PayPal/transferencia), y (b) cupón real (`coupon_lines`) en el flujo `create-order-gocuotas`. Esperado en ambos: el monto elegible baja correctamente y no se entrega el regalo si queda por debajo.
7. **Eliminar un cupón y recuperar el nivel.** Sacar el cupón antes de confirmar y volver a calificar. Esperado: la barra vuelve a mostrar el nivel alcanzado (esto solo se puede validar en la barra, ya que el "carrito" real de WooCommerce no existe hasta crear la orden — ver auditoría §2).
8. **Eliminar productos del carrito.** Sacar ítems hasta caer por debajo de un nivel ya mostrado como alcanzado en la barra. Esperado: la barra se actualiza sin necesidad de recargar toda la página (el hook `useGiftProgress` refetchea solo cuando cambia el contenido del carrito).
9. **Aumentar y reducir cantidades.** Igual que el punto anterior pero con +/- de cantidad en vez de eliminar la línea completa.
10. **Regalo principal sin stock.** Bajar el stock del producto de regalo del nivel más alto alcanzado a 0 (o marcarlo "Sin stock" en Woo) y crear una orden que califique. Esperado: si hay producto alternativo configurado y con stock, se entrega ese (verificar meta `_hpg_used_alternative=yes` en la línea del pedido). Revisar el log: debe quedar la entrada "Regalo principal sin stock, se usa alternativo".
11. **Producto alternativo disponible.** Confirmar en el punto anterior que el alternativo efectivamente aparece como línea real del pedido, a $0, con el nombre correcto.
12. **Todos los regalos sin stock.** Sacar el stock también del alternativo. Con `out_of_stock_behavior = fallback_to_lower_level` (default): debe entregarse el regalo de un nivel inferior que sí tenga stock. Con `no_gift`: no debe entregarse nada, y la orden debe quedar con una nota visible ("el cliente calificó... no había stock disponible") — revisar en WooCommerce → Pedidos → [pedido] → notas del pedido.
13. **Sesión restaurada.** Agregar productos, cerrar la pestaña, volver a abrir el sitio (el carrito persiste en `localStorage`, ver `CartContext.tsx`). Esperado: la barra vuelve a calcular el progreso correctamente sin duplicar nada (no hay nada que duplicar del lado del cliente, ya que el regalo nunca se agrega ahí — ver auditoría §6).
14. **Cliente invitado.** Completar una compra sin iniciar sesión, con "Aplica a usuarios invitados" activado y desactivado. Esperado: con el ajuste desactivado, un invitado que califica no recibe nada (verificar meta `_hpg_skip_reason = customer_excluded` en la orden).
15. **Cliente registrado.** Repetir con un usuario logueado normal (sin rol/meta de exclusión). Esperado: recibe el regalo con normalidad.
16. **Rol mayorista excluido.** Con "Excluir clientes mayoristas" activado, probar con un cliente que tenga la meta `es_mayorista = yes` (ver `mayorista-login` en el mu-plugin existente). Esperado: no recibe regalo aunque el monto califique.
17. **Checkout mobile.** Repetir el escenario 2 (nivel exacto) desde un viewport mobile. Verificar que la barra se ve completa, sin overflow horizontal, y que los ticks de milestone no se solapan con el texto.
18. **Checkout desktop.** Igual que el anterior, en desktop.
19. **Checkout Blocks.** **No aplica** — el sitio no usa Cart/Checkout Blocks (ver auditoría §2); se documenta como "no aplica" en vez de omitirse en silencio.
20. **Checkout clásico.** **No aplica** por el mismo motivo — el comprador nunca ve el checkout clásico de WooCommerce.
21. **Creación del pedido.** Repetir la creación de una orden calificada en LOS TRES flujos posibles (ver auditoría §2): `create-order` (MercadoPago/PayPal/transferencia), `create-order-gocuotas`, `create-order-intl`. Esperado: el regalo se agrega en los tres, confirmando que enganchar `woocommerce_new_order` cubre los tres caminos (era el punto más importante a validar de toda la arquitectura).
22. **Cancelación del pedido y restauración de stock.** Cancelar una orden con regalo entregado desde el admin. Esperado: WooCommerce restaura el stock de la línea de regalo automáticamente, igual que cualquier otro ítem — no hace falta código propio para esto porque el regalo es un `WC_Order_Item_Product` real (confirmar igual mirando el stock del producto de regalo antes/después de cancelar).
23. **Reembolso.** Reembolsar (parcial o total) una orden con regalo. Esperado: comportamiento nativo de WooCommerce sobre la línea del regalo (mismo motivo que el punto anterior).
24. **Pedido fallido.** Simular un pago rechazado / orden que nunca pasa de `pending`/`failed`. Esperado: la orden igual queda con el regalo asignado en el momento de creación (el brief pide que el regalo dependa del monto elegible de productos, no del método de pago ni del estado de pago) — confirmar que esto es aceptable o si el negocio prefiere no entregar el regalo hasta el pago confirmado (ver nota abajo).
25. **Carrito con varios productos y descuentos combinados.** Combinar cupón + producto en oferta + varias unidades de distintos productos, con "Los productos en promoción suman" activado y desactivado, para confirmar que el monto elegible excluye correctamente lo que corresponde en cada combinación.

## Nota de negocio pendiente de decidir

El punto 24 expone una decisión de negocio, no técnica: **hoy el regalo se asigna en el momento en que se CREA la orden (estado `pending`), no cuando se CONFIRMA el pago.** Esto es consistente con cómo ya se maneja el stock en este sitio (`wc_reduce_stock_levels()` también se llama inmediatamente al crear la orden en el flujo `create-order`, antes de la confirmación de MercadoPago — ver `PHP/hypestyle-api.php`). Si se prefiere que el regalo solo se confirme cuando el pago se acredita, hay que decidir en qué hook enganchar en cambio (`woocommerce_order_status_changed` a `processing`/`completed`) — es un cambio simple de un solo hook si se decide después, pero cambia cuándo se "gasta" stock del regalo en pedidos que después fallan.
