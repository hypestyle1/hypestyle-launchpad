// Sistema de grilla del home — una sola definición para todas las secciones de
// producto (New In, Básicos, SALE, Más Hype).
//
// POR QUÉ 2 Y 4 COLUMNAS, SIN 3:
// las secciones venían con `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`. Con tres
// breakpoints distintos no existe ninguna cantidad de productos que cierre en
// los tres a la vez (12 cierra en 2/3/4, pero cualquier lista filtrada por stock
// deja de ser 12), así que en algún ancho la última fila siempre quedaba con
// celdas vacías. Con 2 y 4 columnas alcanza con que la cantidad sea múltiplo de
// 4 para que no haya huecos en ningún ancho.
export const HOME_GRID = 'grid grid-cols-2 lg:grid-cols-4 gap-[2px]';

/**
 * Recorta una lista para que llene filas completas en la grilla del home.
 *
 * Las listas de producto se filtran en runtime (stock, descuento vigente), así
 * que su largo final no se puede fijar desde el config: hay que recortarlo acá.
 * Antes que mostrar una última fila con un producto solo y tres huecos al lado,
 * ese producto no se muestra — sigue estando en su página de colección.
 *
 * Con menos de 4 productos se recorta a par, que es lo que cierra en mobile.
 */
export function filasCompletas<T>(list: T[]): T[] {
  if (list.length < 4) return list.slice(0, list.length - (list.length % 2));
  return list.slice(0, Math.floor(list.length / 4) * 4);
}
