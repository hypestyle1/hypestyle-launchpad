import { foto as f, type Lookbook, type Producto } from './types';

// Faith Is The Real Hype: shooting de julio 2026 en Recoleta (fotos DSC03122–
// 03322 de la produ de agosto, que también tiene el Napoli en el potrero de
// La Boca). Todas verticales.
const WAFFLE: Producto = { producto: 'God Gave Me Style — Waffle Longsleeve', href: '/producto/longsleeve-waffle-god-gave-me-style/' };
const GREY_SET: Producto = { producto: 'Grey HStars — Hoodie + SweatPant', href: '/producto/hoodie-grey-hstars/' };
const BLACK_SET: Producto = { producto: 'Black HStars — Hoodie + SweatPant', href: '/producto/hoodie-black-hstars/' };
const LAMB: Producto = { producto: 'Lamb Of God Pink Tee', href: '/producto/lamb-of-god-pink-tee/' };
const CHRIST: Producto = { producto: 'Christ Reigns Hoodie', href: '/producto/christ-reigns-hoodie/' };
const HE_DIED: Producto = { producto: 'He Died So I Could Live — Grey Hoodie', href: '/producto/he-die-so-i-could-live-hoodie/' };
const NSFTF: Producto = { producto: 'No Service For The Faithless — Hoodie', href: '/producto/no-service-for-the-faithless-hoodie/' };
const VENEZUELA: Producto = { producto: 'Stars For Venezuela Hoodie', href: '/producto/stars-for-venezuela-hoodie/' };
// Piezas del shooting que no están en el catálogo.
const KNIT: Producto = { producto: 'Knit Sweater' };
const HE_DIED_BLACK: Producto = { producto: 'He Died So I Could Live — Black Hoodie' };
const HYPE_BLACK: Producto = { producto: 'Hype Black Hoodie' };

export const FAITH: Lookbook = {
  dir: '/lookbook-faith',
  eyebrow: 'Style&Culture',
  title: 'Faith Is The Real Hype',
  intro: 'La colección Faith puesta, en Buenos Aires. Julio 2026.',
  bloques: [
    { tipo: 'uno', foto: f('03126', WAFFLE) },
    { tipo: 'tres', fotos: [f('03130', WAFFLE), f('03133', WAFFLE), f('03141', KNIT)] },
    { tipo: 'dos', fotos: [f('03150', KNIT), f('03152', GREY_SET)] },
    { tipo: 'tres', fotos: [f('03158', GREY_SET), f('03165', GREY_SET), f('03171', LAMB)] },
    { tipo: 'uno', foto: f('03176', LAMB) },
    { tipo: 'tres', fotos: [f('03179', LAMB), f('03180', BLACK_SET), f('03186', BLACK_SET)] },
    { tipo: 'dos', fotos: [f('03189', BLACK_SET), f('03195', BLACK_SET)] },
    { tipo: 'tres', fotos: [f('03200', GREY_SET), f('03205', HYPE_BLACK), f('03214', CHRIST)] },
    { tipo: 'uno', foto: f('03216', CHRIST) },
    { tipo: 'tres', fotos: [f('03222', HE_DIED), f('03225', HE_DIED), f('03230', CHRIST)] },
    { tipo: 'dos', fotos: [f('03252', HE_DIED_BLACK), f('03265', NSFTF)] },
    { tipo: 'tres', fotos: [f('03272', NSFTF), f('03274', NSFTF), f('03277', KNIT)] },
    { tipo: 'uno', foto: f('03289', VENEZUELA) },
    { tipo: 'tres', fotos: [f('03293', VENEZUELA), f('03282', KNIT), f('03298', HYPE_BLACK)] },
    { tipo: 'tres', fotos: [f('03305', LAMB), f('03308', WAFFLE), f('03313', WAFFLE)] },
    { tipo: 'uno', foto: f('03320', LAMB) },
  ],
};
