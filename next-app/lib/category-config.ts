/**
 * Config de las páginas de categoría y colección que renderiza CategoriaPage.
 *
 * Vive acá (y no dentro del componente) porque los wrappers de app/ son server
 * components y necesitan el título y la descripción para generar el <title>, la
 * meta description y el canonical de cada página. Antes esto estaba adentro de
 * CategoriaPage, que es 'use client', así que ninguna categoría podía declarar
 * metadata propia y todas servían el título y el canonical de la home.
 */

export interface SubTab { label: string; categories: string[] }

export interface CategoryConfig {
  title: string;
  subtitle: string;
  /** Texto de la meta description. El subtitle es demasiado corto para SERP. */
  seoDescription: string;
  categories: string[];
  tag?: string;
  tabs?: SubTab[];
}

export const CATEGORY_MAP: Record<string, CategoryConfig> = {
  '/colecciones/no-love-only-style': {
    title: 'No Love Only Style',
    subtitle: 'Colección exclusiva — drops limitados',
    seoDescription: 'No Love, Only Style: el primer drop de la era HYPESTYLE. Gráficos crudos, actitud sin filtro, producción limitada.',
    categories: [], tag: 'no-love-only-style',
  },
  '/colecciones/camo-set-drop': {
    title: 'Camo Set Drop',
    subtitle: 'Set completo en camo print',
    seoDescription: 'Camo Set Drop: set completo en camo full print. Cargo fit, entretela polar y cremallera YKK. Edición limitada.',
    categories: [], tag: 'camo-set-drop',
  },
  '/colecciones/race': {
    title: 'Race',
    subtitle: 'Motorsport · Estética vintage racing',
    seoDescription: 'Colección Race: motorsport y estética vintage racing. Race Tee, hoodie y accesorios de edición limitada.',
    categories: [], tag: 'race',
  },
  '/colecciones/summer-26': {
    title: "Summer '26",
    subtitle: 'La colección de verano',
    seoDescription: "Summer '26: mesh, fileteado y jorts para el verano. La colección más caliente de HYPESTYLE.",
    categories: [], tag: 'summer-26',
  },
  '/colecciones/regular-tees': {
    title: 'Regular Tees',
    subtitle: 'Remeras de corte regular — básicos premium',
    seoDescription: 'Regular Tees: básicos que no son básicos. 100% algodón, corte regular perfecto, siempre disponibles.',
    categories: [], tag: 'regular-tee',
  },
  '/arriba': {
    title: 'Arriba',
    subtitle: 'Hoodies, remeras, longsleeves y más',
    seoDescription: 'Hoodies, remeras, longsleeves, sleeveless y jerseys de HYPESTYLE. Streetwear argentino con envíos a todo el mundo.',
    categories: ['Hoodie', 'Crewneck', 'Tee', 'Top', 'Sleeveless', 'Longsleeve', 'Jersey'],
    tabs: [
      { label: 'Todo', categories: [] }, { label: 'Hoodies', categories: ['Hoodie', 'Crewneck'] },
      { label: 'Remeras', categories: ['Tee'] }, { label: 'Longsleeves', categories: ['Longsleeve'] },
      { label: 'Sleeveless', categories: ['Sleeveless', 'Top'] }, { label: 'Jersey', categories: ['Jersey'] },
    ],
  },
  '/abajo': {
    title: 'Abajo',
    subtitle: 'Pantalones y jorts',
    seoDescription: 'Pantalones, joggers y jorts de HYPESTYLE. Cargo fit y jogger fit, producción limitada. Envíos a todo el mundo.',
    categories: ['Pantalón', 'Jort'],
    tabs: [{ label: 'Todo', categories: [] }, { label: 'Pantalones', categories: ['Pantalón'] }, { label: 'Jorts', categories: ['Jort'] }],
  },
  '/accesorios': {
    title: 'Accesorios',
    subtitle: 'Gorras, anillos, beanies y más',
    seoDescription: 'Gorras, beanies, anillos y accesorios de HYPESTYLE. Talle único, edición limitada. Envíos a todo el mundo.',
    categories: ['Accesorio'],
  },
  '/sets': {
    title: 'Sets & Packs',
    subtitle: 'Combos y packs de edición limitada',
    seoDescription: 'Sets y packs de HYPESTYLE: combos completos de hoodie y pantalón a precio de conjunto. Edición limitada.',
    categories: ['Set', 'Pack'],
    tabs: [{ label: 'Todo', categories: [] }, { label: 'Sets', categories: ['Set'] }, { label: 'Packs', categories: ['Pack'] }],
  },
  '/productos': {
    title: 'Todos los productos',
    subtitle: 'Drops limitados · Envíos a todo el mundo',
    seoDescription: 'El catálogo completo de HYPESTYLE: hoodies, remeras, pants, jorts, sets y accesorios. Drops limitados, envíos a todo el mundo.',
    categories: [],
  },
  '/tees': {
    title: 'Tees',
    subtitle: 'Remeras y tops',
    seoDescription: 'Remeras y tops de HYPESTYLE. Boxy fit y regular fit, 100% algodón, estampas de edición limitada.',
    categories: ['Tee', 'Top'],
  },
  '/hoodies': {
    title: 'Hoodies',
    subtitle: 'Hoodies y crewnecks',
    seoDescription: 'Hoodies y crewnecks de HYPESTYLE. Corte boxy oversized, frisa premium, drops limitados. Envíos a todo el mundo.',
    categories: ['Hoodie', 'Crewneck'],
  },
  '/pants': {
    title: 'Pants',
    subtitle: 'Pantalones y joggers',
    seoDescription: 'Pantalones y joggers de HYPESTYLE. Jogger fit y cargo fit, frisa premium. Combinan con los hoodies de la temporada.',
    categories: ['Pantalón'],
  },
  '/jorts': {
    title: 'Jorts',
    subtitle: 'Jorts y shorts',
    seoDescription: 'Jorts y shorts de HYPESTYLE. Corte ancho, denim y frisa, producción limitada. Envíos a todo el mundo.',
    categories: ['Jort'],
  },
};

/** Config de una ruta, o undefined si el path no es una categoría conocida. */
export function getCategoryConfig(path: string): CategoryConfig | undefined {
  return CATEGORY_MAP[path.replace(/\/$/, '')];
}
