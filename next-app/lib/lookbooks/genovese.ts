import { foto as f, type Lookbook, type Producto } from './types';

// Fileteado Porteño x Alfredo Genovese: el jersey fileteado, fotografiado y
// filmado en la cancha de la Villa 31 el 19/12/2025. A diferencia de las otras
// dos colabs del archivo, esta pieza sigue viva en Woo (#531, con stock), así
// que las captions linkean a la ficha en vez de decir "Agotado".
const JERSEY: Producto = {
  producto: 'Jersey Fileteado — x Alfredo Genovese',
  href: '/producto/jersey-fileteado-x-alfredo-genovese/',
};

export const GENOVESE: Lookbook = {
  dir: '/lookbook-genovese',
  eyebrow: 'Style&Culture',
  title: 'Fileteado Porteño x Alfredo Genovese',
  intro: 'El jersey fileteado por Alfredo Genovese, en la cancha de la Villa 31. Filete porteño sobre una camiseta de fútbol. Diciembre de 2025.',
  bloques: [
    { tipo: 'video', youtube: 'WKox7VQJKYM', poster: 'film', titulo: 'Fileteado Porteño x Alfredo Genovese — el film en la Villa 31' },
    { tipo: 'uno', foto: f('06447', JERSEY) },
    { tipo: 'tres', fotos: [f('06684', JERSEY), f('06686', JERSEY), f('06708', JERSEY)] },
    { tipo: 'dos', fotos: [f('06685', JERSEY), f('06700', JERSEY)] },
    { tipo: 'tres', fotos: [f('06690', JERSEY), f('06691', JERSEY), f('06695', JERSEY)] },
    { tipo: 'uno', foto: f('06702', JERSEY) },
  ],
};
