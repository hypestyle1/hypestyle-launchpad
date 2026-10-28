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
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  PRECIOS: ACÁ VAN, Y HOY NO SE PUBLICAN                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  `HYPE72_PRECIOS_APROBADOS = false` (abajo) es el interruptor: mientras  ║
 * ║  esté en false, la página NO muestra NI UN MONTO.                        ║
 * ║                                                                          ║
 * ║  Los montos pendientes viven en el campo `precioPendiente` de cada drop  ║
 * ║  y en `HYPE72_GIFTS`. Están escritos pero NO se renderizan: salieron de  ║
 * ║  la estrategia del 17/10 y están esperando la matriz de rentabilidad.    ║
 * ║  El único precio aprobado es el 4 PACK a $66.300, y ése a propósito      ║
 * ║  tampoco se publica todavía (el drop 01 se cuenta por mecánica:          ║
 * ║  "pagás 3, llevás 4").                                                   ║
 * ║                                                                          ║
 * ║  PARA PUBLICARLOS, cuando estén aprobados monto por monto:               ║
 * ║   1. verificar cada `precioPendiente` y cada `HYPE72_GIFTS[].amount`     ║
 * ║      contra Woo y contra el stock real;                                  ║
 * ║   2. poner `HYPE72_PRECIOS_APROBADOS = true`;                            ║
 * ║   3. el test "sin aprobación no sale ni un monto" va a fallar: cambiarlo ║
 * ║      por el de la variante aprobada (está escrito al lado).              ║
 * ║  No hace falta tocar ni la página ni la cartelera: leen de acá.          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Horario: todo se escribe con el offset -03:00 (America/Argentina/Buenos_Aires).
 * Argentina no tiene horario de verano, así que -03:00 es siempre el offset
 * correcto y el instante queda anclado sin depender de la TZ del server
 * (Vercel corre en UTC). El ESTADO de cada drop lo calcula el servidor con
 * estas fechas; la cuenta regresiva del browser solo dibuja el tiempo que falta.
 */

/**
 * ¿Los montos del evento están aprobados y se pueden publicar?
 *
 * En false (hoy): la cartelera muestra nombre y mecánica de cada drop sin
 * ninguna cifra, y la escalera de regalos no se muestra. La landing puede estar
 * online sin comprometer un precio. Ver el bloque de arriba.
 */
export const HYPE72_PRECIOS_APROBADOS = false;

/** Hora a la que se publica la revelación de cada día. Editable. */
const REVEAL_HOUR = '11:00:00';

/**
 * MIRAR, NO COMPRAR: la hora en que la landing deja de devolver 404 y los
 * miembros de Private Access y Mejores Amigos pueden ver la cartelera.
 *
 * **Acá NO se habilita ningún precio ni ninguna promoción.** A las 23:00 del
 * 1/11 se les puede avisar y mostrar qué viene; el evento, los drops y los
 * precios arrancan una hora después, con HYPE72_START. Antes esta constante era
 * el `opensAt` del drop 01 y se llamaba HYPE72_EARLY_ACCESS: decisión de
 * Valentín del 25/10 — "todo lo comercial comienza el 2/11 a las 00:00 ART:
 * home, landing pública, 4 PACK y promociones. El 1/11 a las 23:00 podemos
 * avisar a Mejores Amigos y Private Access y mostrarles la cartelera, pero sin
 * habilitar precios anticipados". El nombre cambió a propósito: "early access"
 * invitaba justamente a colgarle un precio.
 *
 * Lo único que depende de esta hora es el gate (ver HYPE72_PUBLIC_AT).
 */
export const HYPE72_PREVIEW_AT = '2026-11-01T23:00:00-03:00';

/**
 * Arranque del evento y de TODO lo comercial: los 6 drops, los precios y las
 * promociones. Ningún drop puede abrir antes de acá (hay un test que lo guarda).
 *
 * ── TIENE QUE COINCIDIR CON LAS OTRAS DOS RAMAS ──────────────────────────────
 * El mismo instante vive en tres lugares, uno por superficie:
 *   - landing  → HYPE72_START (este archivo)
 *   - 4 PACK   → PACK_REGULAR_X4_DESDE (lib/promo-pack-regular.ts, PR #614)
 *   - home     → HYPE72_HOME_DESDE     (lib/hype72-home.ts, PR #617)
 * Los tres verificados en 2026-11-02T00:00:00-03:00 el 25/10, y los tres
 * terminan en 2026-11-05T00:00:00-03:00 (= HYPE72_END).
 * Si se separan, la landing diría "en curso" mientras el carrito todavía cobra
 * el precio viejo. Al mover uno, mover los tres.
 * ──────────────────────────────────────────────────────────────────────────── */
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
  /**
   * La bajada: qué se lleva, contado por MECÁNICA. Nunca lleva una cifra ni una
   * vigencia sin confirmar — esto se publica siempre, desde la revelación.
   */
  claim: string;
  /**
   * Nota de precio SIN cifra, ya aprobada. Se publica siempre.
   * (drop 01: "al precio del 3 PACK" — el número exacto lo define la ficha.)
   */
  priceNote?: string;
  /**
   * EL MONTO. Pendiente de aprobación: solo se renderiza con
   * HYPE72_PRECIOS_APROBADOS en true. Ver el bloque del encabezado.
   */
  precioPendiente?: string;
  href: string;
}

/**
 * La cartelera. El orden del array es el orden en pantalla.
 * Calendario de revelación acordado: un drop por día desde el 27/10 al 1/11.
 *
 * Los `revealLabel` estaban todos corridos un día (decían "lun 27/10" cuando el
 * 27/10/2026 es martes, y así los seis). Verificados uno por uno contra el
 * calendario: 27/10 martes · 28 miércoles · 29 jueves · 30 viernes · 31 sábado ·
 * 1/11 domingo · 2/11 lunes · 3/11 martes · 4/11 miércoles.
 *
 * Ninguna `claim` lleva cifra: los montos están en `precioPendiente` y hoy no se
 * renderizan (ver el bloque del encabezado).
 */
export const HYPE72_DROPS: Hype72Drop[] = [
  {
    id: '01',
    revealAt: `2026-10-27T${REVEAL_HOUR}-03:00`,
    revealLabel: 'mar 27/10',
    // Arranca con el evento, no antes: nada comercial se habilita en la hora de
    // la previa a los miembros (ver HYPE72_PREVIEW_AT).
    opensAt: HYPE72_START,
    slot: 'lun 2/11 · 00:00',
    title: '4 PACK Regular Tees',
    claim: 'Pagás 3, llevás 4',
    priceNote: 'Al precio del 3 PACK',
    // $66.300 — el ÚNICO monto aprobado del evento, y aun así no se publica
    // todavía: el drop se cuenta por mecánica.
    precioPendiente: '$66.300 las 4',
    href: '/producto/regular-tees-3-pack-black-navy-white',
  },
  {
    id: '02',
    revealAt: `2026-10-28T${REVEAL_HOUR}-03:00`,
    revealLabel: 'mié 28/10',
    opensAt: '2026-11-02T21:00:00-03:00',
    slot: 'lun 2/11 · 21:00',
    title: 'Hoodies SS27',
    // La ventana de "24 horas" salió del plan y no está confirmada; el regalo
    // depende de un stock de medias que todavía se está contando. Se publica la
    // mecánica, sin vigencia.
    claim: 'Con medias de regalo',
    href: '/hoodies',
  },
  {
    id: '03',
    revealAt: `2026-10-29T${REVEAL_HOUR}-03:00`,
    revealLabel: 'jue 29/10',
    opensAt: '2026-11-03T11:00:00-03:00',
    slot: 'mar 3/11 · 11:00',
    title: 'Archivo Hype',
    claim: '3 piezas de archivo + Hype Box',
    precioPendiente: '3 por $99.000 + Hype Box',
    href: '/productos',
  },
  {
    id: '04',
    revealAt: `2026-10-30T${REVEAL_HOUR}-03:00`,
    revealLabel: 'vie 30/10',
    opensAt: '2026-11-03T21:00:00-03:00',
    slot: 'mar 3/11 · 21:00',
    title: 'Boxy dúo',
    claim: 'Dos boxy, un precio',
    precioPendiente: '2 por $110.000',
    href: '/tees',
  },
  {
    id: '05',
    revealAt: `2026-10-31T${REVEAL_HOUR}-03:00`,
    revealLabel: 'sáb 31/10',
    opensAt: '2026-11-04T11:00:00-03:00',
    slot: 'mié 4/11 · 11:00',
    title: 'Set completo',
    claim: 'Half-Zip + SweatPant',
    href: '/sets',
  },
  {
    id: '06',
    revealAt: `2026-11-01T${REVEAL_HOUR}-03:00`,
    revealLabel: 'dom 1/11',
    opensAt: '2026-11-04T21:00:00-03:00',
    slot: 'mié 4/11 · 21:00',
    title: 'Última llamada',
    claim: 'Lo último de las 72 horas',
    href: '/new-in',
  },
];

/**
 * La línea de precio que SE MUESTRA para un drop. Sin aprobación es la nota sin
 * cifra (o nada); con aprobación, el monto. Un solo lugar decide esto: la
 * cartelera no mira el interruptor.
 */
export function hype72PriceLine(drop: Hype72Drop): string | null {
  if (HYPE72_PRECIOS_APROBADOS) return drop.precioPendiente ?? drop.priceNote ?? null;
  return drop.priceNote ?? null;
}

export interface Hype72Gift {
  /** El umbral como se muestra. */
  amount: string;
  gift: string;
  /** Para ordenar y para el texto "desde". */
  value: number;
}

/**
 * Escalera de regalos. PENDIENTE DE APROBACIÓN, igual que los precios de los
 * drops: hay que confirmar monto, vigencia y stock de cada regalo. Al 25/10 el
 * stock no da para publicarla (9 cadenas contra 20 que habría que comprar, 5
 * zippos), así que el umbral más bajo todavía no es una promesa que se pueda
 * sostener.
 *
 * Con HYPE72_PRECIOS_APROBADOS en false esta lista NO se muestra: usar siempre
 * hype72GiftsVisibles(), nunca HYPE72_GIFTS directo desde la página.
 */
export const HYPE72_GIFTS: Hype72Gift[] = [
  { value: 100_000, amount: '$100.000', gift: 'Cadena Hype' },
  { value: 140_000, amount: '$140.000', gift: 'Medias Hype' },
  { value: 200_000, amount: '$200.000', gift: 'Zippo Hype' },
];

/** La escalera que se puede publicar hoy: vacía hasta que haya aprobación. */
export function hype72GiftsVisibles(): Hype72Gift[] {
  return HYPE72_PRECIOS_APROBADOS ? HYPE72_GIFTS : [];
}

/**
 * El piso de la escalera para el titular, o null si todavía no se publica.
 * Mientras sea null el copy habla del regalo sin decir desde cuánto.
 */
export function hype72GiftFrom(): string | null {
  return HYPE72_PRECIOS_APROBADOS ? HYPE72_GIFTS[0].amount : null;
}

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

/**
 * ¿Estamos dentro del evento? Es también la respuesta a "¿hay algo comercial
 * habilitado?": en la hora de la previa a los miembros (HYPE72_PREVIEW_AT →
 * HYPE72_START) esto da false y los 6 drops están en 'revelado', así que la
 * página no dice "en curso" ni "abierto" en ninguna parte. Se mira la
 * cartelera y nada más.
 */
export function isHype72Live(now: Date): boolean {
  const t = now.getTime();
  return t >= ms(HYPE72_START) && t < ms(HYPE72_END);
}

/* ── Acceso a la landing antes del evento ─────────────────────────────────────
 *
 * `noindex` no es un mecanismo de acceso: cualquiera con la URL ve la página.
 * Hasta HYPE72_PUBLIC_AT la página devuelve un 404 real salvo que el visitante
 * traiga la cookie del gate que ya existe en el proyecto (`hype_early_access`,
 * la que entrega /api/acceso contra EARLY_ACCESS_PASSWORD). Desde ese instante
 * se abre sola, sin deploy y sin que nadie tenga que apretar nada.
 *
 * Se abre en HYPE72_PREVIEW_AT, una hora ANTES del evento: es lo único que pasa
 * a esa hora. La página se puede mirar; no hay ningún precio ni ninguna
 * promoción habilitada hasta HYPE72_START.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Cuándo la landing queda abierta al público, sola: **27/10 11:00 ART**, el
 * instante en que se revela el drop 01.
 *
 * Lo decidió la previa, no el gusto: el mail 1 de Brevo sale el **viernes 30/10
 * y linkea acá**, igual que las seis revelaciones diarias. Con la página cerrada
 * hasta el 1/11 ese mail mandaba tráfico a un 404 — y la regla es que ningún
 * link de campaña puede apuntar a una página que no existe.
 *
 * Abrirla no compromete nada **porque no hay un solo monto en la página**:
 * `HYPE72_PRECIOS_APROBADOS` está en false, así que lo único visible es el
 * nombre y la mecánica de los drops ya revelados. Los precios aparecen recién
 * cuando Valentín los apruebe uno por uno.
 *
 * Para volver atrás, esto vuelve a `HYPE72_PREVIEW_AT` y la página queda con
 * llave hasta la hora de la previa — pero entonces hay que cambiarle el destino
 * al mail 1 y a las revelaciones.
 * ──────────────────────────────────────────────────────────────────────────── */
export const HYPE72_PUBLIC_AT = HYPE72_DROPS[0].revealAt;

/** Cookie del gate que ya existe en el proyecto (la que entrega /api/acceso). */
export const HYPE72_GATE_COOKIE = 'hype_early_access';

/** ¿La landing ya es pública? */
export function isHype72Publica(now: Date): boolean {
  return now.getTime() >= ms(HYPE72_PUBLIC_AT);
}

/**
 * ¿Se le puede mostrar la página a este visitante?
 * Pública para todos desde HYPE72_PUBLIC_AT; antes, solo con la cookie del gate.
 */
export function puedeVerHype72(now: Date, cookieGate: string | undefined | null): boolean {
  return isHype72Publica(now) || cookieGate === 'true';
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
