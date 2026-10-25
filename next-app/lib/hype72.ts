/**
 * HYPE 72 — el evento propio de Hype del 2 al 4 de noviembre de 2026.
 * 72 horas, 6 drops: uno nuevo cada mañana y cada noche.
 *
 * NO es CyberMonday ni CACE: en toda la página y en estos textos no van ni
 * "Cyber Monday" ni logos de CACE. Es un evento de la marca.
 *
 * ESTE ARCHIVO ES LA FUENTE DE VERDAD DE LA LANDING /hype72.
 * Para cambiar la cartelera (qué drop, cuándo se revela, cuándo abre, a dónde
 * linkea) se edita solo acá: la página no tiene ningún dato escrito a mano.
 *
 * ── PENDIENTE DE VALIDACIÓN FINAL ───────────────────────────────────────────
 * Los precios y los beneficios de HYPE72_DROPS y HYPE72_GIFTS vienen del plan
 * del evento y TODAVÍA NO están confirmados contra Woo ni contra el stock real
 * (ver _claude/, proyecto "CYBER 2–4/11"). Antes de linkear esta página desde
 * el menú, la home o un anuncio hay que verificar monto por monto: lo que se
 * publica es una condición comercial.
 * El drop 01 a propósito NO muestra precio ("al precio del 3 PACK"): el 4 PACK
 * se cobra como el 3 PACK y el número exacto lo define la ficha.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Horario: todo se escribe con el offset -03:00 (America/Argentina/Buenos_Aires).
 * Argentina no tiene horario de verano, así que -03:00 es siempre el offset
 * correcto y el instante queda anclado sin depender de la TZ del server
 * (Vercel corre en UTC). El ESTADO de cada drop lo calcula el servidor con
 * estas fechas; la cuenta regresiva del browser solo dibuja el tiempo que falta.
 */

/** Hora a la que se publica la revelación de cada día. Editable. */
const REVEAL_HOUR = '11:00:00';

/** Arranque del evento: el primer drop abre acá. */
export const HYPE72_START = '2026-11-02T00:00:00-03:00';

/**
 * Cierre del evento. Instante exclusivo: a las 00:00 del 5/11 ya terminó, que
 * es lo mismo que "hasta el 4/11 23:59" y deja los bordes limpios.
 */
export const HYPE72_END = '2026-11-05T00:00:00-03:00';

/** Cómo se le cuenta el cierre a la gente. */
export const HYPE72_END_LABEL = 'mié 4/11 · 23:59';

/** Las fechas del evento, para el hero. */
export const HYPE72_DATES = '2 · 3 · 4 noviembre';

export type Hype72State =
  /** Todavía no se reveló: en la cartelera va como "???". */
  | 'oculto'
  /** Ya se sabe qué es, todavía no abrió. */
  | 'revelado'
  /** Abierto y comprable. Los drops son ACUMULATIVOS: no se cierra hasta el final. */
  | 'abierto'
  /** Terminaron las 72 horas. */
  | 'cerrado';

export interface Hype72Drop {
  /** "01" … "06". Es el número grande de la cartelera. */
  id: string;
  /** Cuándo se revela el contenido (ISO con offset ART). */
  revealAt: string;
  /** Cuándo abre para comprar (ISO con offset ART). */
  opensAt: string;
  /** El horario como se lee en la cartelera. */
  slot: string;
  /** Cómo se revela el día en que se revela, no la fecha de apertura. */
  revealLabel: string;
  title: string;
  /** La bajada: qué se lleva. */
  claim: string;
  /** Nota de precio cuando no se publica un número. Opcional. */
  priceNote?: string;
  href: string;
}

/**
 * La cartelera. El orden del array es el orden en pantalla.
 * Calendario de revelación acordado: un drop por día desde el 27/10 al 1/11.
 */
export const HYPE72_DROPS: Hype72Drop[] = [
  {
    id: '01',
    revealAt: `2026-10-27T${REVEAL_HOUR}-03:00`,
    revealLabel: 'lun 27/10',
    opensAt: '2026-11-02T00:00:00-03:00',
    slot: 'lun 2/11 · 00:00',
    title: '4 PACK Regular Tees',
    claim: 'Pagás 3, llevás 4',
    priceNote: 'Al precio del 3 PACK',
    href: '/producto/regular-tees-3-pack-black-navy-white',
  },
  {
    id: '02',
    revealAt: `2026-10-28T${REVEAL_HOUR}-03:00`,
    revealLabel: 'mar 28/10',
    opensAt: '2026-11-02T21:00:00-03:00',
    slot: 'lun 2/11 · 21:00',
    title: 'Hoodies SS27',
    claim: 'Con medias de regalo por 24 horas',
    href: '/hoodies',
  },
  {
    id: '03',
    revealAt: `2026-10-29T${REVEAL_HOUR}-03:00`,
    revealLabel: 'mié 29/10',
    opensAt: '2026-11-03T11:00:00-03:00',
    slot: 'mar 3/11 · 11:00',
    title: 'Archivo Hype',
    claim: '3 por $99.000 + Hype Box',
    href: '/productos',
  },
  {
    id: '04',
    revealAt: `2026-10-30T${REVEAL_HOUR}-03:00`,
    revealLabel: 'jue 30/10',
    opensAt: '2026-11-03T21:00:00-03:00',
    slot: 'mar 3/11 · 21:00',
    title: 'Boxy dúo',
    claim: '2 por $110.000',
    href: '/tees',
  },
  {
    id: '05',
    revealAt: `2026-10-31T${REVEAL_HOUR}-03:00`,
    revealLabel: 'vie 31/10',
    opensAt: '2026-11-04T11:00:00-03:00',
    slot: 'mié 4/11 · 11:00',
    title: 'Set completo',
    claim: 'Half-Zip + SweatPant',
    href: '/sets',
  },
  {
    id: '06',
    revealAt: `2026-11-01T${REVEAL_HOUR}-03:00`,
    revealLabel: 'sáb 1/11',
    opensAt: '2026-11-04T21:00:00-03:00',
    slot: 'mié 4/11 · 21:00',
    title: 'Última llamada',
    claim: 'Lo último de las 72 horas',
    href: '/new-in',
  },
];

export interface Hype72Gift {
  /** El umbral como se muestra. */
  amount: string;
  gift: string;
  /** Para ordenar y para el texto "desde". */
  value: number;
}

/**
 * Escalera de regalos. PENDIENTE DE VALIDACIÓN FINAL (ver el bloque de arriba):
 * confirmar monto, vigencia y stock de cada regalo antes de publicar la página.
 */
export const HYPE72_GIFTS: Hype72Gift[] = [
  { value: 100_000, amount: '$100.000', gift: 'Cadena Hype' },
  { value: 140_000, amount: '$140.000', gift: 'Medias Hype' },
  { value: 200_000, amount: '$200.000', gift: 'Zippo Hype' },
];

/** El piso de la escalera, para el titular de la sección. */
export const HYPE72_GIFT_FROM = HYPE72_GIFTS[0].amount;

const ms = (iso: string) => new Date(iso).getTime();

/**
 * Estado de un drop para un instante dado.
 *
 * Bordes (todos inclusivos del lado del cambio):
 * - un ms antes de `revealAt` → 'oculto'; exactamente en `revealAt` → 'revelado'
 * - un ms antes de `opensAt`  → 'revelado'; exactamente en `opensAt`  → 'abierto'
 * - exactamente en HYPE72_END → 'cerrado'
 *
 * ACUMULATIVO: lo que abre queda 'abierto' hasta el cierre del evento, aunque
 * después abran otros drops. No hay ventana de 12 horas por drop.
 */
export function dropState(drop: Hype72Drop, now: Date): Hype72State {
  const t = now.getTime();
  if (t >= ms(HYPE72_END)) return 'cerrado';
  if (t >= ms(drop.opensAt)) return 'abierto';
  if (t >= ms(drop.revealAt)) return 'revelado';
  return 'oculto';
}

export interface Hype72BoardItem {
  drop: Hype72Drop;
  state: Hype72State;
}

/** La cartelera completa con el estado de cada drop. */
export function hype72Board(now: Date): Hype72BoardItem[] {
  return HYPE72_DROPS.map((drop) => ({ drop, state: dropState(drop, now) }));
}

/** ¿Ya terminaron las 72 horas? */
export function isHype72Over(now: Date): boolean {
  return now.getTime() >= ms(HYPE72_END);
}

/** ¿Ya arrancó el evento (abrió el primer drop)? */
export function isHype72Live(now: Date): boolean {
  const t = now.getTime();
  return t >= ms(HYPE72_START) && t < ms(HYPE72_END);
}

export type Hype72MilestoneKind = 'reveal' | 'open' | 'end';

export interface Hype72Milestone {
  kind: Hype72MilestoneKind;
  /** ISO del instante al que apunta la cuenta regresiva. */
  at: string;
  /** Texto arriba de los dígitos. */
  label: string;
  dropId?: string;
}

/**
 * El próximo hito del evento después de `now`: la próxima revelación, la
 * próxima apertura o el cierre. Estrictamente posterior a `now` — en el
 * instante exacto de una revelación esa revelación ya pasó y lo que falta es
 * la siguiente. Devuelve null cuando el evento ya terminó.
 */
export function nextMilestone(now: Date): Hype72Milestone | null {
  const t = now.getTime();
  const all: Hype72Milestone[] = [
    ...HYPE72_DROPS.map((d): Hype72Milestone => ({
      kind: 'reveal',
      at: d.revealAt,
      dropId: d.id,
      label: `Se revela el drop ${d.id}`,
    })),
    ...HYPE72_DROPS.map((d): Hype72Milestone => ({
      kind: 'open',
      at: d.opensAt,
      dropId: d.id,
      label: `Abre el drop ${d.id}`,
    })),
    { kind: 'end' as const, at: HYPE72_END, label: 'Cierran las 72 horas' },
  ].sort((a, b) => ms(a.at) - ms(b.at));

  return all.find((m) => ms(m.at) > t) ?? null;
}
