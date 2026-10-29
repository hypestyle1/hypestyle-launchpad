/**
 * CYBER HYPE — la configuración comercial del EVENTO (2–4/11).
 * Fuente única del takeover: drops, Mystery, 4 PACK y curaduría del catálogo.
 *
 * ⚠️ ESTE MÓDULO ES SOLO DEL SERVIDOR.
 * Los drops sin revelar son SECRETOS: si un componente 'use client' importara
 * este archivo, el bundle del navegador llevaría los títulos y fotos antes de
 * la revelación y cualquiera los leería en el JS. Las secciones del cliente
 * reciben por props ÚNICAMENTE lo que devuelve `dropsPublicos()` — el test
 * `cyber-cartelera.test.ts` falla si un archivo de cliente importa esto.
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  QUÉ ESTÁ APROBADO Y QUÉ NO (29/10)                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  APROBADO: el concepto 3 DÍAS · 3 DROPS (uno por día, 2–4/11); el motor  ║
 * ║  del 4 PACK (ya en producción, abre solo por fecha); el evento en sí.    ║
 * ║  SIN APROBAR: el CONTENIDO de cada drop (producto: null hasta que        ║
 * ║  Valentín lo asigne), los precios de Mystery (productos sin existir en   ║
 * ║  Woo → MYSTERY_PUBLICADO=false: en producción la sección no sale),       ║
 * ║  regalos y envío gratis (ni aparecen).                                   ║
 * ║  PORCENTAJES: prohibidos siempre (89/145 con sale_price permanente).     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Horario: ISO con offset -03:00 (ART). El estado lo calcula el servidor en
 * cada request; el browser solo recibe lo ya publicable.
 */

import { CYBER_END, CYBER_START } from './cyber-hype';

/* ═══════════════════════════ 3 DÍAS · 3 DROPS ═══════════════════════════ */

export interface CyberDrop {
  id: '01' | '02' | '03';
  /** El día como se lee en la cartelera. */
  dia: string;
  fecha: string;
  /**
   * Cuándo se publica el contenido (ISO -03:00). Hasta ese instante el drop
   * se muestra bloqueado y el producto NO viaja al navegador. 11:00 es el
   * horario editorial por defecto; se ajusta al aprobar cada drop.
   */
  revealAt: string;
  /**
   * El contenido del drop. `null` = sin asignar: la tarjeta se muestra
   * bloqueada aun pasado revealAt. Asignarlo + revealAt cumplido = revelado.
   * La imagen tiene que ser un mockup/foto REAL ya publicado del producto.
   */
  producto: null | {
    nombre: string;
    claim: string;
    img: string;
    href: string;
  };
}

/**
 * Los tres drops, uno por día. CONTENIDO SIN ASIGNAR a propósito: depende de
 * mercadería recibida y controlada (remeras/longsleeves nuevas el 3/11,
 * bermudas y camperas camo el 4/11 — tentativos del replanteo del 27/10).
 * Para publicar uno: asignar `producto` con el OK de Valentín.
 */
export const CYBER_DROPS: CyberDrop[] = [
  {
    id: '01',
    dia: 'Día 1',
    fecha: 'lun 2/11',
    revealAt: '2026-11-02T11:00:00-03:00',
    producto: null,
  },
  {
    id: '02',
    dia: 'Día 2',
    fecha: 'mar 3/11',
    revealAt: '2026-11-03T11:00:00-03:00',
    producto: null,
  },
  {
    id: '03',
    dia: 'Día 3',
    fecha: 'mié 4/11',
    revealAt: '2026-11-04T11:00:00-03:00',
    producto: null,
  },
];

/** Lo ÚNICO del drop que puede viajar al navegador. */
export interface CyberDropPublico {
  id: string;
  dia: string;
  fecha: string;
  estado: 'bloqueado' | 'revelado';
  /** Solo presente cuando estado === 'revelado'. */
  producto?: { nombre: string; claim: string; img: string; href: string };
}

/**
 * La vista publicable de los drops: el producto aparece RECIÉN cuando pasó
 * `revealAt` y está asignado. Antes, la tarjeta dice el día y nada más — ni
 * en el HTML, ni en el JSON, ni en el bundle.
 */
export function dropsPublicos(now: Date = new Date()): CyberDropPublico[] {
  const t = now.getTime();
  return CYBER_DROPS.map((d) => {
    const revelado = d.producto !== null && t >= new Date(d.revealAt).getTime();
    return revelado
      ? { id: d.id, dia: d.dia, fecha: d.fecha, estado: 'revelado' as const, producto: d.producto! }
      : { id: d.id, dia: d.dia, fecha: d.fecha, estado: 'bloqueado' as const };
  });
}

/* ═══════════════════════════ MYSTERY ARCHIVE ════════════════════════════ */

/**
 * ¿Las Mystery Boxes están aprobadas para publicarse? En false la sección se
 * renderiza SOLO fuera de producción (para diseñar y revisar en local, con el
 * sello "en validación"). Pasa a true cuando Valentín apruebe pool + precio y
 * los productos existan en Woo — y ahí `href` pasa a la ficha real.
 */
export const MYSTERY_PUBLICADO = false;

export interface CyberMysteryCategoria {
  id: 'tees' | 'tops' | 'bottoms';
  nombre: string;
  /** Qué incluye, por mecánica. Nunca una cifra. */
  detalle: string;
  /** Cuántas prendas del archivo componen el pool visible de la portada. */
  pool: string;
  /** Portada real (collage de mockups de Woo, _claude/propuestas/MYSTERY-PORTADAS). */
  img: string;
  /** Ficha real cuando exista en Woo; null = sin producto todavía. */
  href: string | null;
}

/**
 * Las tres categorías, con las portadas REALES del 28/10 (mockups de Woo,
 * ninguna prenda inventada). Los pools son los medidos en los análisis
 * (cyber-mystery-tees.md / -tops.md / auditoría): la selección final la
 * aprueba Valentín.
 */
export const CYBER_MYSTERY: CyberMysteryCategoria[] = [
  {
    id: 'tees',
    nombre: 'Mystery Tees',
    detalle: 'Remeras del archivo Hype. Elegís tu talle; el modelo es sorpresa, dentro de las prendas que ves en la portada.',
    pool: '13 modelos en el pool',
    img: '/cyber/mystery/mystery-tees-1x1.webp',
    href: null,
  },
  {
    id: 'tops',
    nombre: 'Mystery Tops',
    detalle: 'Longsleeves, buzos y Half-Zips del archivo. Elegís tu talle; el modelo es sorpresa.',
    pool: '18 modelos en el pool',
    img: '/cyber/mystery/mystery-tops-1x1.webp',
    href: null,
  },
  {
    id: 'bottoms',
    nombre: 'Mystery Bottoms',
    detalle: 'Pants, jorts y bermudas del archivo. Elegís tu talle; el modelo es sorpresa.',
    pool: '8 modelos en el pool',
    img: '/cyber/mystery/mystery-bottoms-1x1.webp',
    href: null,
  },
];

/* ══════════════════════ CATÁLOGO DEL EVENTO (curaduría) ═════════════════ */

/**
 * El 4 PACK se arma con las 4 Regular individuales: el motor del carrito
 * (lib/promo-pack-regular.ts) cobra cada 4 al precio del 3 PACK, solo durante
 * la ventana. Las cards leen precio y stock de Woo en vivo.
 */
export const CYBER_PACK_SLUGS: string[] = [
  'regular-tee-black',
  'regular-tee-white',
  'regular-tee-melange',
  'regular-tee-navy',
];

/**
 * Destacados del evento — curaduría comercial del 29/10 sobre datos medidos
 * (matriz del 25/10 + auditoría del 27/10): protagonistas con stock y ventas
 * verificadas, sin tocar precios (los pone Woo).
 *  - 3 PACK: el ancla (42 packs/30d).
 *  - Hoodies SS27: la mayor contribución por unidad (38u, venden sin descuento).
 *  - Athletic Navy Mustard: 73u, curva completa de talles.
 *  - Waffles: Running Horses es el 3.º más vendido.
 *  - Grey Camo Cap: vende sola (add-on natural del carrito).
 *  - Baby Come Back (82u) y Aero (el mayor stock del catálogo): volumen real.
 */
export const CYBER_DESTACADOS_SLUGS: string[] = [
  'regular-tees-3-pack-black-navy-white',
  'hype-distressed-grey-hoodie',
  'zolotye-kupola-washed-graphite-hoodie',
  'splatter-hoodie-washed-grey',
  'athletic-dept-navy-mustard-print-tee',
  'longsleeve-waffle-horses',
  'grey-camo-cap',
  'baby-come-back-tees',
  'aerogrey-tees',
  'aeropink-tees',
  'hoodie-grey-hstars',
  'ladytribal-black-longsleeve',
];

/**
 * Jerarquía comercial del evento (la pidió Valentín el 29/10):
 * 1. Mystery Archive → 2. 4 PACK → 3. Drops → 4. Destacados → 5. Resto SS27.
 * En la página el orden visual es hero → drops (lo nuevo de HOY arriba) →
 * 4 PACK → Mystery → catálogo: lo urgente del día primero, lo permanente
 * después. Las categorías del catálogo salen de los productos reales.
 */
export const CYBER_CATALOGO_CATEGORIAS = ['Tee', 'Hoodie', 'Longsleeve', 'Pack'] as const;
