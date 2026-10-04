/**
 * Shop the look — sesión de estudio SS27 (02/10/2026).
 *
 * Acá va solo lo editorial: fotos y slugs. Nombre, precio, tachado, miniatura
 * y stock salen del catálogo de Woo (la query ['products'] que el home ya
 * precarga en el servidor), así que no se desactualizan.
 *
 * `pendiente`: datos de respaldo mientras el producto no está publicado (los
 * de SS27 se cargaron en Woo como privados el 04/10). Mientras el slug no
 * aparece en el catálogo público, la prenda se muestra con este nombre, la
 * destacada de Woo y "Próximamente", sin precio ni link. Cuando se publica,
 * toma los datos reales sola.
 *
 * Fotos: 960x1280 (3:4) en public/looks/ss27/, exportadas de los originales de
 * `Redes & Pauta/CONTENT SS27/ESTUDIO`. Orden de los ángulos: frente, perfil,
 * espalda, detalle. Cada look tiene además <id>-lineup.webp, el frente achicado
 * a 420x560 para la tira de arriba.
 */

export type Angulo = 'frente' | 'perfil' | 'espalda' | 'detalle';
/** 'lineup' es el frente en chico (420x560) para la tira de arriba. */
export type FotoLook = Angulo | 'lineup';

export interface LookItem {
  slug: string;
  pendiente?: { name: string; category: string; miniatura?: string };
}

export interface Look {
  id: string;
  /** Nombre corto para el pie del line-up y el título del panel. */
  etiqueta: string;
  modelo: 'ella' | 'el';
  angulos: Angulo[];
  /** La primera es la prenda principal: le da el nombre al look. */
  items: LookItem[];
}

export const lookFoto = (look: Look, angulo: FotoLook) => `/looks/ss27/${look.id}-${angulo}.webp`;

const TODOS: Angulo[] = ['frente', 'perfil', 'espalda', 'detalle'];

// Ya publicados.
const SWEAT_GREY: LookItem = { slug: 'sweatpant-grey-hstars' };
const SWEAT_BLACK: LookItem = { slug: 'sweatpant-black-hstars' };
const REGULAR_NAVY: LookItem = { slug: 'regular-tee-navy' };

// SS27: cargados en Woo, privados hasta la apertura.
const ss27 = (slug: string, name: string, category: string, miniatura: string): LookItem => ({
  slug,
  pendiente: { name, category, miniatura },
});

const AD_PINK = ss27('athletic-dept-pink-longsleeve', 'ATHLETIC DEPT – PINK LONGSLEEVE', 'Longsleeve', 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/10/athletic-dept-pink-longsleeve-mockup.jpg');
const AD_BLUE = ss27('athletic-dept-blue-longsleeve', 'ATHLETIC DEPT – BLUE LONGSLEEVE', 'Longsleeve', 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/10/athletic-dept-blue-longsleeve-mockup.jpg');
const AD_NAVY_TEE = ss27('athletic-dept-navy-tee', 'ATHLETIC DEPT – NAVY TEE', 'Remera', 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/10/athletic-dept-navy-tee-mockup.png');
const AD_WHITE_GREY = ss27('athletic-dept-white-grey-print-tee', 'ATHLETIC DEPT – WHITE TEE (GREY PRINT)', 'Remera', 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/10/athletic-dept-white-grey-print-tee-mockup.png');
const AD_WHITE_BLUE = ss27('athletic-dept-white-tee', 'ATHLETIC DEPT – WHITE TEE', 'Remera', 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/10/athletic-dept-white-tee-mockup.png');
const AD_POLO = ss27('athletic-dept-washed-grey-polo', 'ATHLETIC DEPT – WASHED GREY POLO', 'Polo', 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/10/athletic-dept-washed-grey-polo-mockup.png');
const SCU_BLACK = ss27('style-culture-university-black-tee', 'STYLE&CULTURE UNIVERSITY – BLACK TEE', 'Remera', 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/10/style-culture-university-black-tee-mockup.png');
const SCU_WHITE = ss27('style-culture-university-white-tee', 'STYLE&CULTURE UNIVERSITY – WHITE TEE', 'Remera', 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/10/style-culture-university-white-tee-mockup.png');
const SCU_NAVY = ss27('style-culture-university-navy-tee', 'STYLE&CULTURE UNIVERSITY – NAVY TEE', 'Remera', 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/10/style-culture-university-navy-tee-mockup.png');
const WVC_NAVY = ss27('worn-varsity-club-navy-tee', 'WORN VARSITY CLUB – NAVY TEE', 'Remera', 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/10/worn-varsity-club-navy-tee-mockup.png');
const WVC_WHITE = ss27('worn-varsity-club-white-tee', 'WORN VARSITY CLUB – WHITE TEE', 'Remera', 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/10/worn-varsity-club-white-tee-mockup.png');
const H_WHITE = ss27('h-hype-white-tee', 'H HYPE – WHITE TEE', 'Remera', 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/10/h-hype-white-tee-mockup.png');
const H_NAVY = ss27('h-hype-navy-tee', 'H HYPE – NAVY TEE', 'Remera', 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/10/h-hype-navy-tee-mockup.png');
const KUPOLA = ss27('zolotye-kupola-washed-graphite-hoodie', 'ЗОЛОТЫЕ КУПОЛА – WASHED GRAPHITE HOODIE', 'Hoodie', 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/10/zolotye-kupola-washed-graphite-hoodie-mockup.png');
const DISTRESSED = ss27('hype-distressed-grey-hoodie', 'HYPE – DISTRESSED GREY HOODIE', 'Hoodie', 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/10/hype-distressed-grey-hoodie-mockup.png');
const RAGLAN = ss27('hs-crest-olive-raglan-longsleeve', 'HS CREST – OLIVE RAGLAN LONGSLEEVE', 'Longsleeve', 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/10/hs-crest-olive-raglan-longsleeve-mockup.png');
const DEPT_CULTURE = ss27('department-of-culture-washed-black-waffle-longsleeve', 'DEPARTMENT OF CULTURE – WASHED BLACK WAFFLE LONGSLEEVE', 'Longsleeve', 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/10/department-of-culture-washed-black-waffle-longsleeve-01.jpg');
const HYPE_WAFFLE = ss27('hype-washed-black-waffle-longsleeve', 'H.Y.P.E – WASHED BLACK WAFFLE LONGSLEEVE', 'Longsleeve', 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/10/hype-washed-black-waffle-longsleeve-01.jpg');
const CROSS = ss27('hype-dept-cross-white-waffle-longsleeve', 'HYPE DEPT CROSS – WHITE WAFFLE LONGSLEEVE', 'Longsleeve', 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/10/hype-dept-cross-white-waffle-longsleeve-mockup.png');

/**
 * El orden es el del line-up. Primero los looks sobre pared lisa y después los
 * que tienen el ladrillo arriba (toda la cámara 2 y parte de la cámara 1), para
 * que la pared cambie una sola vez. Recortar el ladrillo no sirve: en esas
 * tomas el modelo está encuadrado más arriba y el corte le saca la cabeza.
 *
 * Fuera del line-up: Splatter Hoodie (no hay toma de cuerpo entero), y Hearts
 * Boxy Tee, Running Horses / Griffin Waffle y Mock Neck (no están en Woo).
 */
export const LOOKS: Look[] = [
  // Pared lisa
  { id: 'pink-ella',          etiqueta: 'Athletic Dept Pink',       modelo: 'ella', angulos: TODOS, items: [AD_PINK, SWEAT_BLACK] },
  { id: 'blue-el',            etiqueta: 'Athletic Dept Blue',       modelo: 'el',   angulos: TODOS, items: [AD_BLUE] },
  { id: 'crest-ella',         etiqueta: 'S&C University Black',     modelo: 'ella', angulos: TODOS, items: [SCU_BLACK, SWEAT_BLACK] },
  { id: 'raglan-el',          etiqueta: 'HS Crest Raglan',          modelo: 'el',   angulos: TODOS, items: [RAGLAN, SWEAT_BLACK] },
  { id: 'eagle-ella',         etiqueta: 'Золотые Купола',           modelo: 'ella', angulos: TODOS, items: [KUPOLA] },
  { id: 'polo-el',            etiqueta: 'Athletic Dept Polo',       modelo: 'el',   angulos: TODOS, items: [AD_POLO, SWEAT_BLACK] },
  { id: 'crest-white-ella',   etiqueta: 'S&C University White',     modelo: 'ella', angulos: TODOS, items: [SCU_WHITE, SWEAT_GREY] },
  { id: 'pink-el',            etiqueta: 'Athletic Dept Pink',       modelo: 'el',   angulos: TODOS, items: [AD_PINK] },
  { id: 'distressed-ella',    etiqueta: 'Distressed Hoodie',        modelo: 'ella', angulos: TODOS, items: [DISTRESSED, SWEAT_GREY] },
  { id: 'crest-navy-ella',    etiqueta: 'S&C University Navy',      modelo: 'ella', angulos: TODOS, items: [SCU_NAVY, SWEAT_BLACK] },
  { id: 'blue-ella',          etiqueta: 'Athletic Dept Blue',       modelo: 'ella', angulos: TODOS, items: [AD_BLUE, SWEAT_GREY] },
  { id: 'style-waffle-ella',  etiqueta: 'H.Y.P.E Waffle',           modelo: 'ella', angulos: TODOS, items: [HYPE_WAFFLE] },
  { id: 'waffle-ella',        etiqueta: 'Department of Culture',    modelo: 'ella', angulos: TODOS, items: [DEPT_CULTURE] },
  { id: 'raglan-ella',        etiqueta: 'HS Crest Raglan',          modelo: 'ella', angulos: TODOS, items: [RAGLAN] },
  // Ladrillo arriba
  { id: 'ad-boxy-navy-ella',  etiqueta: 'Athletic Dept Navy',       modelo: 'ella', angulos: TODOS, items: [AD_NAVY_TEE, SWEAT_GREY] },
  { id: 'ad-boxy-white-el',   etiqueta: 'Athletic Dept White',      modelo: 'el',   angulos: TODOS, items: [AD_WHITE_GREY, SWEAT_GREY] },
  { id: 'ad-white-blue-el',   etiqueta: 'Athletic Dept White',      modelo: 'el',   angulos: TODOS, items: [AD_WHITE_BLUE, SWEAT_BLACK] },
  { id: 'eagle-el',           etiqueta: 'Золотые Купола',           modelo: 'el',   angulos: TODOS, items: [KUPOLA, SWEAT_GREY] },
  { id: 'regular-navy-el',    etiqueta: 'Regular Tee Navy',         modelo: 'el',   angulos: TODOS, items: [REGULAR_NAVY, SWEAT_GREY] },
  { id: 'hhype-navy-el',      etiqueta: 'H Hype Navy',              modelo: 'el',   angulos: TODOS, items: [H_NAVY, SWEAT_GREY] },
  { id: 'distressed-el',      etiqueta: 'Distressed Hoodie',        modelo: 'el',   angulos: TODOS, items: [DISTRESSED, SWEAT_GREY] },
  { id: 'hhype-white-el',     etiqueta: 'H Hype White',             modelo: 'el',   angulos: ['frente', 'perfil', 'espalda'], items: [H_WHITE, SWEAT_GREY] },
  { id: 'cross-el',           etiqueta: 'Hype Dept Cross',          modelo: 'el',   angulos: TODOS, items: [CROSS, SWEAT_GREY] },
  { id: '018-el',             etiqueta: 'Worn Varsity Club Navy',   modelo: 'el',   angulos: TODOS, items: [WVC_NAVY, SWEAT_GREY] },
  { id: '018-white-el',       etiqueta: 'Worn Varsity Club White',  modelo: 'el',   angulos: TODOS, items: [WVC_WHITE, SWEAT_GREY] },
  { id: 'waffle-el',          etiqueta: 'Department of Culture',    modelo: 'el',   angulos: TODOS, items: [DEPT_CULTURE, SWEAT_GREY] },
  { id: 'crest-el',           etiqueta: 'S&C University Black',     modelo: 'el',   angulos: ['frente', 'perfil', 'detalle'], items: [SCU_BLACK, SWEAT_GREY] },
];
