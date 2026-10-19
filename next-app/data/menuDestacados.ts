/**
 * Fotos de la tira del menú mobile (referencia: emestudios.com, 19/10/2026).
 *
 * Es lo único del menú que se cambia seguido: cuando entra un drop o cambia
 * la campaña, se edita acá y listo. Pasa sola (components/MenuDestacados.tsx),
 * así que entran más de dos sin ocupar pantalla.
 *
 * La foto va recortada a 4:5 por CSS, así que sirve cualquier foto vertical de
 * catálogo o campaña — mejor con alguien usando la prenda que un mockup.
 * `encuadre` es opcional (CSS object-position), para correr el recorte.
 */

export interface MenuDestacado {
  label: string;
  href: string;
  img: string;
  /** CSS object-position; por defecto, centro. */
  encuadre?: string;
}

export const MENU_DESTACADOS: MenuDestacado[] = [
  { label: 'New In',      href: '/new-in',            img: '/ss27/preview/01-duo.webp' },
  { label: 'Remeras',     href: '/tees',              img: '/ss27/preview/07-hearts-boxy-white.webp' },
  { label: 'Accesorios',  href: '/accesorios',        img: '/menu/accesorios-gorra.webp', encuadre: 'center 30%' },
  { label: 'Spring Summer 27', href: '/colecciones/ss27', img: '/ss27/preview/05-athletic-ls-pink.webp' },
];
