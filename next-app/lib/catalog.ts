import { fetchAllProducts } from '@/lib/products-server';
import { productsForCategory, type CategoryConfig } from '@/lib/category-config';
import type { NormalizedProduct } from '@/lib/products-normalize';

// Productos internos: existen en Woo pero no son parte del catálogo público.
// `catalog_visibility: hidden` no alcanza para sacarlos del sitio — la query
// filtra por `status`, no por visibilidad, así que /api/products y los
// listados de abajo son los que deciden qué ve el sitio.
//
// par-de-medias-hype (3000) es el regalo del Purchase Gift. Tiene que estar
// `publish` porque el motor del plugin llama a `is_purchasable()`, que rechaza
// los `private` — por eso no se puede esconder del lado de WordPress como sí
// se hace con las pilas de blanks del stock compartido.
//
// gift-card (3012) es la gift card: se compra desde /gift-cards con su propia
// UI de monto, no desde una card del catálogo.
//
// sleeveless-ranglan (1046) junta los cuatro colores en un solo producto con
// el mockup blanco de portada. Los cuatro colores ya existen como productos
// propios (sleeveless-ranglan-white / -black / -grey / -militar-green), así
// que en la grilla la blanca salía dos veces. No se despublica en Woo: se
// saca de acá.
export const SLUGS_INTERNOS = new Set(['par-de-medias-hype', 'gift-card', 'sleeveless-ranglan']);

/**
 * Catálogo para el HTML inicial de los listados, para que Google vea las cards
 * y sus links sin ejecutar JS. Sale de la misma consulta server que ya usan la
 * home y /special-prices (lib/products-server.ts) y deja afuera los mismos
 * productos internos que /api/products, así el HTML coincide con lo que el
 * navegador pinta después.
 *
 * Solo trae productos `status: "publish"`: los privados (preventa / Private
 * Access) nunca pasan por acá.
 *
 * Es solo la primera pintada: en el navegador useProducts lo toma como
 * `placeholderData` y pide /api/products igual que siempre, así que el stock y
 * los precios que quedan en pantalla son los de ese pedido.
 *
 * Si WordPress falla devuelve una lista vacía: la página queda como antes de
 * este cambio (la grilla la carga el cliente) en vez de dar error.
 */
export async function fetchCatalogForSsr(): Promise<NormalizedProduct[]> {
  try {
    return (await fetchAllProducts()).filter(p => !SLUGS_INTERNOS.has(p.slug));
  } catch (err) {
    console.error('[catalog] SSR sin catálogo, la grilla la carga el cliente:', err);
    return [];
  }
}

/** Los productos de una categoría o colección de CategoriaPage. */
export async function initialProductsFor(config: CategoryConfig): Promise<NormalizedProduct[]> {
  return productsForCategory(await fetchCatalogForSsr(), config);
}

/** Para colecciones armadas a mano por slug (CollectionGroupedPage, FW26). */
export async function initialProductsBySlugs(slugs: string[]): Promise<NormalizedProduct[]> {
  const wanted = new Set(slugs);
  return (await fetchCatalogForSsr()).filter(p => wanted.has(p.slug));
}

/** Para listados por tag de Woo (new-in, best-seller). */
export async function initialProductsByTag(tag: string): Promise<NormalizedProduct[]> {
  return (await fetchCatalogForSsr()).filter(p => p.tags.includes(tag));
}
