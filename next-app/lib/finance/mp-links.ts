// Links al panel de vendedor de Mercado Pago. Vive fuera de las rutas porque
// un route.ts de Next sólo puede exportar handlers.

/** Link a la operación en "Actividad" del panel de MP, buscando por id de
 *  pago. Es la única URL estable: el detalle directo cambia con la versión
 *  del panel. */
export function mpActivityUrl(paymentId: string): string {
  return `https://www.mercadopago.com.ar/activities?q=${encodeURIComponent(paymentId)}`;
}
