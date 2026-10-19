import { VISTO_EN, type VistoEnPost } from './vistoEn';

/**
 * Shop the look de la ficha de producto — fotos UGC de prendas que se pueden
 * comprar hoy (referencia: coldcultureworldwide.com, 19/10/2026).
 *
 * Es una lista aparte de "Visto en" a propósito: el home muestra artistas de
 * la escena (aunque la prenda ya no esté), y acá la regla es otra — **solo
 * fotos de gente usando productos disponibles**. El componente además esconde
 * cualquier look cuyas prendas estén todas agotadas o fuera del catálogo, así
 * que una foto vieja nunca termina mandando a un producto que no se vende.
 *
 * **Hay que actualizarla drop tras drop**, o cada vez que llegue material
 * nuevo de creadores: al salir un drop, las fotos del anterior pierden stock y
 * la sección se va quedando corta. El material vive en `Redes & Pauta`, una
 * carpeta por creador, y en las reseñas con foto del panel.
 *
 * Para sumar una entrada: foto 1080x1350 (4:5) en `public/shop-the-look/`,
 * entrada en `PROPIOS` con el nombre, el @ de Instagram y los `slugs` de Woo
 * de lo que lleva puesto. Nombre, precio y stock salen del catálogo.
 * No se etiqueta a fotógrafos ni a modelos.
 */

/**
 * UGC propio de la ficha. Primera tanda cargada el 19/10/2026 contra el
 * catálogo en stock de ese día; las fotos salieron de `FAITH MICA` y
 * `fotos Sofi abate/SELECCION`.
 *
 * FALTAN LOS @: no los tengo verificados. Mientras estén vacíos, la tarjeta
 * muestra solo el nombre.
 */
const PROPIOS: VistoEnPost[] = [
  {
    id: 'mica-mesh-camo',
    artista: 'Mica',
    ig: [],
    foto: '/shop-the-look/mica-mesh-camo.webp',
    alt: 'Mica con la Mesh Camo Blue y gorra, en la puerta de madera',
    slugs: ['mesh-camo-blue-tee'],
  },
  {
    id: 'sofi-camo-cap',
    artista: 'Sofi Abate',
    ig: [],
    foto: '/shop-the-look/sofi-camo-cap.webp',
    alt: 'Sofi con la Camo Cap verde en la calle',
    slugs: ['camo-cap'],
  },
  {
    id: 'mica-ogcjm',
    artista: 'Mica',
    ig: [],
    foto: '/shop-the-look/mica-ogcjm.webp',
    alt: 'Mica con la Only God Can Judge Me blanca, en la vereda',
    slugs: ['only-god-can-judge-me-blanca'],
  },
  {
    id: 'mica-polo-navy',
    artista: 'Mica',
    ig: [],
    foto: '/shop-the-look/mica-polo-navy.webp',
    alt: 'Mica con el Half-Zip Polo Navy sentada en la escalinata',
    slugs: ['half-zip-polo-navy'],
  },
];

/**
 * Atrás van los posts de "Visto en" cuyas prendas siguen en el catálogo: son
 * fotos reales de artistas con Hype puesto y productos que se pueden comprar.
 * El resto queda solo en el home, que para eso no depende del stock.
 */
const DESDE_VISTO_EN = ['nicki-selfie', 'polima-video', 'polima-02', 'nicki-tini'];

export const SHOP_THE_LOOK: VistoEnPost[] = [
  ...PROPIOS,
  ...DESDE_VISTO_EN
    .map((id) => VISTO_EN.find((p) => p.id === id))
    .filter((p): p is VistoEnPost => !!p),
];
