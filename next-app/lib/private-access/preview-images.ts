import type { CarouselImage } from '@/components/ui/3d-carousel';

// Fotos del carrusel 3D del home (Private Preview SS27). Una por producto de
// la sesión de estudio del 02/10/2026, los dos duos y cinco flatlays (el
// general, las Regular Tees y tres detalles de estampa). Origen:
// Redes & Pauta/CONTENT SS27/ESTUDIO/_SELECCION.
//
// Procesadas a WebP 900×1200 (3:4) con sharp, ~70 KB cada una; next/image las
// sirve todavía más chicas al tamaño real de cada cara del cilindro.
//
// El orden es el del cilindro (el número del archivo es solo su id): alterna
// chico y chica, mete un flatlay cada cinco o seis caras, el duo abre al
// frente y el segundo duo queda del lado opuesto. Los alt son genéricos a
// propósito: los nombres de producto todavía son provisorios y no se
// anuncian antes del lanzamiento.
const FILES = [
  '01-duo',
  '02-raglan-crest-olive',
  '03-018-varsity-navy',
  '04-eagle-18-hoodie',
  '31-flatlay-h-hype-white',
  '05-athletic-ls-pink',
  '06-athletic-boxy-navy',
  '11-mock-neck-black',
  '08-running-horses-waffle-white',
  '09-splatter-hoodie',
  '29-flatlay-general',
  '10-varsity-crest-white',
  '07-hearts-boxy-white',
  '12-athletic-ls-blue',
  '13-h-hype-boxy-navy',
  '27-duo-athletic-boxy',
  '15-distressed-hoodie',
  '32-flatlay-varsity-crest-black',
  '16-018-varsity-white',
  '17-style-culture-waffle',
  '28-regular-tee-navy',
  '19-dept-cross-waffle',
  '30-flatlay-regular-tees',
  '18-athletic-polo-grey',
  '21-dept-waffle-black',
  '20-varsity-crest-navy',
  '26-athletic-boxy-white',
  '23-varsity-crest-black',
  '25-regular-tee-black',
  '24-h-hype-boxy-white',
  '33-flatlay-athletic-boxy-navy',
  '22-regular-tee-white',
];

export const PRIVATE_PREVIEW_IMAGES: CarouselImage[] = FILES.map((f, i) => ({
  src: `/ss27/preview/${f}.webp`,
  alt: f.includes('flatlay')
    ? `Spring Summer 27 · flatlay ${String(i + 1).padStart(2, '0')}`
    : `Spring Summer 27 · look ${String(i + 1).padStart(2, '0')}`,
}));
