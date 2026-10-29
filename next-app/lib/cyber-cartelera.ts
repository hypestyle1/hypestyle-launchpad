/**
 * CYBER HYPE — la cartelera de lanzamientos del EVENTO (2–4/11).
 *
 * Qué es: la fuente de verdad de lo que la página /cyberhype muestra DURANTE
 * el evento. La previa (registro) no la toca: vive en lib/cyber-hype.ts y no
 * adelanta nada de lo que hay acá.
 *
 * De dónde viene: la máquina de estados (oculto → revelado → abierto →
 * cerrado) se recuperó del PR #623 (lib/hype72.ts), que era la parte sana de
 * esa rama. Lo que NO se recuperó, a propósito:
 *   - la grilla fija de 6 drops con horarios: quedó sin efecto el 27/10 — las
 *     ofertas están disponibles desde la apertura y lo diario es novedad
 *     adicional, tentativa;
 *   - el branding HYPE 72, el gate de 404 por cookie y los cambios de
 *     newsletter/welcome-sweep (reemplazados por el PR #624 y el #627).
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  PRECIOS: ACÁ VAN, Y HOY NO SE PUBLICAN                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  `CYBER_PRECIOS_APROBADOS = false` es el interruptor: mientras esté en   ║
 * ║  false, la cartelera NO muestra NI UN MONTO — solo mecánica ("Pagás 3,   ║
 * ║  llevás 4") y notas sin cifra ("Al precio del 3 PACK"). Los montos       ║
 * ║  esperan en `precioPendiente` sin renderizarse.                          ║
 * ║                                                                          ║
 * ║  Los precios reales los muestra el CATÁLOGO (ProductCard lee Woo en      ║
 * ║  vivo): Woo es la fuente de verdad y nunca se escriben a mano acá.       ║
 * ║  89 de 145 productos tienen sale_price permanente → comunicar            ║
 * ║  PORCENTAJES está prohibido en cualquier estado del interruptor.         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  CONFIRMADO vs TENTATIVO                                                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cada lanzamiento lleva `confirmado`. Solo los confirmados se publican:  ║
 * ║  un tentativo no aparece NI COMO "???" — anunciar un misterio también    ║
 * ║  es una promesa. Los drops diarios del 3 y el 4/11 y el Mystery Archive  ║
 * ║  están acá en false esperando mercadería/aprobación: para publicarlos    ║
 * ║  se confirma el contenido con Valentín y se pasa `confirmado: true`.     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Horario: ISO con offset -03:00 (ART, sin horario de verano). El estado lo
 * calcula el SERVIDOR en cada request (la página es force-dynamic); el browser
 * solo dibuja cuentas regresivas. Un reloj adelantado del visitante no revela
 * nada.
 */

import { CYBER_START, CYBER_END } from './cyber-hype';

/** Ver el bloque del encabezado. En false no se renderiza ningún monto. */
export const CYBER_PRECIOS_APROBADOS = false;

export type CyberLanzamientoEstado =
  /** Todavía no se reveló: no se muestra (ni como misterio, salvo demo). */
  | 'oculto'
  /** Ya se sabe qué es, todavía no abrió: va con su horario de apertura. */
  | 'revelado'
  /** Abierto y comprable. ACUMULATIVO: queda abierto hasta el cierre. */
  | 'abierto'
  /** Terminó el evento. */
  | 'cerrado';

export interface CyberLanzamiento {
  /** "01", "02"… El número grande de la cartelera. */
  id: string;
  /**
   * Solo los confirmados se publican. Tentativo = invisible, ni "???".
   * Confirmar es una decisión comercial de Valentín, no un deploy accidental.
   */
  confirmado: boolean;
  /** Cuándo deja de estar oculto (ISO -03:00). */
  revealAt: string;
  /** Cuándo abre para comprar (ISO -03:00). */
  opensAt: string;
  /** El horario de apertura como se lee en la cartelera. */
  slot: string;
  title: string;
  /** Qué se lleva, contado por MECÁNICA. Nunca una cifra. */
  claim: string;
  /** Nota de precio SIN cifra, aprobada. Se publica siempre. */
  priceNote?: string;
  /** EL MONTO. Solo se renderiza con CYBER_PRECIOS_APROBADOS en true. */
  precioPendiente?: string;
  href: string;
}

/**
 * La cartelera. El orden del array es el orden en pantalla.
 *
 * Al 29/10 hay UN solo lanzamiento confirmado: la apertura con el 4 PACK (la
 * ventana vive en el backend — lib/promo-pack-regular.ts — y abre sola por
 * fecha; esto solo lo comunica). Los demás son tentativos y no se publican.
 */
export const CYBER_LANZAMIENTOS: CyberLanzamiento[] = [
  {
    id: '01',
    confirmado: true,
    // Se revela recién al abrir: la previa no adelanta nada comercial.
    revealAt: CYBER_START,
    opensAt: CYBER_START,
    slot: 'dom 1/11 · 20:00',
    title: '4 PACK Regular Tees',
    claim: 'Pagás 3, llevás 4',
    priceNote: 'Al precio del 3 PACK',
    // Único monto aprobado (congelado en lib/promo-pack-regular.ts), y aun
    // así no se publica acá: el lanzamiento se cuenta por mecánica y el
    // precio exacto lo muestra el carrito.
    href: '/colecciones/regular-tees',
  },
  {
    // Drop del lunes 3/11 — TENTATIVO (depende de mercadería recibida,
    // controlada y despachable: remeras/longsleeves en Próximamente).
    id: '02',
    confirmado: false,
    revealAt: '2026-11-03T11:00:00-03:00',
    opensAt: '2026-11-03T11:00:00-03:00',
    slot: 'mar 3/11 · 11:00',
    title: 'Por anunciar',
    claim: 'Se define con la mercadería en mano',
    href: '/new-in',
  },
  {
    // Drop del miércoles 4/11 — TENTATIVO (bermudas y camperas camo + últimas
    // horas, mismas condiciones).
    id: '03',
    confirmado: false,
    revealAt: '2026-11-04T11:00:00-03:00',
    opensAt: '2026-11-04T11:00:00-03:00',
    slot: 'mié 4/11 · 11:00',
    title: 'Por anunciar',
    claim: 'Se define con la mercadería en mano',
    href: '/new-in',
  },
  // MYSTERY ARCHIVE: no se agrega ni en tentativo hasta que Valentín apruebe
  // pool, precio y portadas (ver _claude/propuestas/cyber-mystery-tees.md).
  // Cuando exista como producto de Woo, entra como un lanzamiento más.
];

const ms = (iso: string) => new Date(iso).getTime();

/**
 * Estado de un lanzamiento en un instante dado. Bordes inclusivos del lado
 * del cambio: exactamente en `revealAt` ya está revelado, exactamente en
 * `opensAt` ya está abierto, exactamente en CYBER_END ya está cerrado.
 */
export function lanzamientoEstado(
  l: CyberLanzamiento,
  now: Date = new Date(),
): CyberLanzamientoEstado {
  const t = now.getTime();
  if (t >= ms(CYBER_END)) return 'cerrado';
  if (t >= ms(l.opensAt)) return 'abierto';
  if (t >= ms(l.revealAt)) return 'revelado';
  return 'oculto';
}

export interface CyberCarteleraItem {
  lanzamiento: CyberLanzamiento;
  estado: CyberLanzamientoEstado;
}

/**
 * La cartelera publicable: SOLO los confirmados, con su estado.
 * `demo` (solo para la revisión en local, nunca producción) suma los
 * tentativos para ver el diseño de los estados bloqueados.
 */
export function cyberCartelera(
  now: Date = new Date(),
  { demo = false }: { demo?: boolean } = {},
): CyberCarteleraItem[] {
  return CYBER_LANZAMIENTOS.filter((l) => l.confirmado || demo).map((l) => ({
    lanzamiento: l,
    estado: lanzamientoEstado(l, now),
  }));
}

/**
 * La línea de precio que SE MUESTRA. Sin aprobación es la nota sin cifra (o
 * nada); con aprobación, el monto. Un solo lugar decide: la cartelera no mira
 * el interruptor.
 */
export function cyberPriceLine(l: CyberLanzamiento): string | null {
  if (CYBER_PRECIOS_APROBADOS) return l.precioPendiente ?? l.priceNote ?? null;
  return l.priceNote ?? null;
}

/**
 * Los productos que la página del evento muestra como "Disponible ahora".
 * Curaduría editable en un solo lugar; las cards leen precio y stock de Woo
 * en vivo (ProductCard), así que acá no hay ningún monto.
 *
 * Hoy: las 4 Regular individuales — son las piezas con las que se arma el
 * 4 PACK en el carrito (el motor cobra 4 individuales al precio del pack).
 */
export const CYBER_PRODUCTOS_EVENTO: string[] = [
  'regular-tee-black',
  'regular-tee-white',
  'regular-tee-melange',
  'regular-tee-navy',
];
