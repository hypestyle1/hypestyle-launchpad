// Tira de fotos de /private-access (SS27 Part 01), entre la cabecera y la
// grilla. Salen del post de presentación:
// Redes & Pauta/CONTENT SS27/post presentacion/SELECCION FINAL.
//
// WebP 1080×1350 (4:5) con sharp, ~130 KB cada una. Quedan afuera la portada
// (tiene texto), el video y la foto del equipo. El orden alterna chico, chica
// y piso para que la tira no repita dos planos iguales seguidos.
const FILES = [
  '01-duo',
  '02-eagle-18-el',
  '03-eagle-18-ella',
  '05-piso-athletic-ls',
  '04-athletic-ls-pink',
  '06-splatter',
  '07-sc-waffle',
  '17-h-hype-split',
  '08-polo',
  '11-athletic-ls-blue',
  '09-piso-athletic-boxy',
  '10-raglan-olive',
  '14-waffle-black',
  '18-varsity-crest-grid',
  '12-cross-waffle',
  '13-piso-018',
  '15-distressed',
  '16-duo-apoyada',
];

export const PRIVATE_BANNER_IMAGES = FILES.map((f, i) => ({
  src: `/ss27/banner/${f}.webp`,
  alt: `Spring Summer 27 · foto ${String(i + 1).padStart(2, '0')}`,
}));
