import { VISTO_EN, type VistoEnPost } from './vistoEn';

/**
 * Shop the look de la ficha de producto — fotos UGC de prendas que se pueden
 * comprar hoy (referencia: coldcultureworldwide.com, 19/10/2026).
 *
 * Es una lista aparte de [[Visto en]] a propósito: el home muestra artistas de
 * la escena (aunque la prenda ya no esté), y acá la regla es otra — **solo
 * fotos de gente usando productos disponibles**. El componente además esconde
 * cualquier look cuyas prendas estén todas agotadas o fuera del catálogo, así
 * que una foto vieja nunca termina mandando a un producto que no se vende.
 *
 * **Hay que actualizarla drop tras drop**, o cada vez que llegue material
 * nuevo de creadores: al salir un drop, las fotos del drop anterior pierden
 * stock y la sección se va quedando corta. Material UGC en `Redes & Pauta`
 * (carpetas por creador: Sofi Abate, Cami Iglesias, Juani, Cande, Anny
 * Bellicoso, Mica, Hanna, Roy…) y en las reseñas con foto del panel.
 *
 * Para sumar una entrada: foto 1080x1350 (4:5) en `public/shop-the-look/`,
 * entrada en `PROPIOS` con el nombre de quien la subió, su @ y los `slugs` de
 * Woo de lo que lleva puesto. Nombre, precio y stock salen del catálogo.
 * No se etiqueta a fotógrafos ni a modelos.
 */

/** UGC propio de la ficha. Acá va lo nuevo. */
const PROPIOS: VistoEnPost[] = [];

/**
 * Hasta que haya UGC propio cargado, se reusan los posts de "Visto en" cuyas
 * prendas siguen en el catálogo — son fotos reales de gente con Hype puesto y
 * productos que se pueden comprar. El resto de los artistas queda solo en el
 * home, que para eso no depende del stock.
 */
const DESDE_VISTO_EN = ['nicki-selfie', 'polima-video', 'polima-02', 'nicki-tini'];

export const SHOP_THE_LOOK: VistoEnPost[] = [
  ...PROPIOS,
  ...DESDE_VISTO_EN
    .map((id) => VISTO_EN.find((p) => p.id === id))
    .filter((p): p is VistoEnPost => !!p),
];
