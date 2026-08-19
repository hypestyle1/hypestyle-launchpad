/**
 * Umbral de envío gratis para Argentina — fuente única.
 *
 * Lo usan el checkout (para poner el costo en 0) y el CartDrawer (para la barra
 * de progreso). Antes vivía duplicado como literal en los dos archivos y en el
 * copy de la AnnouncementBar, que es exactamente cómo se desincronizan.
 *
 * IMPORTANTE: tiene que coincidir con `envio_gratis_monto` del plugin de
 * Andreani en WooCommerce (Ajustes → Envíos → Argentina → Andreani Envios).
 * Si los dos números difieren, el checkout del sitio promete una cosa y
 * cualquier otro camino de compra cobra otra.
 *
 * El texto visible de la barra de anuncios está en AnnouncementBar.tsx y sus
 * traducciones en lib/i18n.ts: al cambiar este número hay que actualizarlos.
 */
export const FREE_SHIPPING_THRESHOLD = 180000;
