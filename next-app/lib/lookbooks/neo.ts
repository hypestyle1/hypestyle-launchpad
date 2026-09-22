import { foto as f, type Lookbook, type Producto } from './types';

// CULTO x Neo Pistea: el merch oficial del disco. Abre con Neo —las tres
// fotos en vivo en Mar del Plata (26/01/2025, las `live-`), las piezas de
// campaña del drop (las `post-`) y el reel— y recién después va el shooting de
// la colección en Buenos Aires (04/02/2025, "Hypestyle x Neo-0XX"). Cierra con
// el lineup de las tres remeras, que es lo único que las muestra solas.
// Ninguna quedó cargada en Woo: fue una tirada corta que se agotó, así que
// todas van sin `href` y con la nota "Agotado" en vez de "Próximamente".
const AGOTADO = { nota: 'Agotado' };
const CULTO: Producto = { producto: 'CULTO Tee — x Neo Pistea', ...AGOTADO };
const TELEFONO: Producto = { producto: 'Teléfono Rojo Tee — x Neo Pistea', ...AGOTADO };
const CHAIN: Producto = { producto: 'Graffiti Tee — x Neo Pistea', ...AGOTADO };
const COLECCION: Producto = { producto: 'CULTO x Neo Pistea — la colección', ...AGOTADO };

export const NEO: Lookbook = {
  dir: '/lookbook-neo',
  eyebrow: 'Style&Culture',
  title: 'CULTO x Neo Pistea',
  intro: 'El merch oficial del disco. Neo con las remeras puestas arriba del escenario en Mar del Plata, y el shooting de la colección en Buenos Aires. Verano 2025.',
  bloques: [
    { tipo: 'full', foto: f('live-01', CULTO) },
    { tipo: 'tres', fotos: [f('post-01', CULTO), f('post-02', CULTO), f('post-03', CULTO)] },
    { tipo: 'dos', fotos: [f('live-02', CULTO), f('live-03', CULTO)] },
    { tipo: 'reel', mp4: 'reel', poster: 'reel', titulo: 'CULTO x Neo Pistea — el reel del drop' },
    { tipo: 'uno', foto: f('102', TELEFONO) },
    { tipo: 'tres', fotos: [f('011', CULTO), f('026', CULTO), f('036', CULTO)] },
    { tipo: 'dos', fotos: [f('047', TELEFONO), f('129', CHAIN)] },
    { tipo: 'uno', foto: f('141', CHAIN) },
    { tipo: 'uno', foto: f('lineup', COLECCION) },
  ],
};
