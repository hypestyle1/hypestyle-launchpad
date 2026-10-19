import type { VistoEnPost } from './vistoEn';

/**
 * Shop the look de la ficha de producto — fotos UGC de prendas que se pueden
 * comprar hoy (referencia: coldcultureworldwide.com, 19/10/2026).
 *
 * Acá **no van artistas**: eso es "Visto en", en el home, y ahí la foto suma
 * aunque la prenda ya no esté. Esta lista es de gente de la comunidad —
 * creadoras, amigos, clientes— y la regla es otra: **solo productos
 * disponibles**. El componente además esconde cualquier look cuyas prendas
 * estén todas agotadas o fuera del catálogo, así que una foto vieja nunca
 * termina mandando a un producto que no se vende.
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
 * dadas vuelta. Las HEIC (Cande, Roy, Hanna) sharp no las abre: van con ffmpeg
 * (ver `Redes & Pauta/fotos Sofi abate/convertir.mjs`).
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
];
