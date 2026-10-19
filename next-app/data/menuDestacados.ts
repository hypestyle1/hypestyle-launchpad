/**
 * Atajos con foto del menú mobile (referencia: emestudios.com, 19/10/2026).
 *
 * El panel del menú era una lista de texto y nada más. Estas cuatro fotos van
 * al pie de la lista, en 2x2, y son lo único del menú que se cambia seguido:
 * cuando entra un drop o cambia la campaña, se edita acá y listo.
 *
 * La foto va recortada a 4:5 por CSS (`aspect-[4/5]` + `object-cover`), así
 * que sirve cualquier foto vertical del catálogo o de campaña. `object-position`
 * es opcional, para correr el encuadre cuando la cara queda muy arriba.
 */

export interface MenuDestacado {
  label: string;
  href: string;
  img: string;
  /** CSS object-position; por defecto, centro. */
  encuadre?: string;
}

export const MENU_DESTACADOS: MenuDestacado[] = [
  { label: 'New In',     href: '/new-in',         img: '/ss27/preview/01-duo.webp' },
  { label: 'Remeras',    href: '/tees',           img: '/ss27/preview/07-hearts-boxy-white.webp' },
  { label: 'Hoodies',    href: '/hoodies',        img: '/ss27/preview/04-eagle-18-hoodie.webp' },
  { label: 'Accesorios', href: '/accesorios',     img: '/cat-accesorios.webp' },
];
