/**
 * MYSTERY ARCHIVE — las tres cajas del Cyber (2 al 4/11/2026).
 *
 * Una Mystery es un producto variable normal de WooCommerce: variación por
 * talle, stock propio por talle, mismo carrito y mismo checkout que cualquier
 * otra ficha. Lo único propio es la **capa de información** que vive en este
 * módulo y que la ficha agrega cuando el slug es uno de los tres: qué recibís,
 * cómo funciona y el pool completo a la vista.
 *
 * Por qué el pool está acá y no en Woo: el art. 34 de la ley 24.240 obliga a
 * informar antes de comprar qué es lo que se compra, y en una caja sorpresa
 * eso significa **mostrar el conjunto del que sale la prenda**. Si el pool
 * vive en la descripción de Woo nadie lo mantiene; acá es una lista tipada que
 * rompe el build si falta un dato.
 *
 * ⚠ NADA DE ESTO SE PUBLICA hasta que los productos existan en Woo y Valentín
 * apruebe precio y pool: `MYSTERY_PUBLICADO` en `lib/cyber-cartelera.ts` es el
 * interruptor, y mientras esté en false la sección del evento no linkea acá.
 */

export type MysteryId = 'tees' | 'longsleeves' | 'hoodies';

export interface MysteryModelo {
  /** ID de la ficha en Woo. También es el nombre del recorte en /mystery/pool/. */
  id: number;
  nombre: string;
  /** Precio al que se vende suelto hoy. Es el que sostiene la comparación. */
  precio: number;
}

export interface MysteryCaja {
  id: MysteryId;
  /** Slug del producto en Woo. La ficha vive en /producto/<slug>/. */
  slug: string;
  nombre: string;
  /** Cuántas prendas trae la caja. Es la promesa dura del producto. */
  prendas: number;
  /** Precio final de la caja. */
  precio: number;
  /** Qué tipo de prenda puede tocar, en una línea y sin adornos. */
  queEs: string;
  /** La frase corta de arriba de todo: qué se lleva, sin ambigüedad. */
  garantia: string;
  /** El pool completo: cada prenda que puede tocar. */
  modelos: MysteryModelo[];
}

/**
 * Los tres pools, medidos contra Woo el 29/10/2026.
 *
 * Reglas que se aplicaron para armarlos, y que hay que respetar si se tocan:
 *
 * 1. **Una ficha por pila compartida.** Varias fichas pueden leer el mismo
 *    blank: sumarlas cuenta la misma prenda dos veces. De los dos waffles
 *    washed black (3691 y 3705) entra uno solo, y de las tres longsleeves
 *    negras no entra ninguna (son las que más venden a precio pleno).
 * 2. **Nada sin costo cargado que mueva la aguja.** El único del pool sin
 *    perfil de costo son las siete tees de archivo y el Hoodie Pink; el precio
 *    de cada caja está elegido para aguantarlas aun con un costo bastante peor
 *    que el conocido (ver el PRD, §4).
 * 3. **Afuera lo que se vende solo.** Los hoodies SS27, el camo Faith Over
 *    Everything y Running Horses no entran: liquidar lo que ya rota es regalar
 *    margen sobre ventas que iban a ocurrir igual.
 */
export const MYSTERY_CAJAS: MysteryCaja[] = [
  {
    id: 'tees',
    slug: 'mystery-tees',
    nombre: 'Mystery Tees',
    prendas: 2,
    precio: 49900,
    queEs: 'Remeras de manga corta del archivo Hype.',
    garantia: '2 remeras de manga corta, las dos de diseños distintos, en el talle que elijas.',
    modelos: [
      { id: 2460, nombre: 'Napoli Azurro', precio: 38000 },
      { id: 2471, nombre: 'Napoli Bianca', precio: 38000 },
      { id: 588, nombre: 'Per Aspera Ad Astra Black', precio: 40500 },
      { id: 601, nombre: 'Per Aspera Ad Astra White', precio: 40500 },
      { id: 774, nombre: 'Honda White', precio: 40500 },
      { id: 743, nombre: 'Honda Black', precio: 40500 },
      { id: 575, nombre: 'Hypestation White', precio: 40500 },
      { id: 564, nombre: 'Hypestation Black', precio: 40500 },
      { id: 553, nombre: 'Skyline', precio: 40500 },
      { id: 2107, nombre: 'Lamb of God Pink', precio: 40500 },
      { id: 3632, nombre: 'Style & Culture University White', precio: 39000 },
      { id: 3647, nombre: 'Style & Culture University Black', precio: 39000 },
      { id: 3662, nombre: 'Style & Culture University Navy', precio: 39000 },
    ],
  },
  {
    id: 'longsleeves',
    slug: 'mystery-longsleeves',
    nombre: 'Mystery Longsleeves',
    prendas: 2,
    precio: 69900,
    queEs: 'Remeras de manga larga: waffles, Athletic Dept y raglans.',
    garantia: '2 remeras de manga larga, las dos de diseños distintos, en el talle que elijas.',
    modelos: [
      { id: 3472, nombre: 'Athletic Dept. Pink', precio: 48000 },
      { id: 3477, nombre: 'Athletic Dept. Blue', precio: 48000 },
      { id: 3799, nombre: 'Hype Creative Goods Pink Raglan', precio: 60000 },
      { id: 3805, nombre: 'Dept of Culture Eagle Pink Raglan', precio: 60000 },
      { id: 3887, nombre: 'Hype Creative Goods Green Raglan', precio: 60000 },
      { id: 3888, nombre: 'Dept of Culture Eagle Green Raglan', precio: 60000 },
      { id: 3677, nombre: 'HS Crest Olive Raglan', precio: 60000 },
      { id: 3691, nombre: 'Dept of Culture Waffle Washed Black', precio: 60000 },
      { id: 3721, nombre: 'Hype Dept Cross Waffle Blanca', precio: 62000 },
      { id: 29, nombre: 'Ladytribal Black', precio: 67000 },
    ],
  },
  {
    id: 'hoodies',
    slug: 'mystery-hoodies',
    nombre: 'Mystery Hoodies',
    prendas: 2,
    precio: 99900,
    queEs: 'Hoodies, buzos y Half-Zip Polos del archivo.',
    garantia: '2 prendas de abrigo —hoodie, buzo o Half-Zip Polo—, las dos de diseños distintos, en el talle que elijas.',
    modelos: [
      { id: 1104, nombre: 'Half-Zip Polo Navy', precio: 70000 },
      { id: 1110, nombre: 'Half-Zip Polo Black', precio: 70000 },
      { id: 1107, nombre: 'Half-Zip Polo Melange', precio: 70000 },
      { id: 1906, nombre: 'Stars For Venezuela', precio: 76500 },
      { id: 2928, nombre: 'HS Co. Melange', precio: 79000 },
      { id: 2114, nombre: 'HS Co. Grey', precio: 79000 },
      { id: 841, nombre: 'No Service For The Faithless', precio: 79000 },
      { id: 2027, nombre: 'Lion of Judah Stone Wash', precio: 79000 },
      { id: 754, nombre: 'Stay Hustle', precio: 79200 },
      { id: 1177, nombre: 'Hoodie Grey HStars', precio: 80100 },
      { id: 2023, nombre: 'He Died So I Could Live', precio: 80100 },
      { id: 645, nombre: 'Hoodie Pink', precio: 82800 },
    ],
  },
];

const PORS_SLUG = new Map(MYSTERY_CAJAS.map(c => [c.slug, c]));

/** La caja que corresponde a un slug, o undefined si la ficha no es Mystery. */
export function mysteryDe(slug: string): MysteryCaja | undefined {
  return PORS_SLUG.get(slug);
}

export const MYSTERY_SLUGS: string[] = MYSTERY_CAJAS.map(c => c.slug);

/**
 * El precio más bajo al que el cliente podría comprar sueltas la misma
 * cantidad de prendas. Es contra esto que se mide el ahorro: **la alternativa
 * más barata que puede tocarle**, no el promedio ni el precio de lista más
 * alto. Si la caja costara más que esto, no sería una oferta.
 */
export function pisoSuelto(caja: MysteryCaja): number {
  return Math.min(...caja.modelos.map(m => m.precio)) * caja.prendas;
}

/** Cuánto ahorra, en pesos, contra esa alternativa más barata. */
export function ahorroMinimo(caja: MysteryCaja): number {
  return pisoSuelto(caja) - caja.precio;
}

/** Precio por prenda dentro de la caja. Es el número que hace la oferta. */
export function precioPorPrenda(caja: MysteryCaja): number {
  return Math.round(caja.precio / caja.prendas);
}

/** El recorte del mockup de una prenda del pool (PNG con alfa, 1:1). */
export function mockupPool(id: number): string {
  return `/mystery/pool/${id}.webp`;
}
