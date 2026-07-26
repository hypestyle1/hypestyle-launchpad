# Purchase Gift — plan de pruebas manual

No hay framework de tests automatizados para este flujo (headless + WooCommerce real, sin staging). Todo esto es manual, contra el sitio real, en `campaign_state = shadow` o `test` antes de pasar a `live`. Marcar cada casillero al ejecutarlo.

## Frontend

- [ ] Debajo del primer nivel — no aparece ninguna línea de regalo.
- [ ] Exactamente en el nivel — aparece automáticamente, sin click del usuario.
- [ ] Entre niveles — se mantiene el regalo del nivel alcanzado, la barra muestra el progreso al siguiente.
- [ ] Cambio a nivel superior — la línea vieja se reemplaza por la nueva (no quedan las dos).
- [ ] Regreso a nivel inferior (se saca un producto pago) — el regalo se reemplaza por el del nivel inferior, o se elimina si no queda ninguno.
- [ ] Regalo agregado automáticamente — confirmar que no depende de ningún botón.
- [ ] Regalo eliminado automáticamente al bajar del primer umbral.
- [ ] Refresh de la página con el umbral ya alcanzado — la barra y el regalo se recalculan igual.
- [ ] Recuperación desde `localStorage` (cerrar pestaña, volver a abrir) — el regalo persistido se corrige (o se confirma) apenas `useGiftProgress` vuelve a evaluar.
- [ ] Carrito abierto en dos pestañas — cambios en una no rompen la otra al volver a foco (cada pestaña reevalúa contra su propio estado).
- [ ] Un request viejo no pisa un resultado nuevo (cambiar de nivel rápido, ej. agregar y sacar un producto seguido) — confirmar que la barra queda en el estado correcto final, no en uno intermedio.
- [ ] Endpoint temporalmente caído (simular WP apagado o `HPG_SECRET` mal cargado) — la barra desaparece (`active:false`), el carrito sigue funcionando normal, no hay error visible.
- [ ] Campaña desactivada (`campaign_state=disabled`) — no aparece nada, sin excepción.
- [ ] Producto de regalo sin stock — usa el alternativo si existe, o muestra `available:false` sin agregar la línea.
- [ ] Regalo alternativo — confirmar que se muestra el alternativo, no el principal agotado.
- [ ] Línea bloqueada — sin botones de +/−/eliminar en `CartDrawer.tsx`.
- [ ] Regalo excluido del total visual y del contador de ítems del carrito (badge).
- [ ] El regalo no cuenta para el 3x2 ni para CAMPEON50 (agregar productos + regalo, confirmar que las unidades gratis del 3x2 no incluyen la línea de regalo).

## Backend

- [ ] Mu-plugin (`create-order`) — orden real creada con la línea de regalo, metadata completa, total $0 en esa línea.
- [ ] GoCuotas (`create-order-gocuotas`) — ídem, vía `POST /wc/v3/orders`.
- [ ] Internacional (`create-order-intl`) — ídem.
- [ ] Cupón válido — se aplica, el monto elegible lo refleja.
- [ ] Cupón inválido/inexistente — se ignora sin romper la creación de la orden.
- [ ] Descuento fijo (fee negativo, flujo mu-plugin) — el monto elegible lo resta correctamente.
- [ ] Descuento porcentual (cupón `percent`) — ídem.
- [ ] Precio promocional (`sale_price` vigente) — el monto elegible usa el precio real, no uno viejo.
- [ ] Producto excluido (`excluded_product_ids`) — no suma al monto elegible.
- [ ] Categoría excluida (`excluded_category_ids`) — ídem.
- [ ] Regalo sin stock — no bloquea la orden, sigue sin ese regalo (o con alternativo).
- [ ] Alternativo — se agrega el alternativo cuando el principal no tiene stock.
- [ ] Doble ejecución del motor (`apply_to_order()` llamado dos veces sobre la misma orden, en un script aislado) — no duplica líneas.
- [ ] Orden cancelada — el stock del regalo se restaura igual que un producto normal (comportamiento nativo de WooCommerce, confirmar que nada lo interfiere).
- [ ] Reembolso — ídem.
- [ ] Payload con precio manipulado (mandar `price` distinto al real en `items`) — el backend ignora ese valor, usa el real de WooCommerce.
- [ ] Payload con regalo falso (`isGift:true`, `giftProductId`, etc. en el body) — se descarta antes de llegar a WordPress; aunque llegara, el backend nunca lo lee para decidir el regalo.
- [ ] Product ID inválido en el carrito — se ignora esa línea sin romper el cálculo.
- [ ] Variación inválida (no pertenece al producto padre) — se ignora esa línea.

## Nota sobre alcance

Cart/Checkout Blocks y el checkout clásico de WooCommerce no aplican — Hypestyle es headless, esos flujos no existen en este sitio (ver `docs/purchase-gift-audit.md` §1).

## Evidencia a juntar antes de mergear el PR

- [ ] Diff del mu-plugin (`hypestyle-api.php`).
- [ ] Diff de los archivos del plugin (`PHP/hypestyle-purchase-gift/`).
- [ ] Punto exacto donde cada flujo llama al Gift Engine (capturas o líneas citadas).
- [ ] Payload real enviado a `/api/gift-progress` y response real de `/wp-json/hypestyle-gift/v1/evaluate`.
- [ ] Estado local del regalo en `CartContext` (React DevTools o `localStorage`).
- [ ] Prueba de que el payload de creación de orden excluye la línea de regalo (Network tab).
- [ ] Orden real creada por cada uno de los 3 flujos, con la línea de regalo y su metadata visibles en el admin de WooCommerce.
- [ ] Confirmación de que el total de esa línea es $0.
- [ ] Confirmación de que el stock se reduce una sola vez.
- [ ] Resultado de ejecutar `apply_to_order()` dos veces sobre la misma orden (no duplica).
- [ ] Logs de shadow mode.
- [ ] Prueba de modo test (email en la allowlist vs. fuera de ella).
- [ ] Riesgos pendientes conocidos.
- [ ] Instrucciones de rollback (desactivar el plugin es seguro — ver README del plugin).
