// Catálogo ficticio de SS27 para diseñar la experiencia antes de cargar los
// productos reales en Woo. Mismo shape que va a devolver el endpoint privado
// (normalizado como NormalizedProduct + descripción para la ficha). Las fotos
// son mockups reales del repo (public/), para evaluar jerarquía y layout con
// imágenes de verdad y no con cuadrados grises.

import type { NormalizedProduct } from '@/lib/products-normalize';
import { PRIVATE_ACCESS_PATH } from './config';

export interface PrivateProduct extends NormalizedProduct {
  description: string;
  details: { label: string; text: string }[];
}

const SIZES = ['S', 'M', 'L', 'XL'];
const ONE = ['Única'];

// Precios placeholder en ARS. El "originalPrice" es el regular; "price" ya
// lleva el 20% off, igual que lo va a traer Woo con la oferta programada.
function p(regular: number) {
  return { originalPrice: regular, price: Math.round(regular * 0.8 / 100) * 100 };
}

const enc = (path: string) => encodeURI(path);

const DESC_TEE = 'Remera oversize de algodón peinado 24/1, 220 g. Cuello reforzado, hombro caído y estampa serigráfica al agua. Fit boxy: holgada en el torso, largo por encima de la cadera.';
const DESC_HOODIE = 'Hoodie de frisa invisible premium 450 g, capucha doble con cordón de algodón y bolsillo canguro. Fit relaxed con hombro caído. Estampa serigráfica de alta densidad.';
const DESC_SHORT = 'Jort de frisa 400 g, cintura elástica con cordón de algodón y bolsillos laterales. Largo 3/4, ruedo crudo. Fit relaxed.';
const DESC_CAP = 'Gorra trucker de malla con frente de gabardina. Pintada a mano una por una: no hay dos iguales. Ajuste trasero snapback.';

const DETAILS_APPAREL = [
  { label: 'Composición', text: '100% algodón peinado. Hecho en Argentina.' },
  { label: 'Fit y talle', text: 'Oversize. Si estás entre dos talles, elegí el menor. El modelo mide 1,80 m y usa talle M.' },
  { label: 'Cuidados', text: 'Lavar del revés en agua fría. No usar secadora. Planchar a temperatura baja, sin pasar por la estampa.' },
  { label: 'Preventa', text: 'Precio de Mejores Amigos válido hasta el 10.10. El 11.10 la colección sale al público a precio regular.' },
];

const DETAILS_CAP = [
  { label: 'Composición', text: 'Frente de gabardina de algodón, malla de poliéster. Pintada a mano.' },
  { label: 'Talle', text: 'Único, ajustable con snapback trasero.' },
  { label: 'Cuidados', text: 'Limpiar con paño húmedo. No sumergir en agua.' },
  { label: 'Preventa', text: 'Precio de Mejores Amigos válido hasta el 10.10. El 11.10 la colección sale al público a precio regular.' },
];

const base = (slug: string, name: string, category: string, regular: number, images: string[], sizes: string[], stock: Record<string, 'ok' | 'low' | 'out'>, description: string, details = DETAILS_APPAREL): PrivateProduct => ({
  id: slug,
  slug,
  name,
  category,
  ...p(regular),
  badge: '−20%',
  image: images[0],
  images,
  href: `${PRIVATE_ACCESS_PATH}/${slug}`,
  sizes,
  stock,
  tags: ['ss27-part-01'],
  description,
  details,
});

export const MOCK_PRODUCTS: PrivateProduct[] = [
  base('ss27-tee-01', 'SS27 Tee 01', 'Tee', 58000,
    [enc('/No servide for the faithless tee.webp'), '/lookbook-fw26/book/6278.webp', '/lookbook-fw26/book/6296.webp'],
    SIZES, { S: 'ok', M: 'ok', L: 'ok', XL: 'low' }, DESC_TEE),
  base('ss27-tee-02', 'SS27 Tee 02', 'Tee', 58000,
    [enc('/mesh azul.webp'), '/lookbook-fw26/book/6309.webp', '/lookbook-fw26/book/6323.webp'],
    SIZES, { S: 'ok', M: 'ok', L: 'low', XL: 'out' }, DESC_TEE),
  base('ss27-hoodie-01', 'SS27 Hoodie 01', 'Hoodie', 118000,
    [enc('/hoodie lettering.webp'), '/newin/grey-hstars.webp', '/lookbook-fw26/book/6335.webp'],
    SIZES, { S: 'ok', M: 'ok', L: 'ok', XL: 'ok' }, DESC_HOODIE),
  base('ss27-jersey-01', 'SS27 Jersey 01', 'Jersey', 76000,
    [enc('/hyped up grey.webp'), '/lookbook-fw26/book/6372.webp', '/lookbook-fw26/book/6385.webp'],
    SIZES, { S: 'low', M: 'ok', L: 'ok', XL: 'ok' }, DESC_TEE),
  base('ss27-short-01', 'SS27 Short 01', 'Jort', 69000,
    [enc('/jort lettering grey.webp'), '/newin/faith-christ-reigns-tee.webp', '/lookbook-fw26/book/6210.webp'],
    SIZES, { S: 'ok', M: 'ok', L: 'ok', XL: 'ok' }, DESC_SHORT),
  base('ss27-tee-03', 'SS27 Tee 03', 'Tee', 58000,
    [enc('/mesh rosa.webp'), '/lookbook-fw26/book/6416.webp', '/lookbook-fw26/book/6428.webp'],
    SIZES, { S: 'ok', M: 'ok', L: 'ok', XL: 'ok' }, DESC_TEE),
  base('ss27-top-01', 'SS27 Top 01', 'Top', 42000,
    [enc('/No Love, Only Style Top.webp'), '/lookbook-fw26/book/6439.webp', '/lookbook-fw26/book/6442.webp'],
    ['S', 'M', 'L'], { S: 'ok', M: 'ok', L: 'out' }, DESC_TEE),
  base('ss27-cap-01', 'SS27 Cap 01', 'Accesorio', 36000,
    [enc('/gorra randal.webp'), '/lookbook-fw26/book/6456.webp', '/lookbook-fw26/book/6458.webp'],
    ONE, { Única: 'ok' }, DESC_CAP, DETAILS_CAP),
];

export function getMockProducts(): PrivateProduct[] {
  return MOCK_PRODUCTS;
}

export function getMockProduct(slug: string): PrivateProduct | undefined {
  return MOCK_PRODUCTS.find(x => x.slug === slug);
}
