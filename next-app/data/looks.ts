/**
 * Shop the look — sesión de estudio SS27 (02/10/2026).
 *
 * Acá va solo lo editorial: fotos y slugs. Nombre, precio, tachado, miniatura
 * y stock salen del catálogo de Woo (la query ['products'] que el home ya
 * precarga en el servidor), así que no se desactualizan.
 *
 * `pendiente`: prendas nuevas que todavía no están cargadas en Woo. Mientras el
 * slug no aparezca en el catálogo se muestran con este nombre y "Próximamente",
 * sin precio ni link. Cuando se carga el producto con ese slug, toma los datos
 * reales sola. Si el slug final en Woo es otro, cambiarlo acá.
 *
 * Fotos: 960x1280 (3:4) en public/looks/ss27/, exportadas de los originales de
 * `Redes & Pauta/CONTENT SS27/ESTUDIO/_SELECCION`. Orden de los ángulos:
 * frente, perfil, espalda, detalle. Cada look tiene además <id>-lineup.webp,
 * el frente achicado a 420x560 para la tira de arriba.
 */

export type Angulo = 'frente' | 'perfil' | 'espalda' | 'detalle';
/** 'lineup' es el frente en chico (420x560) para la tira de arriba. */
export type FotoLook = Angulo | 'lineup';

export interface LookItem {
  slug: string;
  pendiente?: { name: string; category: string };
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

const SWEAT_GREY: LookItem = { slug: 'sweatpant-grey-hstars' };
const SWEAT_BLACK: LookItem = { slug: 'sweatpant-black-hstars' };

const nuevo = (slug: string, name: string, category: string): LookItem => ({ slug, pendiente: { name, category } });

const AD_PINK = nuevo('athletic-dept-longsleeve-pink', 'Athletic Dept Longsleeve Pink', 'Longsleeve');
const AD_BLUE = nuevo('athletic-dept-longsleeve-blue', 'Athletic Dept Longsleeve Blue', 'Longsleeve');
const CREST_BLACK = nuevo('varsity-crest-tee-black', 'Varsity Crest Tee Black', 'Remera');
const EAGLE = nuevo('eagle-18-hoodie-washed-graphite', 'Eagle 18 Hoodie Washed Graphite', 'Hoodie');
const RAGLAN = nuevo('raglan-crest-longsleeve-olive', 'Raglan Crest Longsleeve Olive', 'Longsleeve');
const VARSITY_018 = nuevo('hype-018-worn-varsity-boxy-tee-navy', 'Hype 018 Worn Varsity Boxy Tee Navy', 'Remera');
const WAFFLE = nuevo('hype-department-waffle-longsleeve-washed-black', 'Hype Department Waffle Longsleeve', 'Longsleeve');
const DISTRESSED = nuevo('hype-distressed-hoodie-washed-grey', 'Hype Distressed Hoodie Washed Grey', 'Hoodie');
const HEARTS = nuevo('hearts-boxy-tee-white', 'Hearts Boxy Tee White', 'Remera');

/**
 * El orden es el del line-up. Los cuatro looks de él que se hicieron con el
 * ladrillo arriba (018, waffle, hearts y crest) van juntos al final: recortar no
 * sirve porque el modelo está encuadrado más arriba y el corte le saca la cabeza.
 */
export const LOOKS: Look[] = [
  { id: 'pink-ella',       etiqueta: 'Athletic Dept Pink',   modelo: 'ella', angulos: TODOS, items: [AD_PINK, SWEAT_BLACK] },
  { id: 'blue-el',         etiqueta: 'Athletic Dept Blue',   modelo: 'el',   angulos: TODOS, items: [AD_BLUE] },
  { id: 'crest-ella',      etiqueta: 'Varsity Crest Tee',    modelo: 'ella', angulos: TODOS, items: [CREST_BLACK, SWEAT_BLACK] },
  { id: 'raglan-el',       etiqueta: 'Raglan Crest',         modelo: 'el',   angulos: TODOS, items: [RAGLAN, SWEAT_BLACK] },
  { id: 'eagle-ella',      etiqueta: 'Eagle 18 Hoodie',      modelo: 'ella', angulos: TODOS, items: [EAGLE] },
  { id: 'pink-el',         etiqueta: 'Athletic Dept Pink',   modelo: 'el',   angulos: TODOS, items: [AD_PINK] },
  { id: 'distressed-ella', etiqueta: 'Distressed Hoodie',    modelo: 'ella', angulos: TODOS, items: [DISTRESSED, SWEAT_GREY] },
  { id: 'blue-ella',       etiqueta: 'Athletic Dept Blue',   modelo: 'ella', angulos: TODOS, items: [AD_BLUE, SWEAT_GREY] },
  { id: 'waffle-ella',     etiqueta: 'Department Waffle',    modelo: 'ella', angulos: TODOS, items: [WAFFLE] },
  { id: 'raglan-ella',     etiqueta: 'Raglan Crest',         modelo: 'ella', angulos: TODOS, items: [RAGLAN] },
  { id: '018-el',          etiqueta: '018 Worn Varsity',     modelo: 'el',   angulos: TODOS, items: [VARSITY_018, SWEAT_GREY] },
  { id: 'waffle-el',       etiqueta: 'Department Waffle',    modelo: 'el',   angulos: TODOS, items: [WAFFLE, SWEAT_GREY] },
  { id: 'hearts-el',       etiqueta: 'Hearts Boxy Tee',      modelo: 'el',   angulos: TODOS, items: [HEARTS, SWEAT_GREY] },
  { id: 'crest-el',        etiqueta: 'Varsity Crest Tee',    modelo: 'el',   angulos: ['frente', 'perfil', 'detalle'], items: [CREST_BLACK, SWEAT_GREY] },
];
