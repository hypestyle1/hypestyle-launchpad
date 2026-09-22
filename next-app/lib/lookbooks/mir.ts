import { foto as f, type Lookbook, type Producto } from './types';

// La Ciudad del Pop x Mir Nicolás: colab de octubre de 2025 con pop-up en
// Vorterix. El shooting es del 26/09/2025 —estudio, la casa del comedor con
// la alfombra HS y la terraza— y el film está en el canal de YouTube de
// Hypestyle. Tres gráficas, cada una en negra y blanca; como la de Neo, la
// tirada se agotó sin quedar cargada en Woo, así que todas van con "Agotado".
const AGOTADO = { nota: 'Agotado' };
const CIUDAD: Producto = { producto: 'Ciudad Tee — La Ciudad del Pop x Mir Nicolás', ...AGOTADO };
const GRAFFITI: Producto = { producto: 'Graffiti Tee — La Ciudad del Pop x Mir Nicolás', ...AGOTADO };
const POP: Producto = { producto: 'La Ciudad del Pop Tee — x Mir Nicolás', ...AGOTADO };
const COLECCION: Producto = { producto: 'La Ciudad del Pop x Mir Nicolás — la colección', ...AGOTADO };

export const MIR: Lookbook = {
  dir: '/lookbook-mir',
  eyebrow: 'StyleRap&Culture',
  title: 'La Ciudad del Pop x Mir Nicolás',
  intro: 'Arte exclusivo inspirado en el universo visual de Mir Nicolás y la cultura urbana japonesa. Tres gráficas en negro y en blanco, edición especial. Octubre de 2025.',
  bloques: [
    { tipo: 'video', youtube: 'JV93JQBOkVM', poster: 'film', titulo: 'La Ciudad del Pop — el film' },
    { tipo: 'uno', foto: f('04442', CIUDAD) },
    { tipo: 'tres', fotos: [f('04265', GRAFFITI), f('04382', POP), f('04491', CIUDAD)] },
    { tipo: 'uno', foto: f('04470', CIUDAD) },
    { tipo: 'tres', fotos: [f('04544', COLECCION), f('04547', COLECCION), f('lineup', COLECCION)] },
  ],
};
