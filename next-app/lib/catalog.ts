import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { unstable_cache } from 'next/cache';
import { crearCortacircuitos } from '@/lib/wp-cortacircuitos';
import { fetchAllProductsDentroDeCache } from '@/lib/products-server';
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
 * Incidente MySQL/Hostinger 4/11/2026 (16:07–16:2x): con WordPress lento, cada
 * regeneración de ISR de un listado volvía a pedir el catálogo y ESPERABA la
 * respuesta — así se comporta `fetch` con `next.revalidate` cuando la página
 * se está regenerando (next/dist/server/lib/patch-fetch.js: "when stale and is
 * revalidating we wait for fresh data"). La consulta se cortaba a los 15 s, la
 * regeneración fallaba, la visita siguiente lo intentaba otra vez, y PHP seguía
 * procesando los pedidos abortados: se ocuparon todos los procesos PHP.
 *
 * `unstable_cache` hace lo contrario: devuelve el último catálogo bueno al
 * instante y lo actualiza en segundo plano; si esa actualización falla, el
 * guardado sigue sirviendo (next/dist/server/web/spec-extension/unstable-cache.js).
 * El cortacircuitos evita además que las actualizaciones en segundo plano
 * insistan contra un WordPress caído: 1 intento a la vez y, tras una falla,
 * 60 s de pausa. Un solo intento de hasta 25 s en vez de 4 de 15 s.
 */
const proteger = crearCortacircuitos(60_000);

async function leerCatalogoPublico(): Promise<NormalizedProduct[]> {
  const productos = await proteger(() => fetchAllProductsDentroDeCache({ retries: 0, timeoutMs: 25_000 }));
  return productos.filter(p => !SLUGS_INTERNOS.has(p.slug));
}

const catalogoCompartido = unstable_cache(leerCatalogoPublico, ['catalogo-ssr-v1'], { revalidate: 60 });

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
 * Si WordPress falla (HTTP de error, sin datos, timeout o la paginación cortada
 * a la mitad) NO se devuelve una lista vacía como si fuera el catálogo: el
 * 13/10/2026 una regeneración de ISR con WP caído dejó varios listados
 * cacheados con 0 productos en el HTML, que es lo que ve Google.
 *
 * - En runtime (regeneración de ISR) el error se propaga: Next descarta esa
 *   regeneración y sigue sirviendo la última versión buena hasta que WP vuelva.
 *   No es info vieja presentada como actual: el navegador igual pide
 *   /api/products y pinta el stock y el precio del momento.
 * - En el build devuelve [] para no tirar el deploy por un WP lento: la página
 *   sale como antes de #550 (la grilla la carga el cliente) y se rehace sola en
 *   la primera regeneración (revalidate = 60).
 *
 * Un catálogo vacío de verdad (WP responde OK sin productos) sí devuelve [].
 */
export async function fetchCatalogForSsr(): Promise<NormalizedProduct[]> {
  try {
    return await catalogoCompartido();
  } catch (err) {
    // Solo el mensaje: el error de fetch puede traer la request entera.
    const motivo = err instanceof Error ? err.message : String(err);
    if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
      console.error(`[catalog] build sin catálogo (${motivo}); la grilla la carga el cliente y la página se rehace en la próxima regeneración`);
      return [];
    }
    console.error(`[catalog] WordPress no respondió (${motivo}); se conserva la última versión del listado`);
    throw err;
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
