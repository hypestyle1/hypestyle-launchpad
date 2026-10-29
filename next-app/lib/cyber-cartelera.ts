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
 * La hora de revelación por defecto, en ART. **NO está confirmada** (29/10):
 * las 11:00 salieron del plan editorial, no de una decisión. Cada drop puede
 * pisarla con su propio `revealAt`.
 *
 * Para cambiarla hay un solo lugar: esta constante. Dato medido que conviene
 * tener a mano al decidir: el pico de compra del sitio es a las 22 h, y a las
 * 8 h hubo 2 pedidos en tres meses y medio — una revelación de mañana se
 * comunica de mañana, pero se compra de noche.
 */
const HORA_REVELACION = '11:00:00';

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
    revealAt: `2026-11-02T${HORA_REVELACION}-03:00`,
    producto: null,
  },
  {
    id: '02',
    dia: 'Día 2',
    fecha: 'mar 3/11',
    revealAt: `2026-11-03T${HORA_REVELACION}-03:00`,
    producto: null,
  },
  {
    id: '03',
    dia: 'Día 3',
    fecha: 'mié 4/11',
    revealAt: `2026-11-04T${HORA_REVELACION}-03:00`,
    producto: null,
  },
];

/** Lo ÚNICO del drop que puede viajar al navegador. */
export interface CyberDropPublico {
  id: string;
  dia: string;
  fecha: string;
  estado: 'bloqueado' | 'revelado';
  /**
   * CUÁNDO se revela, en ISO. Decir la hora no revela el contenido y da el
   * motivo para volver: es la diferencia entre "algo viene" y "volvé el
   * martes a las 11". Viaja también en los bloqueados, a propósito.
   */
  revealAt: string;
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
    const base = { id: d.id, dia: d.dia, fecha: d.fecha, revealAt: d.revealAt };
    return revelado
      ? { ...base, estado: 'revelado' as const, producto: d.producto! }
      : { ...base, estado: 'bloqueado' as const };
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
  id: 'tees' | 'longsleeves' | 'hoodies';
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
 * Las tres categorías.
 *
 * ── CAMBIO DE CRITERIO (29/10) ──────────────────────────────────────────────
 * **Mystery Bottoms quedó descartado**: poco stock y talles quebrados. Las
 * tres cajas pasan a ser todas de la parte de arriba — Tees, Longsleeves y
 * Hoodies. Antes eran Tees / Tops / Bottoms, con "Tops" mezclando mangas
 * largas y buzos; separarlos además hace la propuesta más clara: cada caja es
 * un tipo de prenda, no una bolsa de categorías.
 *
 * Los pools definitivos y las portadas nuevas (fondo claro, composición
 * editorial) se están trabajando contra el stock real: hasta que estén, estas
 * cifras de "modelos en el pool" son las de la medición anterior y las
 * portadas son las de la versión previa. **Nada de esto se publica**:
 * MYSTERY_PUBLICADO sigue en false y la sección solo se monta fuera de
 * producción.
 */
export const CYBER_MYSTERY: CyberMysteryCategoria[] = [
  {
    id: 'tees',
    nombre: 'Mystery Tees',
    detalle: 'La puerta de entrada al archivo. Elegís tu talle; el modelo es sorpresa, dentro de las prendas que ves en la portada.',
    pool: 'Pool en definición',
    img: '/cyber/mystery/mystery-tees-1x1.webp',
    href: null,
  },
  {
    id: 'longsleeves',
    nombre: 'Mystery Longsleeves',
    detalle: 'Waffles, Athletic Dept y las mangas largas del archivo. Elegís tu talle; el modelo es sorpresa.',
    pool: 'Pool en definición',
    img: '/cyber/mystery/mystery-tops-1x1.webp',
    href: null,
  },
  {
    id: 'hoodies',
    nombre: 'Mystery Hoodies',
    detalle: 'Hoodies del archivo con stock real. Elegís tu talle; el modelo es sorpresa.',
    pool: 'Pool en definición',
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
 * Destacados del evento — **curaduría medida el 29/10 contra Woo en vivo**
 * (auditoría completa en `_claude/propuestas/CYBER-EVENTO/curaduria-catalogo.md`).
 *
 * El orden es por facturación retail de 30 días, que es también el orden en
 * que conviene leerlos en mobile: a 2 columnas, las dos primeras filas son el
 * 40% del negocio. Los 12 están publish, instock, con ≥5 fotos y portada
 * mockup verificada, y TODOS tienen venta real en 30 días.
 *
 * La lista anterior (escrita de memoria sobre las auditorías viejas) tenía 5
 * productos con CERO ventas en 30 días y dejaba afuera a 5 del top 10 — entre
 * ellos el #2 del catálogo, el camo Faith Over Everything.
 *
 * Dos avisos de stock que no son obvios y que condicionan qué se comunica:
 *  - `find-jesus-longsleeve-black` y `lettering-black-longsleeve` comparten la
 *    pila `longsleeve_negro` (56 u en total, NO 112): el stock no es aditivo.
 *  - Los dos 3 PACK (black-navy-white y black) comparten la pila negra, y los
 *    dos están sin talle M.
 */
export const CYBER_DESTACADOS_SLUGS: string[] = [
  'regular-tees-3-pack-black-navy-white',
  'faith-over-everything-camo-hoodie',
  'zolotye-kupola-washed-graphite-hoodie',
  'regular-tees-3-pack-black',
  'find-jesus-longsleeve-black',
  'sweatpant-grey-hstars',
  'grey-camo-cap',
  'splatter-hoodie-washed-grey',
  'lettering-black-longsleeve',
  'longsleeve-waffle-horses',
  'camo-cap',
  'hype-distressed-grey-hoodie',
  // Las cuatro que completan la grilla a 16 (4 filas limpias en desktop, 8 en
  // mobile). Banco verificado el 29/10: existen, publish, con stock y foto.
  // `regular-tees-3-pack-white` entra por una razón que no es su facturación:
  // es el ÚNICO 3 PACK con talle M, y el M es lo que más se pide.
  'ladytribal-black-longsleeve',
  'hype-washed-black-waffle-longsleeve',
  'honda-white-tee',
  'regular-tees-3-pack-white',
];

/**
 * Los filtros del catálogo, curados.
 *
 * Antes cada filtro era `data.filter(categoría)` y el orden lo decidía la API:
 * con 65 remeras publicadas, el primero era arbitrario — la diferencia entre
 * abrir con HONDA o con una AERO sin foto. Estas listas fijan el orden de lo
 * que importa; lo que no está en la lista sigue apareciendo después, por
 * categoría, así que ningún producto desaparece del catálogo.
 *
 * `cats` son las categorías reales de Woo que caen en cada filtro. Pantalón y
 * Accesorio no tenían filtro propio y por eso quedaban solo en "Todo" (que
 * corta en 24): ahí viven dos del top 10, el SweatPant Grey y la Grey Camo Cap.
 */
/**
 * Los accesos rápidos de abajo del hero. Cada uno lleva a **su página real**
 * del sitio (verificadas respondiendo 200 el 29/10), salvo Mystery y Drops,
 * que solo existen dentro del evento y llevan a su ancla.
 *
 * `slugFoto` es el producto que le presta la foto de portada al tile: siempre
 * el líder de esa categoría según la curaduría medida. Nada de íconos
 * genéricos ni fotos inventadas.
 */
export const CYBER_ACCESOS: {
  id: string;
  label: string;
  href: string;
  slugFoto: string | null;
  img: string | null;
}[] = [
  { id: 'tees', label: 'Remeras', href: '/tees', slugFoto: 'honda-white-tee', img: null },
  { id: 'hoodies', label: 'Hoodies', href: '/hoodies', slugFoto: 'faith-over-everything-camo-hoodie', img: null },
  { id: 'longsleeves', label: 'Longsleeves', href: '/longsleeves', slugFoto: 'find-jesus-longsleeve-black', img: null },
  { id: 'pants', label: 'Pantalones', href: '/pants', slugFoto: 'sweatpant-grey-hstars', img: null },
  { id: 'packs', label: 'Packs', href: '/colecciones/regular-tees', slugFoto: 'regular-tees-3-pack-black-navy-white', img: null },
  // Las dos que solo existen dentro del evento.
  { id: 'mystery', label: 'Mystery Archive', href: '#mystery', slugFoto: null, img: '/cyber/mystery/mystery-tops-1x1.webp' },
  { id: 'drops', label: 'Los 3 drops', href: '#drops', slugFoto: null, img: null },
];

export interface CyberFiltro {
  id: string;
  label: string;
  cats: string[];
  /** Orden curado; el resto de la categoría va detrás. */
  slugs: string[];
}

export const CYBER_FILTROS: CyberFiltro[] = [
  {
    id: 'tees',
    label: 'Tees',
    cats: ['Tee'],
    slugs: [
      'honda-white-tee',
      'h-hype-white-tee',
      'athletic-dept-navy-mustard-print-tee',
      'worn-varsity-club-white-tee',
      'athletic-dept-navy-tee',
      'christ-reigns-tee',
      'only-god-can-judge-me-blanca',
      'lamb-of-god-pink-tee',
      'style-culture-university-black-tee',
      'style-culture-university-navy-tee',
      'style-culture-university-white-tee',
      'napoli-tee-azul',
      'napoli-tee-blanca',
      'honda-black-tee',
    ],
  },
  {
    id: 'hoodies',
    label: 'Hoodies',
    cats: ['Hoodie', 'Set'],
    slugs: [
      'faith-over-everything-camo-hoodie',
      'zolotye-kupola-washed-graphite-hoodie',
      'splatter-hoodie-washed-grey',
      'hype-distressed-grey-hoodie',
      'hs-co-green-hoodie',
      'hoodie-grey-hstars',
      'hs-co-grey-hoodie',
      'lion-of-judah-stone-wash-hoodie',
      'hoodie-pink',
      'no-service-for-the-faithless-hoodie',
    ],
  },
  {
    id: 'longsleeves',
    label: 'Longsleeves',
    cats: ['Longsleeve', 'Polo'],
    slugs: [
      'find-jesus-longsleeve-black',
      'lettering-black-longsleeve',
      'longsleeve-waffle-horses',
      'ladytribal-black-longsleeve',
      'hype-washed-black-waffle-longsleeve',
      'athletic-dept-pink-longsleeve',
      'athletic-dept-blue-longsleeve',
      'hs-crest-olive-raglan-longsleeve',
      'hype-creative-goods-pink-raglan-longsleeve',
      'dept-of-culture-eagle-pink-raglan-longsleeve',
      'half-zip-polo-black',
      'athletic-dept-washed-grey-polo',
    ],
  },
  {
    // Pantalón + Accesorio: las dos categorías que facturan y no tenían filtro.
    id: 'bottoms',
    label: 'Bottoms y accesorios',
    cats: ['Pantalón', 'Jort', 'Accesorio'],
    slugs: ['sweatpant-grey-hstars', 'grey-camo-cap', 'camo-cap'],
  },
  {
    id: 'packs',
    label: 'Packs',
    cats: ['Pack'],
    slugs: [
      'regular-tees-3-pack-black-navy-white',
      // El White sube al 2.º puesto CONTRA su facturación a propósito: es el
      // único 3 PACK con talle M, y el M es lo que más se pide.
      'regular-tees-3-pack-white',
      'regular-tees-3-pack-black',
      'regular-tees-3-pack-navy',
      'regular-tees-3-pack-black-white-melange',
      'regular-tees-3-pack-black-melange-navy',
      'regular-tees-3-pack-melange-navy-white',
      'regular-tees-3-pack-grey',
    ],
  },
];
