import { foto as f, type Lookbook, type Producto } from './types';

// Lookbook FW26: la produ en Rio de Janeiro (fotos de Fili, mayo 2026), sin
// retocar. El hero del home usa las horizontales y linkea acá.
const CAMO: Producto = { producto: 'Camo Full Set', href: '/producto/camo-full-set-combo/' };
const PINK: Producto = { producto: 'Zip Hoodie Pink', href: '/producto/zip-hoodie-pink/' };
const JORT: Producto = { producto: 'Lettering Pink Jort', href: '/producto/lettering-pink-jort/' };
const JERSEY: Producto = { producto: 'La Nuestra — Jersey Mundial 26', href: '/producto/la-nuestra-jersey-mundial-26/' };
const MESH: Producto = { producto: 'Mesh Camo Blue Tee', href: '/producto/mesh-camo-blue-tee/' };
const VENEZUELA: Producto = { producto: 'Stars For Venezuela Hoodie', href: '/producto/stars-for-venezuela-hoodie/' };
const HOODIE_PINK: Producto = { producto: 'Hoodie Pink', href: '/producto/hoodie-pink/' };
// Piezas de la produ que aún no están cargadas en el catálogo.
const GREY: Producto = { producto: 'Grey HStars Set' };
const WHITE_TOP: Producto = { producto: 'White Crop Top' };
const WHITE_TEE: Producto = { producto: 'White Tee' };
const DUO: Producto = { producto: 'White Tee + Black Tee' };

export const FW26: Lookbook = {
  dir: '/lookbook-fw26/book',
  eyebrow: 'Style&Culture',
  title: 'Lookbook FW26',
  intro: 'La colección FW26 puesta, en Rio de Janeiro. Fotos de Fili.',
  bloques: [
    { tipo: 'full', foto: f('6209', CAMO) },
    { tipo: 'tres', fotos: [f('6198', CAMO), f('6296', GREY), f('6309', GREY)] },
    { tipo: 'full', foto: f('6316', GREY) },
    { tipo: 'dos', fotos: [f('6335', GREY), f('6351', GREY)] },
    { tipo: 'tres', fotos: [f('6372', WHITE_TOP), f('6385', VENEZUELA), f('6416', VENEZUELA)] },
    { tipo: 'full', foto: f('6428', VENEZUELA) },
    { tipo: 'tres', fotos: [f('6439', VENEZUELA), f('6456', VENEZUELA), f('6458', VENEZUELA)] },
    { tipo: 'full', foto: f('6519', PINK) },
    { tipo: 'tres', fotos: [f('6487', PINK), f('6495', PINK), f('6501', PINK)] },
    { tipo: 'full', foto: f('6533', PINK) },
    { tipo: 'tres', fotos: [f('6540', PINK), f('6572', PINK), f('6592', PINK)] },
    { tipo: 'full', foto: f('6697', JORT) },
    { tipo: 'tres', fotos: [f('6718', MESH), f('6725', MESH), f('6720', MESH)] },
    { tipo: 'tres', fotos: [f('6765', WHITE_TEE), f('6781', WHITE_TEE), f('6794', WHITE_TEE)] },
    { tipo: 'dos', fotos: [f('6837', DUO), f('6841', DUO)] },
    { tipo: 'tres', fotos: [f('6857', HOODIE_PINK), f('6862', HOODIE_PINK), f('6852', HOODIE_PINK)] },
    { tipo: 'full', foto: f('6947', JERSEY) },
    { tipo: 'tres', fotos: [f('6898', JERSEY), f('6908', JERSEY), f('6929', JERSEY)] },
    { tipo: 'tres', fotos: [f('7003', JERSEY), f('7016', JERSEY), f('6977', JERSEY)] },
    { tipo: 'full', foto: f('6210', CAMO) },
  ],
};
