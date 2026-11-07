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
import { MYSTERY_CAJAS } from './mystery';

/* ═══════════════════════════ 3 DÍAS · 3 DROPS ═══════════════════════════ */

/** Una prenda de un drop (mockup individual sobre transparente). */
export interface CyberDropPieza {
  /** Nombre corto, sin el colorway: "Zip Hoodie". */
  nombre: string;
  color: string;
  img: string;
  /** Slug de Woo; null = el producto todavía no existe. */
  slug: string | null;
  /** true solo si el producto está PUBLICADO en Woo. */
  publicado: boolean;
}

/** Lo único de una prenda que viaja al navegador: el link ya resuelto. */
export interface CyberDropPiezaPublica {
  nombre: string;
  color: string;
  img: string;
  href: string | null;
}

export function piezaPublica(p: CyberDropPieza): CyberDropPiezaPublica {
  return {
    nombre: p.nombre,
    color: p.color,
    img: p.img,
    href: p.publicado && p.slug ? `/producto/${p.slug}` : null,
  };
}

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
    /** null = revelado SIN compra (p. ej. preventa aún no cargada en Woo). */
    href: string | null;
    /** Aviso de preventa, si corresponde. Nunca prometer stock que no está. */
    preventa?: string;
    /**
     * Las prendas del drop, una por mockup. Cada una tiene su PROPIO candado:
     * solo linkea a su ficha con `publicado: true` y un `slug` real. Así
     * ninguna prenda sin publicar lleva a una página inexistente.
     */
    piezas?: CyberDropPieza[];
  };
  /**
   * Portada YA DESENFOCADA (archivo, no CSS) para un drop sin revelar: deja
   * ver color y masa, nada más. Es lo único de un drop bloqueado que puede
   * viajar al navegador, y solo porque el archivo en sí no se puede
   * "des-velar". El nombre y el claim siguen sin salir.
   */
  velada?: string;
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

/* ══════════════ PREVENTA — COLECCIÓN CAMO (el interruptor) ═══════════════ */

/**
 * 40 unidades entrantes (10 por talle, S–XL), entrega estimada viernes 13/11.
 *
 * Lo verificado en Woo el 3/11: `zip-hoodie-camo` (id 916, creado el 26/04,
 * $112.500, variaciones 917–920 S–XL todas con stock 0, sin SKU, backorders
 * en "no") es un RESTOCK: conserva su identidad y su ficha original. Los
 * colorways Olive y Brown nuevos y los Jorts se cargan como productos nuevos
 * (previsto para el 4/11) — hasta entonces NO existen en Woo.
 *
 * ── Cómo se enciende (cuando la colección esté publicada en Woo) ──────────
 * 1. `href`: ya apunta a /colecciones/camo-drop (las 4 prendas).
 * 2. `publicado: true`.
 * Con eso solo, el CTA de la sección camo pasa de "PRÓXIMAMENTE" (sin link) a
 * "VER COLECCIÓN". Nada más que tocar. No encender sin el stock de preventa
 * cargado y el OK de Valentín.
 */
export const PREVENTA_ZIP_CAMO = {
  // Encendido el 04/11 ~18 h: colección publicada en Woo con stock de preventa.
  publicado: true,
  nombre: 'Colección Camo',
  colorways: 'Olive · Brown',
  eta: 'Entrega estimada: viernes 13/11',
  // Colección con las 4 prendas (app/colecciones/camo-drop), no la ficha del 916.
  href: '/colecciones/camo-drop',
  img: '/cyber/drops/drop-02-camo.webp',
} as const;

/**
 * Los drops, uno por día. CONTENIDO SIN ASIGNAR a propósito: depende de
 * mercadería recibida y controlada (remeras/longsleeves nuevas el 3/11,
 * bermudas y camperas camo el 4/11 — tentativos del replanteo del 27/10).
 * Para publicar uno: asignar `producto` con el OK de Valentín.
 */
export const CYBER_DROPS: CyberDrop[] = [
  {
    id: '01',
    dia: 'Día 1',
    fecha: 'lun 2/11',
    // Las cuatro raglan ya están publicadas: se compran desde que abre el
    // evento, no desde el lunes. Por eso el revealAt es la apertura.
    revealAt: '2026-11-01T20:00:00-03:00',
    producto: {
      nombre: 'Raglan Longsleeves',
      claim: 'Creative Goods y Eagle, en Pink y Green.',
      img: '/cyber/drops/drop-01-definitivo.png',
      href: '/longsleeves',
      // Las cuatro publicadas en Woo (verificado contra /api/products 4/11).
      piezas: [
        { nombre: 'Creative Goods', color: 'Pink', img: '/cyber/drops/raglan/creative-goods-pink.webp', slug: 'hype-creative-goods-pink-raglan-longsleeve', publicado: true },
        { nombre: 'Creative Goods', color: 'Green', img: '/cyber/drops/raglan/creative-goods-green.webp', slug: 'hype-creative-goods-green-raglan-longsleeve', publicado: true },
        { nombre: 'Eagle', color: 'Pink', img: '/cyber/drops/raglan/eagle-pink.webp', slug: 'dept-of-culture-eagle-pink-raglan-longsleeve', publicado: true },
        { nombre: 'Eagle', color: 'Green', img: '/cyber/drops/raglan/eagle-green.webp', slug: 'dept-of-culture-eagle-green-raglan-longsleeve', publicado: true },
      ],
    },
  },
  {
    id: '02',
    dia: 'Día 2',
    fecha: 'mar 3/11',
    revealAt: `2026-11-03T${HORA_REVELACION}-03:00`,
    // Revelado el 3/11 por pedido de Valentín: la colección camo completa, con
    // la composición original de los cuatro productos (Zip Hoodie y Jort, en
    // Olive y Brown). La COMPRA no se abre acá: el link deriva del interruptor
    // PREVENTA_ZIP_CAMO — apagado, el CTA dice "Próximamente" sin llevar a
    // ningún lado; encendido, pasa a "Ver colección".
    producto: {
      nombre: PREVENTA_ZIP_CAMO.nombre,
      claim: 'Zip Hoodie y Jort Camo, en Olive y Brown.',
      img: PREVENTA_ZIP_CAMO.img,
      href: PREVENTA_ZIP_CAMO.publicado ? PREVENTA_ZIP_CAMO.href : null,
      preventa: 'Preventa · entrega estimada viernes 13/11',
      // Slugs reales en Woo (4/11): Brown = #916 (restock, conserva ficha y
      // URL); Olive y los dos Jorts = borradores #4271 / #4277 / #4283.
      // Publicadas en Woo el 04/11 ~18 h (OK de Valentín): con link.
      piezas: [
        { nombre: 'Zip Hoodie', color: 'Olive', img: '/cyber/drops/camo/zip-hoodie-olive.webp', slug: 'zip-hoodie-camo-olive', publicado: true },
        { nombre: 'Zip Hoodie', color: 'Brown', img: '/cyber/drops/camo/zip-hoodie-brown.webp', slug: 'zip-hoodie-camo', publicado: true },
        { nombre: 'Jort', color: 'Olive', img: '/cyber/drops/camo/jort-olive.webp', slug: 'jort-camo-olive', publicado: true },
        { nombre: 'Jort', color: 'Brown', img: '/cyber/drops/camo/jort-brown.webp', slug: 'jort-camo-brown', publicado: true },
      ],
    },
  },
  /* Día 3 ELIMINADO el 3/11 (decisión de Valentín): no hay un tercer drop
     confirmado, y una tarjeta "por revelar" que nunca se revela es una promesa
     rota en la cara del cliente. El evento comunica los lanzamientos que
     existen, no los que podrían existir. */
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
  producto?: {
    nombre: string;
    claim: string;
    img: string;
    href: string | null;
    preventa?: string;
    piezas?: CyberDropPiezaPublica[];
  };
  /** Solo en 'bloqueado', y solo si hay portada velada. Nunca el nombre. */
  velada?: string;
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
    if (revelado) {
      const { piezas, ...resto } = d.producto!;
      return {
        ...base,
        estado: 'revelado' as const,
        producto: { ...resto, ...(piezas ? { piezas: piezas.map(piezaPublica) } : {}) },
      };
    }
    return { ...base, estado: 'bloqueado' as const, ...(d.velada ? { velada: d.velada } : {}) };
  });
}

/* ═══════════════════════════ MYSTERY ARCHIVE ════════════════════════════ */

/**
 * ¿Las Mystery Boxes están aprobadas para publicarse? En false la sección se
 * renderiza SOLO fuera de producción (lo decide el ensamblador), así que en
 * producción no hay sección, ni tarjetas, ni links. Pasa a true cuando los
 * tres productos estén publicados en Woo (hoy son los borradores 4187 / 4192 /
 * 4197).
 *
 * Lo que NO depende de este flag: el precio y el link de cada tarjeta. Los
 * precios quedaron cerrados el 30/10 ($32.900 · $46.900 · $63.900) y las
 * fichas se navegan en local, donde `mysteryPreview()` las sirve con el mock
 * —los productos siguen en borrador en Woo y no se tocan—. El candado de
 * producción es el montaje de la sección, no el href.
 */
export const MYSTERY_PUBLICADO = true;

/**
 * Link y precio de cada tarjeta, tomados de `MYSTERY_CAJAS` (lib/mystery.ts),
 * que es la única fuente de verdad de los tres precios y los tres slugs. Si
 * alguna caja desaparece de ahí, esto rompe el build en vez de publicar una
 * tarjeta sin precio o apuntando a una ficha que no existe.
 */
function fichaMystery(id: CyberMysteryCategoria['id']): { href: string; precio: number } {
  const caja = MYSTERY_CAJAS.find((c) => c.id === id);
  if (!caja) throw new Error(`cyber-cartelera: falta la caja "${id}" en lib/mystery.ts`);
  return { href: `/producto/${caja.slug}`, precio: caja.precio };
}

export interface CyberMysteryCategoria {
  id: 'tees' | 'longsleeves' | 'hoodies';
  nombre: string;
  /** Qué incluye, por mecánica. Nunca una cifra. */
  detalle: string;
  /** Cuántas prendas del archivo componen el pool visible de la portada. */
  pool: string;
  /** Portada real (collage de mockups de Woo, _claude/propuestas/MYSTERY-PORTADAS). */
  img: string;
  /** Ficha de la caja. En local la sirve el mock; en Woo son borradores. */
  href: string;
  /** Precio cerrado de la caja. Sale de `MYSTERY_CAJAS`, no se escribe acá. */
  precio: number;
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
    pool: '13 modelos en el pool',
    img: '/mystery/portadas/tees-a.webp',
    ...fichaMystery('tees'),
  },
  {
    id: 'longsleeves',
    nombre: 'Mystery Longsleeves',
    detalle: 'Waffles, Athletic Dept y raglans del archivo. Elegís tu talle; el modelo es sorpresa.',
    // Los Half-Zip Polo se fueron a HOODIES y entraron los waffles, con UNA
    // sola ficha por pila compartida: las dos washed black comen la misma
    // pila de 6 u, así que entra solo la Dept of Culture. Entre waffles
    // aportan 11 unidades reales, no 22 — ojo al armar las cajas.
    pool: '10 modelos en el pool',
    img: '/mystery/portadas/longsleeves-a.webp',
    ...fichaMystery('longsleeves'),
  },
  {
    id: 'hoodies',
    nombre: 'Mystery Hoodies',
    // Los Half-Zip Polo cuentan como hoodies y son los protagonistas del pool
    // ("los que más vamos a estar enviando", 29/10), así que encabezan el copy.
    detalle: 'Half-Zip Polos y hoodies del archivo. Elegís tu talle; el modelo es sorpresa.',
    // 56 de las 128 unidades del pool son Half-Zip Polo: la familia de stock
    // más parejo y la de costo más bajo, o sea la que sostiene el margen.
    pool: '12 modelos en el pool',
    img: '/mystery/portadas/hoodies-a.webp',
    ...fichaMystery('hoodies'),
  },
];

/**
 * Los productos del pool de Mystery que **también** están hoy en la vidriera
 * del evento (destacados o filtros curados).
 *
 * Es un choque real, no una curiosidad: la misma remera que puede salir en una
 * caja sorpresa está a la venta suelta a $38.000–40.500 dos secciones más
 * abajo. Si las dos cosas conviven, la caja compite contra su propio
 * contenido y el cliente que mira con atención se siente tomado por tonto.
 *
 * **Hoy no se saca ninguno**, porque Mystery no está aprobado y perderíamos
 * dos destacados buenos por una caja que todavía no existe. Lo que hay es un
 * candado: el test de la campaña falla si `MYSTERY_PUBLICADO` pasa a true
 * mientras alguno de estos siga en los destacados. Así la decisión se toma en
 * el momento en que importa, no antes y no por olvido.
 */
export const CYBER_MYSTERY_EN_VIDRIERA: string[] = [
  'honda-white-tee',
  'ladytribal-black-longsleeve',
  'athletic-dept-pink-longsleeve',
  'athletic-dept-blue-longsleeve',
  'half-zip-polo-black',
  'hs-crest-olive-raglan-longsleeve',
  'hype-creative-goods-pink-raglan-longsleeve',
  'dept-of-culture-eagle-pink-raglan-longsleeve',
  'napoli-tee-azul',
  'napoli-tee-blanca',
  'lamb-of-god-pink-tee',
  'style-culture-university-white-tee',
  'style-culture-university-black-tee',
  'style-culture-university-navy-tee',
  'hoodie-pink',
  'hs-co-green-hoodie',
  'hs-co-grey-hoodie',
  'hoodie-grey-hstars',
  'lion-of-judah-stone-wash-hoodie',
  'no-service-for-the-faithless-hoodie',
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
  'regular-tee-red',
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
  // ── 6/11, pedido de Valentín: abre el half zip melange (stock alto en todos
  //    los talles, no aparecía en la sección) y el camo Faith Over Everything
  //    baja a la 3ª fila mobile — la oferta lo está dejando sin stock (XL
  //    agotado, L/M bajos). Los otros dos half zip van más abajo, separados.
  'half-zip-polo-melange',                // 6/11: abre la sección, mucho stock
  'regular-tees-3-pack-black-navy-white', // 18 u/30d — lo MÁS vendido del sitio
  'no-service-for-the-faithless-white',   // 5/11: portada nueva + 30% OFF ($61.200 → $42.900), pedido de Valentín
  'grey-camo-cap',                        // 11 u/30d
  'faith-over-everything-camo-hoodie',    //  9 u/30d — baja a la 3ª fila (6/11) para cuidar el stock que queda
  'sweatpant-black-hstars',               //  5 u/30d
  'athletic-dept-blue-longsleeve',        //  5 u/30d — entra a destacados
  'pack-x3-medias-hype',                  // 10 u/30d
  'sweatpant-grey-hstars',                //  4 u/30d
  'find-jesus-longsleeve-black',
  // ── Después, la curaduría aprobada del 29/10 (con los half zip intercalados) ──
  'sleeveless-ranglan-black',
  'half-zip-polo-navy',                   // 6/11: mucho stock
  'napoli-tee-azul',
  'zolotye-kupola-washed-graphite-hoodie',
  'camo-cap',
  'lettering-black-longsleeve',
  'splatter-hoodie-washed-grey',
  'napoli-tee-blanca',
  'half-zip-polo-black',                  // 6/11: mucho stock
  'athletic-dept-white-grey-print-tee',   // 7/11: 7 u/30d, 39% OFF. Sube al #20: Valentín sacó el green raglan
  'sweatpant-pink',
  'longsleeve-waffle-horses',
  'hype-distressed-grey-hoodie',
  'department-of-culture-washed-black-waffle-longsleeve', // 7/11: 8 u/30d, 25% OFF (reemplaza honda white, 0 u/30d)
  'ladytribal-black-longsleeve',
  'athletic-dept-pink-longsleeve',
  'athletic-dept-navy-tee',               // 7/11: 4 u/30d, 39% OFF, pila navy (distinta de la blanca)
  'hype-washed-black-waffle-longsleeve',
  'regular-tees-3-pack-white',
  // Segunda tanda: las individuales quedan detrás de los 24 aprobados.
  'regular-tee-black',
  'regular-tee-white',
  'regular-tee-navy',
  'regular-tee-melange',
  'regular-tee-red',
  'dept-of-culture-eagle-pink-raglan-longsleeve', // 7/11: 8 u/30d, 34% OFF (reemplaza sleeveless grey, 0 u/30d)
  'athletic-dept-washed-grey-polo',       // 7/11: 9 u/30d, sin descuento (reemplaza sleeveless militar, 0 u/30d)
  // jort-cargo-realtree-pink salió el 3/11: quedaba 1 unidad (M) y la lista
  // tiene cupo fijo de 36; entró athletic-dept-blue-longsleeve por ventas.
  // jort-cargo-realtree-beige salió el 5/11 por el mismo cupo: entró
  // no-service-for-the-faithless-white en el 3er lugar.
  // 6/11: salen regular-tees-3-pack-black, regular-tees-3-pack-navy y
  // lettering-pink-jort por el mismo cupo (entran los 3 half zip). Siguen en
  // el catálogo, después de los 36 y en sus filtros.
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
}[] = [
  { id: 'tees', label: 'Remeras', href: '/tees', slugFoto: 'honda-white-tee' },
  { id: 'hoodies', label: 'Hoodies', href: '/hoodies', slugFoto: 'faith-over-everything-camo-hoodie' },
  { id: 'longsleeves', label: 'Longsleeves', href: '/longsleeves', slugFoto: 'find-jesus-longsleeve-black' },
  { id: 'pants', label: 'Bottoms', href: '/abajo', slugFoto: 'sweatpant-grey-hstars' },
  { id: 'packs', label: 'Packs', href: '/colecciones/regular-tees', slugFoto: 'regular-tees-3-pack-black-navy-white' },
  // Mystery Archive y los 3 drops NO van acá: tienen su propia sección más
  // abajo y repetirlos era decir dos veces lo mismo (decisión del 29/10).
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
    label: 'Bottoms',
    cats: ['Pantalón', 'Jort', 'Short', 'Shorts', 'Bermuda'],
    slugs: ['sweatpant-grey-hstars', 'sweatpant-pink', 'lettering-pink-jort', 'jort-cargo-realtree-beige', 'sweatpant-black-hstars'],
  },
  {
    id: 'accesorios',
    label: 'Accesorios',
    cats: ['Accesorio'],
    slugs: ['grey-camo-cap', 'camo-cap'],
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
