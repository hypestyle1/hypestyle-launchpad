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

/**
 * Calce real de la prenda. **Los tres pools mezclan calces** — medido contra el
 * atributo `fit` de Woo el 31/10/2026:
 *
 * | caja | mezcla |
 * |---|---|
 * | TEES | 11 Regular + 2 Oversize (las dos Napoli) |
 * | LONGSLEEVES | 8 Oversize + 2 Regular (las dos Athletic Dept) |
 * | HOODIES | 9 Boxy + 3 Oversize |
 *
 * Por eso la ficha NO puede anunciar un calce único: el que le toca al cliente
 * depende del modelo que salga. Tres fichas no tienen el atributo en Woo
 * (2107, 2114, 2027, 2023) y su calce sale de la descripción; `2107 Lamb of God`
 * dice "corte regular" en el texto pero tiene colgada la guía de talles
 * OVERSIZE — está cargado como Regular y conviene corregir la guía en Woo.
 */
export type MysteryCalce = 'Regular' | 'Oversize' | 'Boxy';

export interface MysteryModelo {
  /** ID de la ficha en Woo. También es el nombre del recorte en /mystery/pool/. */
  id: number;
  nombre: string;
  /** Precio al que se vende suelto hoy. Es el que sostiene la comparación. */
  precio: number;
  /** Calce real de ESTE modelo. No es el de la caja: la caja mezcla. */
  calce: MysteryCalce;
}

/** Los calces distintos que puede tocar en una caja, en orden estable. */
export function calcesDe(caja: MysteryCaja): MysteryCalce[] {
  const orden: MysteryCalce[] = ['Regular', 'Oversize', 'Boxy'];
  return orden.filter((c) => caja.modelos.some((m) => m.calce === c));
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
 *    que el conocido: el costo máximo tolerable por prenda es $13.918 en TEES,
 *    $17.769 en LONGSLEEVES y $26.880 en HOODIES (ver el PRD, §4).
 * 3. **Afuera lo que se vende solo.** Los hoodies SS27, el camo Faith Over
 *    Everything y Running Horses no entran: liquidar lo que ya rota es regalar
 *    margen sobre ventas que iban a ocurrir igual.
 */
export const MYSTERY_CAJAS: MysteryCaja[] = [
  {
    id: 'tees',
    slug: 'mystery-tees',
    nombre: 'Mystery Tees',
    prendas: 1,
    precio: 25900,
    queEs: 'Remeras de manga corta del archivo Hype.',
    garantia: '1 remera de manga corta del archivo, en el talle que elijas.',
    modelos: [
      { id: 2460, nombre: 'Napoli Azurro', precio: 38000, calce: 'Oversize' },
      { id: 2471, nombre: 'Napoli Bianca', precio: 38000, calce: 'Oversize' },
      { id: 588, nombre: 'Per Aspera Ad Astra Black', precio: 40500, calce: 'Regular' },
      { id: 601, nombre: 'Per Aspera Ad Astra White', precio: 40500, calce: 'Regular' },
      { id: 774, nombre: 'Honda White', precio: 40500, calce: 'Regular' },
      { id: 743, nombre: 'Honda Black', precio: 40500, calce: 'Regular' },
      { id: 575, nombre: 'Hypestation White', precio: 40500, calce: 'Regular' },
      { id: 564, nombre: 'Hypestation Black', precio: 40500, calce: 'Regular' },
      { id: 553, nombre: 'Skyline', precio: 40500, calce: 'Regular' },
      { id: 2107, nombre: 'Lamb of God Pink', precio: 40500, calce: 'Regular' },
      { id: 3632, nombre: 'Style & Culture University White', precio: 39000, calce: 'Regular' },
      { id: 3647, nombre: 'Style & Culture University Black', precio: 39000, calce: 'Regular' },
      { id: 3662, nombre: 'Style & Culture University Navy', precio: 39000, calce: 'Regular' },
    ],
  },
  {
    id: 'longsleeves',
    slug: 'mystery-longsleeves',
    nombre: 'Mystery Longsleeves',
    prendas: 1,
    precio: 39900,
    queEs: 'Remeras de manga larga: waffles, Athletic Dept y raglans.',
    garantia: '1 remera de manga larga —waffle, Athletic Dept o raglan—, en el talle que elijas.',
    modelos: [
      { id: 3472, nombre: 'Athletic Dept. Pink', precio: 48000, calce: 'Regular' },
      { id: 3477, nombre: 'Athletic Dept. Blue', precio: 48000, calce: 'Regular' },
      { id: 3799, nombre: 'Hype Creative Goods Pink Raglan', precio: 60000, calce: 'Oversize' },
      { id: 3805, nombre: 'Dept of Culture Eagle Pink Raglan', precio: 60000, calce: 'Oversize' },
      { id: 3887, nombre: 'Hype Creative Goods Green Raglan', precio: 60000, calce: 'Oversize' },
      { id: 3888, nombre: 'Dept of Culture Eagle Green Raglan', precio: 60000, calce: 'Oversize' },
      { id: 3677, nombre: 'HS Crest Olive Raglan', precio: 60000, calce: 'Oversize' },
      { id: 3691, nombre: 'Dept of Culture Waffle Washed Black', precio: 60000, calce: 'Oversize' },
      { id: 3721, nombre: 'Hype Dept Cross Waffle Blanca', precio: 62000, calce: 'Oversize' },
      { id: 29, nombre: 'Ladytribal Black', precio: 67000, calce: 'Oversize' },
    ],
  },
  {
    id: 'hoodies',
    slug: 'mystery-hoodies',
    nombre: 'Mystery Hoodies',
    prendas: 1,
    precio: 54900,
    queEs: 'Hoodies, buzos y Half-Zip Polos del archivo.',
    garantia: '1 prenda de abrigo —hoodie, buzo o Half-Zip Polo—, en el talle que elijas.',
    modelos: [
      { id: 1104, nombre: 'Half-Zip Polo Navy', precio: 70000, calce: 'Boxy' },
      { id: 1110, nombre: 'Half-Zip Polo Black', precio: 70000, calce: 'Boxy' },
      { id: 1107, nombre: 'Half-Zip Polo Melange', precio: 70000, calce: 'Boxy' },
      { id: 1906, nombre: 'Stars For Venezuela', precio: 76500, calce: 'Boxy' },
      { id: 2928, nombre: 'HS Co. Melange', precio: 79000, calce: 'Boxy' },
      { id: 2114, nombre: 'HS Co. Grey', precio: 79000, calce: 'Oversize' },
      { id: 841, nombre: 'No Service For The Faithless', precio: 79000, calce: 'Boxy' },
      { id: 2027, nombre: 'Lion of Judah Stone Wash', precio: 79000, calce: 'Oversize' },
      { id: 754, nombre: 'Stay Hustle', precio: 79200, calce: 'Boxy' },
      { id: 1177, nombre: 'Hoodie Grey HStars', precio: 80100, calce: 'Boxy' },
      { id: 2023, nombre: 'He Died So I Could Live', precio: 80100, calce: 'Oversize' },
      { id: 645, nombre: 'Hoodie Pink', precio: 82800, calce: 'Boxy' },
    ],
  },
];

const PORS_SLUG = new Map(MYSTERY_CAJAS.map(c => [c.slug, c]));

/** La caja que corresponde a un slug, o undefined si la ficha no es Mystery. */
export function mysteryDe(slug: string): MysteryCaja | undefined {
  return PORS_SLUG.get(slug);
}

/** Portadas oficiales existentes cuando Woo no devuelve imagen del contenedor. */
export function mysteryPortadas(slug: string): string[] {
  const caja = mysteryDe(slug);
  return caja ? [`/mystery/portadas/${caja.id}-a.webp`, `/mystery/portadas/${caja.id}-b.webp`] : [];
}

export const MYSTERY_SLUGS: string[] = MYSTERY_CAJAS.map(c => c.slug);

/**
 * El precio más bajo al que el cliente podría comprar suelto el mismo
 * contenido. Con una prenda por caja es, literalmente, **el precio de la
 * prenda más barata del pool**. Es contra esto que se mide el ahorro: la
 * alternativa más barata que puede tocarle, no el promedio ni el precio de
 * lista más alto. Si la caja costara más que esto, no sería una oferta — y es
 * exactamente lo que pasa si la misma prenda se publica suelta con descuento
 * de Cyber (ver el PRD, §4.2: el pool no se descuenta suelto).
 */
export function pisoSuelto(caja: MysteryCaja): number {
  return Math.min(...caja.modelos.map(m => m.precio)) * caja.prendas;
}

/**
 * El precio promedio de los modelos del pool. **Es la referencia de la ficha.**
 *
 * Con una prenda por caja el cliente no compra un modelo: compra una prenda
 * cualquiera del conjunto, así que la comparación honesta es contra lo que vale
 * el conjunto en promedio, no contra su extremo más barato. Comparar contra el
 * mínimo subestimaba el beneficio (en LONGSLEEVES daba .100 de 'ahorro'
 * cuando el descuento real sobre el pool es del 19,8%).
 */
export function promedioPool(caja: MysteryCaja): number {
  const suma = caja.modelos.reduce((s, m) => s + m.precio, 0);
  return Math.round(suma / caja.modelos.length);
}

/** Ahorro en pesos contra el promedio del pool. */
export function ahorroPromedio(caja: MysteryCaja): number {
  return promedioPool(caja) - caja.precio;
}

/** Ese ahorro como porcentaje del promedio del pool. */
export function descuentoPromedio(caja: MysteryCaja): number {
  return ahorroPromedio(caja) / promedioPool(caja);
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
