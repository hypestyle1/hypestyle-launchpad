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
// Look gris: el polo en los planos cortos, el sweatpant en los de cuerpo entero.
const POLO_GREY: Producto = { producto: 'Half-Zip Polo Melange', href: '/producto/half-zip-polo-melange/' };
const PANT_GREY: Producto = { producto: 'SweatPant Grey HStars', href: '/producto/sweatpant-grey-hstars/' };
const OGCJM_WHITE: Producto = { producto: 'Only God Can Judge Me — Blanca', href: '/producto/only-god-can-judge-me-blanca/' };
const OGCJM_BLACK: Producto = { producto: 'Only God Can Judge Me — Negra', href: '/producto/only-god-can-judge-me-negra/' };
// Pieza de la produ que aún no está cargada en el catálogo.
const WHITE_TOP: Producto = { producto: 'White Crop Top' };

export const FW26: Lookbook = {
  dir: '/lookbook-fw26/book',
  eyebrow: 'Style&Culture',
  title: 'Lookbook FW26',
  intro: 'La colección FW26 puesta, en Rio de Janeiro. Fotos de Fili.',
  bloques: [
    { tipo: 'full', foto: f('6209', CAMO) },
    { tipo: 'tres', fotos: [f('6198', CAMO), f('6296', POLO_GREY), f('6309', PANT_GREY)] },
    { tipo: 'full', foto: f('6316', POLO_GREY) },
    { tipo: 'dos', fotos: [f('6335', POLO_GREY), f('6351', PANT_GREY)] },
    { tipo: 'tres', fotos: [f('6372', WHITE_TOP), f('6385', VENEZUELA), f('6416', VENEZUELA)] },
    { tipo: 'full', foto: f('6428', VENEZUELA) },
    { tipo: 'tres', fotos: [f('6439', VENEZUELA), f('6456', VENEZUELA), f('6458', VENEZUELA)] },
    { tipo: 'full', foto: f('6519', PINK) },
    { tipo: 'tres', fotos: [f('6487', PINK), f('6495', PINK), f('6501', PINK)] },
    { tipo: 'full', foto: f('6533', PINK) },
    { tipo: 'tres', fotos: [f('6540', PINK), f('6572', PINK), f('6592', PINK)] },
    { tipo: 'full', foto: f('6697', JORT) },
    { tipo: 'tres', fotos: [f('6718', MESH), f('6725', MESH), f('6720', MESH)] },
    { tipo: 'tres', fotos: [f('6765', OGCJM_WHITE), f('6781', OGCJM_WHITE), f('6794', OGCJM_WHITE)] },
    { tipo: 'dos', fotos: [f('6837', OGCJM_BLACK), f('6841', OGCJM_WHITE)] },
    { tipo: 'tres', fotos: [f('6857', HOODIE_PINK), f('6862', HOODIE_PINK), f('6852', HOODIE_PINK)] },
    { tipo: 'full', foto: f('6947', JERSEY) },
    { tipo: 'tres', fotos: [f('6898', JERSEY), f('6908', JERSEY), f('6929', JERSEY)] },
    { tipo: 'tres', fotos: [f('7003', JERSEY), f('7016', JERSEY), f('6977', JERSEY)] },
    { tipo: 'full', foto: f('6210', CAMO) },
  ],
};
