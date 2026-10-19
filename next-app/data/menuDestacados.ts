/**
 * Fotos del menú mobile (referencia: emestudios.com, 19/10/2026).
 *
 * Es lo único del menú que se cambia seguido: cuando entra un drop o cambia la
 * campaña, se edita acá y listo. Van cuatro, en 2x2.
 *
 * `img` puede ser una foto o varias: con varias, el recuadro las pasa solo
 * (fundido cada 1,8 s), como un GIF — así entra un posteo entero en un solo
 * cuadro. La foto va recortada a 4:5 por CSS, así que sirve cualquier foto
 * vertical; mejor con alguien usando la prenda que un mockup. `encuadre` es
 * opcional (CSS object-position), para correr el recorte.
 */

export interface MenuDestacado {
  label: string;
  href: string;
  img: string | string[];
  /** CSS object-position; por defecto, centro. */
  encuadre?: string;
}

export const MENU_DESTACADOS: MenuDestacado[] = [
  { label: 'New In',  href: '/new-in', img: '/ss27/preview/01-duo.webp' },
  { label: 'Remeras', href: '/tees',   img: '/ss27/preview/07-hearts-boxy-white.webp' },
  {
    label: 'Accesorios',
    href: '/accesorios',
    // Las cuatro del carrusel ACCESORIOS SS27: gorra puesta, gorra de arriba,
    // la chain y las medias.
    img: ['/menu/accesorios-1.webp', '/menu/accesorios-2.webp', '/menu/accesorios-3.webp', '/menu/accesorios-4.webp'],
    encuadre: 'center 30%',
  },
  { label: 'Spring Summer 27', href: '/colecciones/ss27', img: '/ss27/preview/05-athletic-ls-pink.webp' },
];
