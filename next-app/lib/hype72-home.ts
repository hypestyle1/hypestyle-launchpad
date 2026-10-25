/**
 * HYPE 72 — TAKEOVER TEMPORAL DE LA HOME.
 *
 * Durante el evento propio de Hype la home se reordena: las ofertas suben
 * arriba de las secciones editoriales. Al cerrar la ventana vuelve sola a la
 * home de siempre, SIN DEPLOY.
 *
 * NO es CyberMonday ni CACE. En ningún texto de este archivo ni de los
 * componentes que lo usan va "Cyber Monday" ni nada de CACE: es un evento de la
 * marca.
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ESTE ARCHIVO ES EL ÚNICO LUGAR CON FECHAS Y ESTADO DEL TAKEOVER         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Para mover la ventana, adelantar la previa o apagar el takeover se      ║
 * ║  edita ACÁ y nada más. Los componentes no tienen ni una fecha propia.    ║
 * ║                                                                          ║
 * ║  REVERSIÓN — las dos vías, documentadas a propósito:                     ║
 * ║   1. Por constante: `HYPE72_HOME_PREVIA_DESDE = Infinity` (o mover       ║
 * ║      HYPE72_HOME_HASTA al pasado) y la home vuelve a la de siempre. Un   ║
 * ║      cambio de una línea, sin tocar ningún componente.                   ║
 * ║   2. Por `git revert` del PR: no hay nada fuera de lib/hype72-home.ts,   ║
 * ║      components/home/hype72/ y el condicional de app/page.tsx.           ║
 * ║   3. Sin deploy, en caliente: variable de entorno                        ║
 * ║      `HYPE72_HOME_OVERRIDE=force_off` (ver hype72HomeOverride).          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * HORARIO. Todo se escribe con el offset `-03:00` a mano
 * (America/Argentina/Buenos_Aires, que no tiene horario de verano, así que
 * -03:00 vale todo el año). Escrito sin offset, un `new Date('2026-11-01T23:00')`
 * se resuelve en la TZ del proceso: Vercel corre en UTC y el takeover
 * arrancaría tres horas antes. Mismo criterio que
 * `lib/promo-pack-regular.ts` (ventana del 4 PACK) y que `lib/hype72.ts` de la
 * landing.
 *
 * HORA DE SERVIDOR. El estado lo resuelve SIEMPRE el servidor, en el render de
 * `app/page.tsx`. Al navegador solo se le manda el instante al que apunta la
 * cuenta regresiva, para dibujar el tiempo que falta. Un reloj adelantado a
 * mano no abre el takeover.
 *
 * PRECIOS. Ni un monto vive acá. Los precios salen del catálogo de Woo como en
 * todo el resto del sitio (ProductCard los recibe del producto). Lo que todavía
 * no está aprobado va detrás de HYPE72_PRECIOS_APROBADOS y por defecto NO se
 * muestra. Ver el bloque de abajo.
 */

// ─── Interruptor de montos ───────────────────────────────────────────────────
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  PROHIBIDO PUBLICAR PORCENTAJES DE DESCUENTO                             ║
// ╠══════════════════════════════════════════════════════════════════════════╣
// ║  Medido el 25/10/2026: 89 de 145 productos tienen `sale_price`           ║
// ║  permanente, sin fecha de fin. El "precio de lista" de esos 89 no es un  ║
// ║  precio que se haya transado nunca, así que anunciar un % contra él es   ║
// ║  un precio de referencia manipulado.                                     ║
// ║                                                                          ║
// ║  El takeover comunica por PRECIO FINAL (el del catálogo, tal cual) y por ║
// ║  el REGALO. En ningún componente del takeover va un "%", ni un "antes",  ║
// ║  ni un tachado agregado por el evento. ProductCard ya muestra el precio  ║
// ║  final; se le pasa `mutedPrice` para que ni siquiera lo pinte de rojo.   ║
// ╚══════════════════════════════════════════════════════════════════════════╝
/**
 * ¿Los montos y umbrales del evento están aprobados y se pueden publicar?
 *
 * En `false` (hoy): la escalera de regalos se muestra como "Regalo por compra"
 * SIN montos, y ninguna sección del takeover escribe una cifra propia. Mismo
 * interruptor y mismo criterio que `HYPE72_PRECIOS_APROBADOS` de
 * `lib/hype72.ts` (landing /hype72, PR #616) — está duplicado a propósito: este
 * PR sale de `origin/main` y tiene que poder mergearse solo, sin depender de
 * esa rama. Cuando las dos estén en `main`, unificar en un solo interruptor.
 *
 * PARA PUBLICARLOS, cuando estén aprobados uno por uno:
 *  1. verificar cada umbral contra el plugin Purchase Gift y contra el stock
 *     real (al 25/10: 3 cadenas en stock contra ~35 que haría falta);
 *  2. poner esto en `true`;
 *  3. el test "sin aprobación el takeover no escribe ni un monto" va a fallar:
 *     cambiarlo por el de la variante aprobada.
 * No hace falta tocar ningún componente: leen de acá.
 */
export const HYPE72_PRECIOS_APROBADOS = false;

// ─── La ventana ──────────────────────────────────────────────────────────────

/**
 * Arranque de la PREVIA: **27/10/2026 11:00 ART**.
 *
 * FECHA A DEFINIR POR VALENTÍN. Hoy está en el 27/10 11:00 porque es cuando
 * arranca la revelación progresiva de la landing (el `revealAt` del drop 01).
 * En la previa la home NO reordena nada ni muestra oferta alguna: solo avisa
 * que el evento viene, con las fechas y la cuenta regresiva. Es el estado más
 * barato de mover: adelantarlo o atrasarlo no compromete ningún precio.
 */
export const HYPE72_HOME_PREVIA_DESDE = Date.parse('2026-10-27T11:00:00-03:00');

/**
 * Arranque del EVENTO, inclusive: **1/11/2026 23:00 ART**.
 *
 * Una hora antes de la apertura pública del 2/11 00:00, igual que
 * `PACK_REGULAR_X4_DESDE`: a esa hora se le avisa a Private Access y a Mejores
 * Amigos y la oferta tiene que estar viva cuando llega el aviso. No está
 * gateado por membresía — lo anticipado es el aviso, no el precio.
 *
 * Tiene que coincidir con `PACK_REGULAR_X4_DESDE` de
 * `lib/promo-pack-regular.ts`: si el home dijera que el evento arrancó y el
 * carrito todavía cobrara el pack de 3, la home estaría prometiendo algo que el
 * checkout no cumple. Hay un test que compara los dos instantes cuando esa
 * rama está mergeada.
 */
export const HYPE72_HOME_DESDE = Date.parse('2026-11-01T23:00:00-03:00');

/**
 * Cierre del evento, EXCLUSIVO: 5/11/2026 00:00 ART.
 *
 * Escrito como el arranque del día siguiente para que el último minuto
 * (4/11 23:59, con sus segundos) entre completo. Desde este instante la home es
 * exactamente la de siempre, sin deploy y sin que nadie apriete nada.
 */
export const HYPE72_HOME_HASTA = Date.parse('2026-11-05T00:00:00-03:00');

/** Las fechas como se le cuentan a la gente. La ventana publicada, no la técnica. */
export const HYPE72_FECHAS = '2 · 3 · 4 de noviembre';

/** Cómo se le cuenta el cierre. */
export const HYPE72_CIERRE_LABEL = 'miércoles 4/11 · 23:59';

/**
 * Acento del evento: naranja.
 *
 * NO se reusa `--sale` (el rojo de campaña del sitio, `--sale: 4 71% 44%`):
 * ese rojo es justamente el aspecto de liquidación que el evento tiene que
 * evitar, y además se usa para los precios rebajados de todo el catálogo.
 * Token nuevo y propio, declarado en globals.css como `--hype72-acento`.
 */
export const HYPE72_ACENTO = '#FF4A00';

/**
 * A dónde manda el CTA de la banda en la PREVIA.
 *
 * ── DECISIÓN DE UNA LÍNEA PARA VALENTÍN ──────────────────────────────────────
 * El lugar natural es `/hype72`, la landing con la cartelera (PR #616). Hoy
 * esto apunta a `/productos` a propósito: **este PR sale de `origin/main` y
 * tiene que poder mergearse solo**. Si apuntara a `/hype72` y #616 no estuviera
 * mergeado, el CTA de la previa sería un 404 en producción.
 *
 * En cuanto #616 esté en `main`, cambiar esto a `/hype72`. Es la única línea.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const HYPE72_LANDING = '/productos';

/**
 * A dónde manda el CTA de la banda durante el EVENTO: al primer bloque de
 * ofertas de la misma home. Ancla, no navegación — durante el evento lo que hay
 * que comprar está dos pantallas más abajo, no en otra página. Cero dependencia
 * de otra rama.
 */
export const HYPE72_CTA_EVENTO = '#hype72-packs';

// ─── Los tres estados ────────────────────────────────────────────────────────

/**
 * - `normal`: la home de siempre. Es el estado ANTES de la previa Y DESPUÉS del
 *   cierre: "finalizado" no es un estado con chrome propio, es volver a la home
 *   normal. Por eso son el mismo valor y por eso el árbol de render es idéntico
 *   en los dos casos.
 * - `previa`: el evento viene. Top bar con fechas y cuenta regresiva + banda
 *   bajo el hero. NINGUNA oferta, NINGÚN reordenamiento: en la previa no hay
 *   nada aprobado que mostrar y las secciones de siempre quedan intactas.
 * - `evento`: el takeover completo. Las ofertas arriba de lo editorial.
 */
export type Hype72HomeState = 'normal' | 'previa' | 'evento';

/** El estado que mandan las fechas, sin overrides. Función pura. */
export function hype72HomeState(ahora: number = Date.now()): Hype72HomeState {
  if (ahora >= HYPE72_HOME_HASTA) return 'normal';
  if (ahora >= HYPE72_HOME_DESDE) return 'evento';
  if (ahora >= HYPE72_HOME_PREVIA_DESDE) return 'previa';
  return 'normal';
}

/** ¿Está corriendo el evento en este instante (sin overrides)? */
export function hype72HomeEnCurso(ahora: number = Date.now()): boolean {
  return ahora >= HYPE72_HOME_DESDE && ahora < HYPE72_HOME_HASTA;
}

/**
 * Apagado de emergencia, sin tocar código.
 *
 * `HYPE72_HOME_OVERRIDE=force_off` devuelve la home normal en CUALQUIER
 * entorno, incluido producción. Mismo molde que el
 * `override: 'auto' | 'force_on' | 'force_off'` de
 * `lib/private-access/config.ts`, con una asimetría a propósito:
 *
 * **hay `force_off` pero NO hay `force_on`.** Forzar el apagado nunca puede
 * filtrar nada: deja la home como está hoy. Forzar el encendido sí podría
 * publicar en producción un estado con ofertas y condiciones que todavía no
 * están aprobadas, por una variable mal cargada. Para ver el takeover antes de
 * la fecha está `hype72HomePreview`, que solo existe en `next dev`.
 *
 * (En Private Access el `force_on` tiene sentido porque la config vive en una
 * option de WP y la edita Valentín desde /admin/private-access. Acá sería una
 * env var de Vercel, sin panel y sin quién la revise.)
 */
export function hype72HomeOverride(): 'auto' | 'force_off' {
  return process.env.HYPE72_HOME_OVERRIDE === 'force_off' ? 'force_off' : 'auto';
}

/**
 * Forzar un estado para mirarlo: `HYPE72_HOME_PREVIEW=previa|evento|normal`.
 *
 * SOLO en `next dev`. Cualquier build (Vercel production o preview) corre con
 * NODE_ENV=production y esto no existe — mismo recaudo que
 * `previewOverride()` de `lib/ss27-coleccion.ts`, y por el mismo motivo: el
 * `.env.local` que se baja de Vercel trae VERCEL_ENV en "production", así que
 * esa variable no sirve de guarda.
 *
 * Es también la forma de sacar las capturas de las tres variantes sin tocar el
 * reloj del sistema ni las constantes de arriba.
 */
export function hype72HomePreview(): Hype72HomeState | null {
  if (process.env.NODE_ENV !== 'development') return null;
  const v = process.env.HYPE72_HOME_PREVIEW;
  return v === 'previa' || v === 'evento' || v === 'normal' ? v : null;
}

/**
 * El estado que se renderiza. Lo llama `app/page.tsx` con la hora del
 * SERVIDOR.
 *
 * Orden de precedencia, de más fuerte a más débil:
 *  1. `force_off` (apagado de emergencia, cualquier entorno) → siempre 'normal'
 *  2. `HYPE72_HOME_PREVIEW` (solo `next dev`)
 *  3. las fechas
 *
 * El apagado va primero a propósito: si alguien carga las dos variables, la que
 * gana es la que no muestra nada.
 */
export function hype72HomeStateResuelto(
  ahora: number = Date.now(),
  deps: { override?: 'auto' | 'force_off'; preview?: Hype72HomeState | null } = {},
): Hype72HomeState {
  const override = deps.override ?? hype72HomeOverride();
  if (override === 'force_off') return 'normal';
  const preview = deps.preview ?? hype72HomePreview();
  if (preview) return preview;
  return hype72HomeState(ahora);
}

// ─── El orden de las secciones ───────────────────────────────────────────────

/**
 * Ids de las secciones comerciales y editoriales del cuerpo de la home.
 *
 * `app/page.tsx` NO tiene el orden escrito en el JSX: tiene un diccionario
 * id → sección y renderiza `hype72HomeOrden(state).map(...)`. Así el orden es
 * dato testeable y el "fuera de la ventana la home no cambia" se puede verificar
 * de verdad (tests/unit/hype72-home.test.ts), en vez de confiar en leer el JSX.
 */
export type Hype72SeccionId =
  // Las de siempre, en el orden que tienen hoy en app/page.tsx.
  | 'promo-3x2'
  | 'flash-sale'
  | 'ss27-feed'
  | 'shop-the-look'
  | 'visto-en'
  | 'esenciales'
  | 'fw26'
  | 'best-sellers'
  | 'editorial-banner'
  | 'reviews'
  | 'instagram'
  // Las del takeover.
  | 'hype72-banda'
  | 'hype72-regalos'
  | 'hype72-packs'
  | 'hype72-archivo'
  | 'hype72-sleeveless'
  | 'hype72-hoodies-tees'
  | 'hype72-populares'
  | 'hype72-proximamente'
  | 'hype72-condiciones'
  | 'hype72-corte';

/**
 * EL ORDEN DE HOY, congelado.
 *
 * Es el cuerpo de la home tal cual está en `main` al 25/10/2026. El test lo
 * compara contra esta misma lista para los estados 'normal': si alguien suma o
 * mueve una sección de la home y no actualiza esto, el test avisa.
 */
export const HYPE72_ORDEN_NORMAL: readonly Hype72SeccionId[] = [
  'promo-3x2',
  'flash-sale',
  'ss27-feed',
  'shop-the-look',
  'visto-en',
  'esenciales',
  'fw26',
  'best-sellers',
  'editorial-banner',
  'reviews',
  'instagram',
] as const;

/**
 * PREVIA: la home de siempre con una banda arriba. Nada más.
 *
 * No se reordena nada: en la previa no hay oferta aprobada que subir, y mover
 * las secciones una semana antes solo haría que la home se vea rara sin motivo.
 * La única diferencia con 'normal' es `hype72-banda` al principio (y el top bar,
 * que no es una sección del cuerpo).
 */
export const HYPE72_ORDEN_PREVIA: readonly Hype72SeccionId[] = [
  'hype72-banda',
  ...HYPE72_ORDEN_NORMAL,
] as const;

/**
 * EVENTO: el orden comercial, de la matriz de rentabilidad medida el 25/10.
 *
 * Las ofertas van ARRIBA de lo editorial (Shop the Look, Visto en, el banner,
 * reseñas, Instagram). El criterio de cada posición:
 *
 *  03 hero del evento        → `hype72-banda`, debajo del hero de siempre.
 *  04 escalera de regalos    → ARRIBA de los packs. Un beneficio por umbral
 *                              solo cambia una decisión si el cliente lo conoce
 *                              ANTES de armar el carrito; abajo llega tarde.
 *  05 packs y ofertas        → el ancla comercial (3 PACK, 4 PACK, dúos).
 *  06 archivo                → temporadas anteriores, lo que hay que liquidar.
 *  07 sleeveless y stock alto→ donde hay unidades de sobra.
 *  08 hoodies, tees y SS27   → la mayor contribución por unidad.
 *  09 populares              → lo que ya se vende solo.
 *  10 próximamente           → claramente separado de lo comprable, al final.
 *  11 pagos y condiciones    → cierra el bloque comercial. Durante el evento el
 *                              marquee del top bar lo ocupa el contador, así que
 *                              los beneficios que hoy viven ahí vuelven como
 *                              bloque (BenefitsStrip).
 *  --- corte ---
 *  Lo editorial de siempre, en su orden de siempre.
 *
 * `esenciales`, `fw26` y `best-sellers` NO están: sus productos ya están en los
 * bloques del evento (packs, archivo, sleeveless, populares) y repetirlos haría
 * una home de 40.000 px con las mismas cards tres veces. Vuelven solos al
 * cerrar la ventana.
 */
export const HYPE72_ORDEN_EVENTO: readonly Hype72SeccionId[] = [
  'hype72-banda',
  'hype72-regalos',
  'hype72-packs',
  'hype72-archivo',
  'hype72-sleeveless',
  'hype72-hoodies-tees',
  'hype72-populares',
  'hype72-proximamente',
  'hype72-condiciones',
  'hype72-corte',
  'shop-the-look',
  'visto-en',
  'editorial-banner',
  'reviews',
  'instagram',
] as const;

/** El orden del cuerpo de la home para un estado. */
export function hype72HomeOrden(state: Hype72HomeState): readonly Hype72SeccionId[] {
  if (state === 'evento') return HYPE72_ORDEN_EVENTO;
  if (state === 'previa') return HYPE72_ORDEN_PREVIA;
  return HYPE72_ORDEN_NORMAL;
}

// ─── Top bar ─────────────────────────────────────────────────────────────────

/**
 * Qué dice el marquee del top bar en cada estado.
 *
 * Se cambia el CONTENIDO de `AnnouncementBar`, no se suma otra barra: el stack
 * de barras fijas (`FlashSaleBar` es `fixed top-0 h-[40px]` y se apila ARRIBA
 * de la announce bar) está atado a `--offset`, y sumar una tercera barra
 * obligaría a mover `--offset` y revisar el `scroll-margin-top` de todo el
 * sitio. No vale la pena por una barra de tres días.
 *
 * Los beneficios de siempre (envío gratis, cuotas, cambios) salen del marquee
 * durante el evento y vuelven como bloque 11 (`BenefitsStrip`): no se pierden,
 * cambian de lugar.
 *
 * Ni una cifra acá: el envío gratis y las cuotas son los de siempre y los
 * escribe `AnnouncementBar`; lo del evento se cuenta por mecánica.
 */
export const HYPE72_TOPBAR_PREVIA: readonly string[] = [
  `HYPE 72 — ${HYPE72_FECHAS}`,
  'Seis drops en 72 horas',
  'Regalo por compra',
  'Envío gratis a sucursal desde $180.000',
  'Hasta 3 cuotas sin interés',
] as const;

export const HYPE72_TOPBAR_EVENTO: readonly string[] = [
  'HYPE 72 — en curso',
  `Hasta el ${HYPE72_CIERRE_LABEL}`,
  'Regalo por compra',
  '30 días para cambios y devoluciones',
  'Hasta 3 cuotas sin interés',
] as const;

/** Los items del top bar, o `null` para dejar los de siempre. */
export function hype72TopBarItems(state: Hype72HomeState): readonly string[] | null {
  if (state === 'evento') return HYPE72_TOPBAR_EVENTO;
  if (state === 'previa') return HYPE72_TOPBAR_PREVIA;
  return null;
}

/**
 * A qué instante apunta la cuenta regresiva, y qué dice arriba.
 *
 * En la previa cuenta hasta la apertura; en el evento, hasta el cierre. `null`
 * fuera de los dos estados.
 *
 * El valor es un timestamp (número), no un `Date`: tiene que cruzar el borde
 * servidor → cliente y los `Date` no son serializables como props.
 */
export function hype72Countdown(state: Hype72HomeState): { target: number; label: string } | null {
  if (state === 'previa') return { target: HYPE72_HOME_DESDE, label: 'Arranca en' };
  if (state === 'evento') return { target: HYPE72_HOME_HASTA, label: 'Termina en' };
  return null;
}
