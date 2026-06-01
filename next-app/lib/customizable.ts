// Productos con personalización de dorsal (nombre + número).
// WooCommerce no expone este flag, así que lo mapeamos por slug.
// Compartido entre useProduct (detalle), products-normalize (cards) y la UI.
export const CUSTOMIZABLE_SLUGS = new Set<string>([
  'la-nuestra-jersey-mundial-26',
]);
