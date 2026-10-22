/**
 * Motor de análisis de Hype Content Intelligence.
 *
 * Funciones puras, sin dependencias y sin red: entran publicaciones (shape de
 * `GET hypestyle/v1/ig-posts`, el mismo que usa el panel) y salen respuestas con
 * su tamaño de muestra y sus límites explícitos.
 *
 * Las reglas estadísticas son las del doc 03 de la propuesta y están replicadas
 * de `next-app/lib/ig-insights/{analytics,ratios}.ts` — hay un test de paridad
 * (`tests/unit/skill-content-intelligence.test.ts`) que falla si divergen.
 *
 * Invariantes:
 *  - métrica ausente = null, NUNCA 0;
 *  - el denominador por defecto es `reach` (cuentas únicas, estimado por Meta);
 *  - orgánico y pago jamás se mezclan en un mismo ranking o comparación;
 *  - n < MIN_SAMPLE se informa siempre; nada se presenta como conclusión firme.
 */

export const MIN_SAMPLE = 8;

/* ─── Ratios ────────────────────────────────────────────────────────────── */

export function ratio(num, den) {
  if (num == null || den == null || den <= 0) return null;
  return num / den;
}

export const likesOverReach = (m = {}) => ratio(m.likes, m.reach);
export const likesOverViews = (m = {}) => ratio(m.likes, m.views);
export const savedOverReach = (m = {}) => ratio(m.saved, m.reach);
export const sharesOverReach = (m = {}) => ratio(m.shares, m.reach);
export const commentsOverReach = (m = {}) => ratio(m.comments, m.reach);
export const followsOverReach = (m = {}) => ratio(m.follows, m.reach);

/** Exige las cuatro interacciones: con una ausente el total daría de menos. */
export function engagementOverReach(m = {}) {
  const { likes, comments, saved, shares } = m;
  if (likes == null || comments == null || saved == null || shares == null) return null;
  return ratio(likes + comments + saved + shares, m.reach);
}

/** Métricas disponibles para rankear y comparar. */
export const METRICAS = {
  likesReach: { label: 'likes / alcance', fn: likesOverReach, principal: true },
  erReach: { label: 'engagement / alcance', fn: engagementOverReach },
  savedReach: { label: 'guardados / alcance', fn: savedOverReach },
  sharesReach: { label: 'compartidos / alcance', fn: sharesOverReach },
  commentsReach: { label: 'comentarios / alcance', fn: commentsOverReach },
  followsReach: { label: 'seguidores / alcance', fn: followsOverReach },
  likesViews: {
    label: 'likes / views',
    fn: likesOverViews,
    secundaria: true,
    aviso: 'views cuenta repeticiones de la misma cuenta: sirve para mirar un post, no para comparar entre posts',
  },
};

export function metricaDe(key) {
  const m = METRICAS[key];
  if (!m) throw new Error(`Métrica desconocida: ${key}. Opciones: ${Object.keys(METRICAS).join(', ')}`);
  return m;
}

/* ─── Estadística ───────────────────────────────────────────────────────── */

export function quantile(values, p) {
  const xs = values.filter((v) => typeof v === 'number' && Number.isFinite(v)).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  const pos = (xs.length - 1) * Math.min(Math.max(p, 0), 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return xs[lo] + (xs[hi] - xs[lo]) * (pos - lo);
}

export const median = (values) => quantile(values, 0.5);

export function summarize(key, values) {
  const xs = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  return {
    key,
    n: xs.length,
    median: median(xs),
    p25: quantile(xs, 0.25),
    p75: quantile(xs, 0.75),
    smallSample: xs.length < MIN_SAMPLE,
  };
}

export function outlierBounds(values) {
  const xs = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (xs.length < MIN_SAMPLE) return null;
  const p25 = quantile(xs, 0.25);
  const p75 = quantile(xs, 0.75);
  const iqr = p75 - p25;
  return { low: p25 - 1.5 * iqr, high: p75 + 1.5 * iqr };
}

export function factorVsMedian(value, med) {
  if (value == null || med == null || med <= 0) return null;
  return value / med;
}

/* ─── Filtrado ──────────────────────────────────────────────────────────── */

const tiempoDe = (publishedAt) => {
  if (!publishedAt) return NaN;
  return new Date(String(publishedAt).replace(' ', 'T') + 'Z').getTime();
};

/**
 * Selecciona el universo a analizar.
 * `distribucion`: 'organico' (default) | 'pago' | 'todo' — nunca se mezclan
 * salvo que quien consulta lo pida de forma explícita.
 *
 * OJO (hallazgo A-a de la auditoría del 17/10): `wasBoosted` es un campo
 * curado que no escribe ningún proceso automático. Hoy "sin marca de pauta"
 * significa *no verificado*, no *orgánico confirmado*. Por eso 'organico'
 * sigue incluyendo lo no verificado —si no, el universo quedaría vacío— pero
 * `distribucionSinVerificar` lo cuenta y `nivelDeConfianza` lo castiga.
 */
export function filtrar(posts, opciones = {}) {
  const {
    dias = null,
    desde = null,
    hasta = null,
    distribucion = 'organico',
    /** 'grilla' (default) | 'prueba' | 'todos' — ver `esReelDePrueba`. */
    reels = 'grilla',
    formato = null,
    categoria = null,
    portada = null,
    estilo = null,
    producto = null,
    campania = null,
    texto = null,
    soloConMetricas = true,
  } = opciones;

  const ahora = opciones.ahora ? new Date(opciones.ahora).getTime() : Date.now();
  const limiteInferior = dias != null ? ahora - dias * 86_400_000 : desde ? tiempoDe(desde) : null;
  const limiteSuperior = hasta ? tiempoDe(hasta) : null;

  return posts.filter((p) => {
    if (distribucion === 'organico' && p.wasBoosted) return false;
    if (distribucion === 'pago' && !p.wasBoosted) return false;

    // Los reels de prueba van afuera salvo que se pidan: distinta audiencia,
    // distinta mecánica, no son comparables con los de la grilla.
    if (reels === 'grilla' && esReelDePrueba(p)) return false;
    if (reels === 'prueba' && !esReelDePrueba(p)) return false;

    const t = tiempoDe(p.publishedAt);
    if (limiteInferior != null && !(t >= limiteInferior)) return false;
    if (limiteSuperior != null && !(t <= limiteSuperior)) return false;

    if (formato) {
      const f = String(formato).toUpperCase();
      if (f === 'CARRUSEL') {
        if (p.mediaType !== 'CAROUSEL_ALBUM') return false;
      } else if (p.mediaProductType !== f) return false;
    }
    if (categoria && p.category !== categoria) return false;
    if (portada && p.coverType !== portada) return false;
    if (estilo && p.visualStyle !== estilo) return false;
    if (campania != null && String(p.campaignId ?? '') !== String(campania)) return false;

    if (producto != null) {
      const comoId = Number(producto);
      const porId = Number.isFinite(comoId) && (p.productIds || []).includes(comoId);
      const porTexto = String(p.caption ?? '')
        .toLowerCase()
        .includes(String(producto).toLowerCase());
      if (!porId && !porTexto) return false;
    }
    if (texto && !String(p.caption ?? '').toLowerCase().includes(String(texto).toLowerCase())) {
      return false;
    }
    if (soloConMetricas && !p.latest) return false;
    return true;
  });
}

/**
 * Una publicación cuenta como distribución VERIFICADA si alguien la revisó:
 * o está marcada como pauteada, o tiene `boostRef` (la referencia del chequeo
 * contra Meta Ads que se carga a mano). Sin ninguna de las dos, no se sabe.
 */
export const distribucionVerificada = (p) => Boolean(p.wasBoosted || p.boostRef);

/* ─── Calidad de las métricas históricas ────────────────────────────────── */

/**
 * Espejo de `next-app/lib/ig-insights/calidad.ts` (hay test de paridad sobre
 * las 37 lecturas reales medidas el 19/10/2026).
 *
 * Para las publicaciones viejas la Graph API devuelve un alcance implausible
 * —un reel de 2021 informa alcance 7 con 4.232 views y 163 likes— y `views = 0`
 * en todo el feed anterior a octubre de 2024, cuando la métrica no existía.
 * No es "falta el dato": el dato está y es incorrecto.
 *
 * Nada se borra ni se corrige: esto es una lectura derivada. El veredicto es
 * POR MÉTRICA y no mira la fecha — las reglas de coherencia reproducen solas
 * el corte observado.
 */
export const REGLA_CALIDAD_VERSION = 1;
export const UMBRAL_VIEWS_REACH = { FEED: 8, REELS: 12 };
export const UMBRAL_LIKES_REACH = 0.25;
export const UMBRAL_INTERACCIONES_REACH = 0.5;
export const CORTE_OBSERVADO = '2024-10-19';

const METRICAS_SNAPSHOT = [
  'views', 'reach', 'likes', 'comments', 'saved', 'shares', 'reposts',
  'totalInteractions', 'profileVisits', 'follows', 'avgWatchTimeMs',
  'videoViewTotalTimeMs',
];

const pctTxt = (v) => (v * 100).toFixed(1).replace('.', ',') + '%';
const numTxt = (v) => v.toFixed(1).replace('.', ',');

export function evaluarCalidad(post, snap) {
  const epocaDegradada = String(post?.publishedAt ?? '') < CORTE_OBSERVADO;
  if (!snap) {
    return { estado: 'sin-metricas', metricas: {}, motivos: [], epocaDegradada, regla: REGLA_CALIDAD_VERSION };
  }

  const metricas = {};
  for (const k of METRICAS_SNAPSHOT) {
    metricas[k] = snap[k] == null ? { estado: 'ausente', motivo: null } : { estado: 'ok', motivo: null };
  }

  const motivos = [];
  const marcar = (k, motivo) => {
    const actual = metricas[k];
    if (!actual || actual.estado !== 'ok') return;
    metricas[k] = { estado: 'no-confiable', motivo };
    if (!motivos.includes(motivo)) motivos.push(motivo);
  };

  const tipo = String(post?.mediaProductType ?? '').toUpperCase();
  const { views, reach, likes, totalInteractions } = snap;

  if (reach != null && reach <= 0) marcar('reach', 'alcance informado en cero');

  if (tipo !== 'STORY' && views === 0 && ((likes ?? 0) > 0 || (reach ?? 0) > 0)) {
    marcar('views', 'views en cero con interacciones: la métrica no estaba disponible, no es un cero medido');
    marcar('reach', 'lectura de una época sin views: el alcance no es comparable con el de hoy');
  }

  const techo = UMBRAL_VIEWS_REACH[tipo] ?? UMBRAL_VIEWS_REACH.FEED;
  if (views != null && views > 0 && reach != null && reach > 0 && views / reach > techo) {
    marcar('reach', `views/alcance = ${numTxt(views / reach)} (máximo plausible ${techo}): el alcance está subinformado`);
  }

  if (likes != null && likes > 0 && reach != null && reach > 0 && likes / reach > UMBRAL_LIKES_REACH) {
    marcar('reach', `likes/alcance = ${pctTxt(likes / reach)} (máximo plausible ${pctTxt(UMBRAL_LIKES_REACH)})`);
  }

  if (totalInteractions != null && totalInteractions > 0 && reach != null && reach > 0 &&
      totalInteractions / reach > UMBRAL_INTERACCIONES_REACH) {
    marcar('reach', `interacciones/alcance = ${pctTxt(totalInteractions / reach)} (máximo plausible ${pctTxt(UMBRAL_INTERACCIONES_REACH)})`);
  }

  const hayNoConfiable = Object.values(metricas).some((m) => m.estado === 'no-confiable');
  return {
    estado: hayNoConfiable ? 'parcial' : 'ok',
    metricas, motivos, epocaDegradada, regla: REGLA_CALIDAD_VERSION,
  };
}

/** Las métricas usables de una publicación: lo no confiable queda en null. */
export function metricasDe(post) {
  const snap = post?.latest;
  if (!snap) return {};
  const calidad = evaluarCalidad(post, snap);
  const out = {};
  for (const k of METRICAS_SNAPSHOT) {
    out[k] = calidad.metricas[k]?.estado === 'ok' ? snap[k] : null;
  }
  return out;
}

export const tieneAlcanceConfiable = (p) => metricasDe(p).reach != null;

/** El universo analizado y el excluido, con el motivo de cada exclusión. */
export function resumenDeCalidad(posts) {
  const porMotivo = {};
  let sinMetricas = 0, analizables = 0, excluidas = 0;
  let excluidasAnterioresAlCorte = 0, anterioresAlCorteQuePasan = 0;

  for (const p of posts) {
    const c = evaluarCalidad(p, p.latest);
    if (c.estado === 'sin-metricas') { sinMetricas++; continue; }
    if (c.metricas.reach?.estado === 'ok') {
      analizables++;
      if (c.epocaDegradada) anterioresAlCorteQuePasan++;
    } else {
      excluidas++;
      if (c.epocaDegradada) excluidasAnterioresAlCorte++;
      for (const m of c.motivos) porMotivo[m] = (porMotivo[m] ?? 0) + 1;
    }
  }
  return {
    total: posts.length, sinMetricas, analizables, excluidas, porMotivo,
    excluidasAnterioresAlCorte, anterioresAlCorteQuePasan,
    regla: REGLA_CALIDAD_VERSION, corteObservado: CORTE_OBSERVADO,
  };
}

/* ─── Formato y reels de prueba ─────────────────────────────────────────── */

/**
 * Un reel con `isSharedToFeed === false` es un **trial reel**: Instagram se lo
 * muestra sólo a gente que no sigue la cuenta. No es comparable con un reel de
 * la grilla, así que es su propio formato y no entra en el universo por
 * defecto.
 */
export const esReelDePrueba = (p) => p.mediaProductType === 'REELS' && p.isSharedToFeed === false;

export function formatoDe(p) {
  if (esReelDePrueba(p)) return 'reel-prueba';
  if (p.mediaProductType === 'REELS') return 'reel';
  if (p.mediaProductType === 'STORY') return 'story';
  return p.mediaType === 'CAROUSEL_ALBUM' ? 'carrusel' : 'imagen';
}

/** Cuántas publicaciones del universo quedaron afuera por no tener métricas. */
export function huecos(posts) {
  const sinMetricas = posts.filter((p) => !p.latest).length;
  const sinClasificar = posts.filter((p) => !p.category).length;
  const pauteadas = posts.filter((p) => p.wasBoosted).length;
  const sinVerificar = posts.filter((p) => !distribucionVerificada(p)).length;
  const dePrueba = posts.filter(esReelDePrueba).length;
  const calidad = resumenDeCalidad(posts);
  return {
    total: posts.length,
    sinMetricas,
    sinClasificar,
    pauteadas,
    sinVerificar,
    dePrueba,
    noConfiables: calidad.excluidas,
    analizables: calidad.analizables,
    calidad,
  };
}

/* ─── Consultas ─────────────────────────────────────────────────────────── */

const etiquetaPost = (p) => ({
  igMediaId: p.igMediaId,
  permalink: p.permalink,
  fecha: String(p.publishedAt ?? '').slice(0, 10),
  formato: formatoDe(p),
  categoria: p.category || null,
  portada: p.coverType || null,
  estilo: p.visualStyle || null,
  pauteada: Boolean(p.wasBoosted),
  dePrueba: esReelDePrueba(p),
});

/** Ranking por una métrica, con el contexto necesario para citarlo. */
export function rankear(posts, { metrica = 'likesReach', limite = 10 } = {}) {
  const def = metricaDe(metrica);
  // metricasDe() y no p.latest: lo no confiable queda en null y no rankea.
  const conValor = posts
    .map((p) => ({ post: p, valor: def.fn(metricasDe(p)) }))
    .filter((x) => x.valor != null)
    .sort((a, b) => b.valor - a.valor);

  const valores = conValor.map((x) => x.valor);
  const bounds = outlierBounds(valores);
  const med = median(valores);

  return {
    metrica: def.label,
    secundaria: Boolean(def.secundaria),
    aviso: def.aviso ?? null,
    n: conValor.length,
    muestraChica: conValor.length < MIN_SAMPLE,
    mediana: med,
    items: conValor.slice(0, limite).map((x) => ({
      ...etiquetaPost(x.post),
      valor: x.valor,
      vsMediana: factorVsMedian(x.valor, med),
      atipico: Boolean(bounds && x.valor > bounds.high),
      alcance: metricasDe(x.post).reach ?? null,
    })),
  };
}

const CLAVES_DIM = {
  categoria: (p) => p.category || null,
  portada: (p) => p.coverType || null,
  estilo: (p) => p.visualStyle || null,
  formato: formatoDe,
  escenario: (p) => p.scenario || null,
  campania: (p) => (p.campaignId != null ? `campaña ${p.campaignId}` : null),
};

/** Medianas por segmento de una dimensión, ordenadas y con aviso de n chico. */
export function compararSegmentos(posts, { dimension = 'categoria', metrica = 'likesReach' } = {}) {
  const def = metricaDe(metrica);
  const claveDe = CLAVES_DIM[dimension];
  if (!claveDe) {
    throw new Error(`Dimensión desconocida: ${dimension}. Opciones: ${Object.keys(CLAVES_DIM).join(', ')}`);
  }

  const grupos = new Map();
  for (const p of posts) {
    const k = claveDe(p);
    if (!k) continue;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(def.fn(metricasDe(p)));
  }

  const segmentos = [...grupos.entries()]
    .map(([k, vals]) => summarize(k, vals))
    .filter((s) => s.n > 0)
    .sort((a, b) => {
      if (a.smallSample !== b.smallSample) return a.smallSample ? 1 : -1;
      return (b.median ?? -Infinity) - (a.median ?? -Infinity);
    });

  const comparables = segmentos.filter((s) => !s.smallSample);
  return {
    dimension,
    metrica: def.label,
    secundaria: Boolean(def.secundaria),
    segmentos,
    comparables: comparables.length,
    /** Sin al menos dos segmentos con n suficiente, no hay comparación que sostener. */
    evidenciaSuficiente: comparables.length >= 2,
  };
}

/**
 * Contrasta dos segmentos de una misma dimensión (ej.: flatlay vs editorial).
 * Devuelve la diferencia observada y, sobre todo, si alcanza para afirmarla.
 */
export function contrastar(posts, { dimension = 'categoria', a, b, metrica = 'likesReach' } = {}) {
  const comp = compararSegmentos(posts, { dimension, metrica });
  const segA = comp.segmentos.find((s) => s.key === a) ?? { key: a, n: 0, median: null, smallSample: true };
  const segB = comp.segmentos.find((s) => s.key === b) ?? { key: b, n: 0, median: null, smallSample: true };

  const factor = factorVsMedian(segA.median, segB.median);
  const solapan =
    segA.p25 != null && segA.p75 != null && segB.p25 != null && segB.p75 != null
      ? segA.p25 <= segB.p75 && segB.p25 <= segA.p75
      : null;

  const sinVerificar = posts.filter((p) => !distribucionVerificada(p)).length;

  const limitaciones = [];
  if (segA.n < MIN_SAMPLE) limitaciones.push(`"${a}" tiene n=${segA.n} (menos de ${MIN_SAMPLE})`);
  if (segB.n < MIN_SAMPLE) limitaciones.push(`"${b}" tiene n=${segB.n} (menos de ${MIN_SAMPLE})`);
  if (solapan) limitaciones.push('los rangos p25–p75 se solapan: la diferencia puede ser ruido');
  if (sinVerificar > 0) {
    limitaciones.push(
      `${sinVerificar} de ${posts.length} publicaciones tienen distribución SIN VERIFICAR: ` +
        'si alguna tuvo pauta, la diferencia puede ser plata y no contenido',
    );
  }
  limitaciones.push(
    'es una diferencia observada, no una causa: pueden explicarla el producto, el horario, la campaña o el momento de la cuenta',
  );

  return {
    metrica: comp.metrica,
    a: segA,
    b: segB,
    factor,
    solapan,
    sinVerificar,
    /** Solo con ambas muestras suficientes y sin solapamiento se habla de señal. */
    veredicto:
      segA.n >= MIN_SAMPLE && segB.n >= MIN_SAMPLE && solapan === false
        ? 'señal'
        : segA.n >= MIN_SAMPLE && segB.n >= MIN_SAMPLE
          ? 'indicio'
          : 'insuficiente',
    limitaciones,
  };
}

/** Distribución editorial objetivo (hipótesis de la Fase 0, NO una regla). */
export const MEZCLA_OBJETIVO = {
  flatlay: 0.25,
  editorial: 0.15,
  'reel-visual': 0.15,
  ugc: 0.1,
  'reel-hablando': 0.1,
  estudio: 0.1,
  bts: 0.1,
  cultura: 0.05,
};

/**
 * Qué se está repitiendo de más o de menos contra la mezcla objetivo, y cuánto
 * hace que no sale cada categoría. La mezcla es una hipótesis de trabajo: esto
 * señala desvíos para discutirlos, no para corregirlos automáticamente.
 */
export function detectarRepeticion(posts, { ahora = Date.now(), objetivo = MEZCLA_OBJETIVO } = {}) {
  const clasificadas = posts.filter((p) => p.category);
  const total = clasificadas.length;
  const cuenta = new Map();
  const ultima = new Map();

  for (const p of clasificadas) {
    cuenta.set(p.category, (cuenta.get(p.category) ?? 0) + 1);
    const t = tiempoDe(p.publishedAt);
    if (!ultima.has(p.category) || t > ultima.get(p.category)) ultima.set(p.category, t);
  }

  const ahoraMs = new Date(ahora).getTime();
  const filas = Object.keys(objetivo).map((cat) => {
    const n = cuenta.get(cat) ?? 0;
    const real = total > 0 ? n / total : 0;
    const diasDesde = ultima.has(cat) ? Math.floor((ahoraMs - ultima.get(cat)) / 86_400_000) : null;
    return {
      categoria: cat,
      n,
      real,
      objetivo: objetivo[cat],
      desvio: real - objetivo[cat],
      diasDesdeLaUltima: diasDesde,
    };
  });

  // Umbral de 5 puntos porcentuales: por debajo es ruido de muestreo.
  const sobre = filas.filter((f) => f.desvio > 0.05).sort((a, b) => b.desvio - a.desvio);
  const sub = filas.filter((f) => f.desvio < -0.05).sort((a, b) => a.desvio - b.desvio);
  const rachaMaxima = rachaDeCategoria(clasificadas);

  return {
    total,
    sinClasificar: posts.length - total,
    filas: filas.sort((a, b) => b.real - a.real),
    sobrerrepresentadas: sobre,
    subrepresentadas: sub,
    rachaMaxima,
    nota:
      total < MIN_SAMPLE
        ? `Con ${total} publicaciones clasificadas la mezcla todavía no dice mucho.`
        : null,
  };
}

/** Racha más larga de publicaciones seguidas de la misma categoría. */
function rachaDeCategoria(posts) {
  const orden = [...posts].sort((a, b) => tiempoDe(a.publishedAt) - tiempoDe(b.publishedAt));
  let mejor = { categoria: null, largo: 0 };
  let actual = { categoria: null, largo: 0 };
  for (const p of orden) {
    if (p.category === actual.categoria) actual.largo += 1;
    else actual = { categoria: p.category, largo: 1 };
    if (actual.largo > mejor.largo) mejor = { ...actual };
  }
  return mejor;
}

/**
 * Qué funcionó para un producto (por id de Woo o por texto del copy).
 * Devuelve las publicaciones encontradas y el corte por formato y portada.
 */
export function porProducto(posts, { producto, metrica = 'savedReach', opciones = {} } = {}) {
  // `opciones` arrastra el resto del filtro de la consulta (distribución,
  // formato, ventana): sin eso, un corte "orgánico" se colaba con pauteadas.
  const encontradas = filtrar(posts, {
    ...opciones,
    producto,
    dias: opciones.dias ?? null,
    soloConMetricas: true,
  });
  return {
    producto,
    n: encontradas.length,
    muestraChica: encontradas.length < MIN_SAMPLE,
    ranking: rankear(encontradas, { metrica, limite: 5 }),
    porFormato: compararSegmentos(encontradas, { dimension: 'formato', metrica }),
    porPortada: compararSegmentos(encontradas, { dimension: 'portada', metrica }),
  };
}

/**
 * Evaluación del respaldo de una afirmación: qué nivel de confianza admite.
 * El skill la usa para no presentar como evidencia lo que es una corazonada.
 */
export function nivelDeConfianza({
  n = 0,
  comparables = 0,
  solapan = null,
  pauteadasEnMuestra = 0,
  sinVerificarEnMuestra = 0,
}) {
  const razones = [];
  let nivel = 'alta';

  if (n < MIN_SAMPLE) {
    nivel = 'baja';
    razones.push(`n=${n}, por debajo del mínimo de ${MIN_SAMPLE}`);
  } else if (n < MIN_SAMPLE * 2) {
    nivel = 'media';
    razones.push(`n=${n}: alcanza para un indicio, no para una conclusión`);
  }
  if (comparables < 2 && comparables > 0) {
    nivel = nivel === 'alta' ? 'media' : nivel;
    razones.push('hay un solo segmento con muestra suficiente: no hay con qué comparar');
  }
  if (solapan === true) {
    nivel = nivel === 'alta' ? 'media' : 'baja';
    razones.push('los rangos intercuartiles se solapan');
  }
  if (pauteadasEnMuestra > 0) {
    nivel = 'baja';
    razones.push(`${pauteadasEnMuestra} publicaciones pauteadas dentro de una muestra orgánica`);
  }
  // Distribución sin verificar: no es lo mismo que tener pauta adentro, pero
  // tampoco se puede llamar "alta" a una conclusión sobre un universo que
  // nadie cruzó con Meta Ads.
  if (sinVerificarEnMuestra > 0 && nivel === 'alta') {
    nivel = 'media';
    razones.push(
      `${sinVerificarEnMuestra} publicaciones con distribución sin verificar (ninguna cruzada con Meta Ads)`,
    );
  } else if (sinVerificarEnMuestra > 0) {
    razones.push(`${sinVerificarEnMuestra} publicaciones con distribución sin verificar`);
  }
  if (razones.length === 0) razones.push('muestra suficiente y segmentos separados');
  return { nivel, razones };
}
