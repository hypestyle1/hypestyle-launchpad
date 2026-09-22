import { foto as f, type Lookbook, type Producto } from './types';

// Tie Dye Hoodie Drop x Ferpa, septiembre de 2020: la colab más
// vieja del archivo. Fueron 40 buzos y ninguno se vendió — se regalaron a los
// streamers e influencers del momento (Coscu, ZZK y compañía), así que la nota
// de las captions es la misma que usaba el banner del drop: "Not for sale".
// El buzo lleva "FERPA DROP 2020 / HYPESTYLE INC." estampado en la espalda.
const BUZO: Producto = { producto: 'Tie Dye Hoodie — x Ferpa', nota: 'Not for sale' };

export const FERPA: Lookbook = {
  dir: '/lookbook-ferpa',
  eyebrow: 'Style&Culture',
  title: 'Tie Dye Hoodie Drop x Ferpa',
  intro: 'Cuarenta buzos tie dye, ninguno a la venta: se repartieron entre los streamers y creadores del momento. Septiembre de 2020.',
  bloques: [
    { tipo: 'reel', mp4: 'reel', poster: 'reel', titulo: 'Tie Dye Hoodie Drop x Ferpa — el reel del drop' },
    { tipo: 'uno', foto: f('0134', BUZO) },
    { tipo: 'tres', fotos: [f('0141', BUZO), f('0142', BUZO), f('0143', BUZO)] },
    { tipo: 'full', foto: f('0184', BUZO) },
    // El buzo de frente y de espalda, y el key art del drop: sin ficha en Woo,
    // es lo único que muestra la pieza sola.
    { tipo: 'tres', fotos: [f('0194', BUZO), f('0195', BUZO), f('0229', BUZO)] },
  ],
};
