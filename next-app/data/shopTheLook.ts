import type { VistoEnPost } from './vistoEn';

/**
 * "Así se usa" — la sección de la ficha de producto con fotos UGC de prendas
 * que se pueden comprar hoy (referencia: coldcultureworldwide.com, 19/10/2026).
 *
 * Nombre aparte a propósito: "Shop the look" es la del home, con la sesión de
 * estudio; "Visto en" es la tira de artistas, también en el home. Acá va la
 * comunidad —creadoras, amigos, clientes— usando la ropa en la calle, y la
 * regla es otra: **solo productos disponibles**. El componente además esconde
 * cualquier look cuyas prendas estén todas agotadas o fuera del catálogo, así
 * que una foto vieja nunca termina mandando a un producto que no se vende.
 *
 * **Hay que actualizarla drop tras drop**, o cada vez que llegue material
 * nuevo: al salir un drop, las fotos del anterior pierden stock y la sección
 * se va quedando corta. El material vive en `Redes & Pauta`, una carpeta por
 * creador, y en las reseñas con foto del panel.
 *
 * Para sumar una entrada: foto 1080x1350 (4:5) en `public/shop-the-look/`,
 * entrada acá con el nombre, el @ de Instagram y los `slugs` de Woo de lo que
 * lleva puesto. Nombre, precio y stock salen del catálogo. No se etiqueta a
 * fotógrafos ni a modelos.
 *
 * Ojo al exportar: varias de estas fotos vienen con orientación EXIF, y las de
 * Felipe son DNG. Siempre `sharp(...).rotate()` antes de recortar, o salen
 * dadas vuelta. Las HEIC (Roy, Juani, Cande, Hanna) sharp no las abre: van con
 * ffmpeg (`ffmpeg -i foto.HEIC foto.jpg`), que además aplica la rotación.
 */
export const SHOP_THE_LOOK: VistoEnPost[] = [
  {
    id: 'mica-mesh-camo',
    artista: 'Mica',
    ig: [],
    foto: '/shop-the-look/mica-mesh-camo.webp',
    alt: 'Mica con la Mesh Camo Blue y gorra, en la puerta de madera',
    slugs: ['mesh-camo-blue-tee'],
  },
  {
    id: 'felipe-polo-navy',
    artista: 'Felipe González',
    ig: [],
    foto: '/shop-the-look/felipe-polo-navy.webp',
    alt: 'Felipe con el Half-Zip Polo Navy en la vereda',
    slugs: ['half-zip-polo-navy'],
  },
  {
    id: 'anny-pink-set',
    artista: 'Anny Bellicoso',
    ig: [],
    foto: '/shop-the-look/anny-pink-set.webp',
    alt: 'Anny con el conjunto rosa: hoodie y sweatpant',
    slugs: ['hoodie-pink', 'sweatpant-pink'],
  },
  {
    id: 'roy-god-gave-style',
    artista: 'Roy',
    ig: [],
    foto: '/shop-the-look/roy-god-gave-style.webp',
    alt: 'Roy con la God Gave Me Style waffle longsleeve contra una persiana',
    slugs: ['longsleeve-waffle-god-gave-me-style'],
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
    id: 'juani-pink-set',
    artista: 'Juani',
    ig: [],
    foto: '/shop-the-look/juani-pink-set.webp',
    alt: 'Juani con el conjunto rosa frente a la vidriera de stickers',
    slugs: ['hoodie-pink', 'sweatpant-pink'],
  },
  {
    id: 'sofi-lion-judah',
    artista: 'Sofi Abate',
    ig: [],
    foto: '/shop-the-look/sofi-lion-judah.webp',
    alt: 'Sofi con el Lion of Judah stone wash hoodie',
    slugs: ['lion-of-judah-stone-wash-hoodie'],
  },
  {
    id: 'mica-waffle-horses',
    artista: 'Mica',
    ig: [],
    foto: '/shop-the-look/mica-waffle-horses.webp',
    alt: 'Mica con la Running Horses waffle longsleeve en la disquería',
    slugs: ['longsleeve-waffle-horses'],
  },
  {
    id: 'mica-napoli',
    artista: 'Mica',
    ig: [],
    foto: '/shop-the-look/mica-napoli.webp',
    alt: 'Mica con la Napoli Tee blanca frente al mural de Maradona',
    slugs: ['napoli-tee-blanca'],
  },
];
