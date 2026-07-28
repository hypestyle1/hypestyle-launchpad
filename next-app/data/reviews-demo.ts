import type { PublicReview } from '@/lib/reviews/types';

/**
 * Reseñas de demostración — SOLO para preview visual mientras no hay reseñas
 * reales aprobadas. Se activan únicamente con NEXT_PUBLIC_REVIEWS_DEMO_MODE=true
 * (ver lib/reviews/public.ts). Nunca deben aparecer en producción ni presentarse
 * como testimonios reales: isDemo=true en cada una, verified siempre false (sin
 * "Compra verificada"), nombres abreviados, sin fotos de personas.
 */
export const DEMO_REVIEWS: PublicReview[] = [
  {
    id: 'demo-1',
    customerName: 'Lucía M.',
    rating: 5,
    text: 'La calidad superó lo que esperaba y el fit quedó tal cual se veía en las fotos. Repito seguro.',
    createdAt: '2026-06-14',
    productName: 'Beanie Camo',
    productSlug: 'beanie-camo',
    productImage: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/05/generated-image-april-27-2026-1_45pm-032687eb61185f220d17773218712367-1024-1024.jpg',
    verified: false,
    incentivized: true,
    isDemo: true,
  },
  {
    id: 'demo-2',
    customerName: 'Tomás R.',
    rating: 4,
    text: 'Llegó muy bien presentado y la tela se siente de buena calidad. Le bajo un punto solo porque tardó un poco más de lo esperado.',
    createdAt: '2026-06-22',
    productName: 'HOODIE - STAY HUSTLE.',
    productSlug: 'hoodie-stay-hustle',
    productImage: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/05/mesa-de-trabajo-1-copia-2-acec0af1d7074a2d1217687822617715-1024-1024-1.png',
    verified: false,
    incentivized: true,
    isDemo: true,
  },
  {
    id: 'demo-3',
    customerName: 'Agustina C.',
    rating: 5,
    text: 'Tenía dudas con el talle y me ayudaron por WhatsApp antes de comprar. Terminó quedándome perfecto.',
    createdAt: '2026-07-02',
    productName: 'Zip Hoodie Pink',
    productSlug: 'zip-hoodie-pink',
    productImage: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/04/pink-zip-frente-fb1312b6e42f00f03717766492551864-1024-1024.png',
    verified: false,
    incentivized: false,
    isDemo: true,
  },
  {
    id: 'demo-4',
    customerName: 'Franco D.',
    rating: 4,
    text: 'Buenos detalles de terminación y se nota la calidad de la prenda. Un poco justo de talle para mi gusto, pero volvería a comprar.',
    createdAt: '2026-07-09',
    productName: 'Zip Hoodie Camo',
    productSlug: 'zip-hoodie-camo',
    productImage: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/04/zipcamo_frente-f2a08e52e942c03cff17752461590807-1024-1024.png',
    verified: false,
    incentivized: true,
    isDemo: true,
  },
  {
    id: 'demo-5',
    customerName: 'Martina S.',
    rating: 5,
    text: 'El pedido llegó bien empaquetado y todo estaba impecable. La musculosa se ve igual que en las fotos, muy conforme.',
    createdAt: '2026-07-15',
    productName: 'WAFFLE CREST SLEEVELESS – Pearl Grey',
    productSlug: 'waffle-crest-sleeveless-pearl-grey',
    productImage: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/04/wafle-gris-a6369ecb409b8e70de17662582045223-1024-1024.png',
    verified: false,
    incentivized: false,
    isDemo: true,
  },
  {
    id: 'demo-6',
    customerName: 'Nicolás P.',
    rating: 4,
    text: 'Gorra sólida, buena forma y buen bordado. El envío se demoró un par de días de lo estimado pero llegó todo perfecto.',
    createdAt: '2026-07-20',
    productName: 'TRUCKER CAP - NO FAITH, NO GLORY',
    productSlug: 'trucker-cap-no-faith-no-glory',
    productImage: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/04/mesa-de-trabajo-1-fa53c33493ac8f8d9e17658384833281-1024-1024.png',
    verified: false,
    incentivized: true,
    isDemo: true,
  },
];
