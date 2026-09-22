import { foto as f, type Lookbook, type Producto } from './types';

// Neo Pistea x Hypestyle: el merch oficial de CULTO. Dos fuentes en un mismo
// lookbook —el shooting de la colección en Buenos Aires (04/02/2025, fotos
// "Hypestyle x Neo-0XX") y Neo con la colección puesta en vivo en Mar del
// Plata (26/01/2025, las tres `live-`)—. Ninguna de las tres remeras quedó
// cargada en Woo: fue una tirada corta que se agotó, así que todas van sin
// `href` y con la nota "Agotado" en vez de "Próximamente".
const AGOTADO = { nota: 'Agotado' };
const CULTO: Producto = { producto: 'CULTO Tee — Neo Pistea x Hypestyle', ...AGOTADO };
const TELEFONO: Producto = { producto: 'Teléfono Rojo Tee — Neo Pistea x Hypestyle', ...AGOTADO };
const CHAIN: Producto = { producto: 'Neo Pistea x Hypestyle Tee', ...AGOTADO };

export const NEO: Lookbook = {
  dir: '/lookbook-neo',
  eyebrow: 'Style&Culture',
  title: 'Neo Pistea x Hypestyle',
  intro: 'Merch oficial de CULTO. El shooting de la colección en Buenos Aires y Neo con las remeras puestas arriba del escenario, en Mar del Plata. Verano 2025.',
  bloques: [
    { tipo: 'uno', foto: f('102', TELEFONO) },
    { tipo: 'tres', fotos: [f('011', CULTO), f('026', CULTO), f('036', CULTO)] },
    { tipo: 'dos', fotos: [f('047', TELEFONO), f('129', CHAIN)] },
    { tipo: 'uno', foto: f('141', CHAIN) },
    { tipo: 'full', foto: f('live-01', CULTO) },
    { tipo: 'dos', fotos: [f('live-02', CULTO), f('live-03', CULTO)] },
  ],
};
