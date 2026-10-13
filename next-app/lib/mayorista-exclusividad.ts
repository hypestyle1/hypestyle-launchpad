// Exclusividad por zona comercial (política del 05/10/2026, ver
// HOW_IT_WORKS_SECTIONS en lib/mayorista-copy.ts; zonas y evaluación del
// 13/10/2026):
//   - Se gana con $3.000.000 en pedidos pagados dentro de 120 días.
//   - Se sostiene con al menos un pedido pagado por mes y $3.000.000 por
//     cuatrimestre.
//   - Mientras dura: no se aprueban locales nuevos en esa zona y las cuentas
//     que ya existían ahí no pueden hacer pedidos.
//
// Se administra a mano: el sistema evalúa y avisa (evaluarExclusividad), el
// admin decide. Ninguna exclusividad se concede, revoca ni bloquea sola.
//
// Vive en metas del customer de Woo, sin guión bajo (WC descarta los meta
// protegidos al leer/escribir customers por REST):
//   mayorista_exclusividad          en la cuenta titular: { ciudad, desde, pedido?, zona? }
//   mayorista_bloqueo_exclusividad  en las cuentas de esa zona que no pueden pedir
// Los dos son JSON en string.
//
// Zona comercial: la define el admin al conceder la exclusividad (nombre +
// alias). "Córdoba Capital" con alias "Villa Allende, Mendiolaza" cubre esas
// localidades; "CABA" con alias "Capital Federal, Buenos Aires". Si no hay
// zona, vale la ciudad literal (cuentas cargadas antes del cambio).

export const META_EXCLUSIVIDAD = 'mayorista_exclusividad';
export const META_BLOQUEO = 'mayorista_bloqueo_exclusividad';

export const EXCLUSIVIDAD_MONTO = 3_000_000;
export const EXCLUSIVIDAD_VENTANA_DIAS = 120;
/** Por cuatrimestre calendario (ene–abr, may–ago, sep–dic). */
export const EXCLUSIVIDAD_MANTENER_MONTO = 3_000_000;

export interface Zona {
  nombre: string;
  /** Otras localidades / formas de escribirla que cuentan como la misma zona. */
  alias: string[];
}

export interface Exclusividad {
  ciudad: string;
  desde: string;
  pedido?: number | string;
  zona?: Zona;
}

export interface BloqueoExclusividad {
  ciudad: string;
  titular: string;
  desde: string;
}

type Meta = { key: string; value: unknown }[] | undefined;

function metaJson(meta: Meta, key: string): Record<string, unknown> | null {
  const raw = meta?.find(m => m.key === key)?.value;
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  try {
    const v = JSON.parse(String(raw));
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
}

/** "Villa Allende, Mendiolaza\nSaldán" → ['Villa Allende', 'Mendiolaza', 'Saldán'], sin repetidos ni vacíos. */
export function parseAliasInput(raw: unknown): string[] {
  const out: string[] = [];
  for (const part of String(raw ?? '').split(/[,;\n]/)) {
    const a = part.trim();
    if (a && !out.some(x => normalizeCiudad(x) === normalizeCiudad(a))) out.push(a);
  }
  return out;
}

function parseZona(v: unknown): Zona | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const nombre = typeof (v as any).nombre === 'string' ? (v as any).nombre.trim() : '';
  if (!nombre) return undefined;
  const alias = Array.isArray((v as any).alias) ? parseAliasInput((v as any).alias.join(',')) : [];
  return { nombre, alias };
}

export function parseExclusividad(meta: Meta): Exclusividad | null {
  const v = metaJson(meta, META_EXCLUSIVIDAD);
  const ciudad = typeof v?.ciudad === 'string' ? v.ciudad.trim() : '';
  if (!v || !ciudad) return null;
  const zona = parseZona(v.zona);
  return { ciudad, desde: String(v.desde ?? ''), ...(v.pedido != null ? { pedido: v.pedido as number | string } : {}), ...(zona ? { zona } : {}) };
}

export function parseBloqueo(meta: Meta): BloqueoExclusividad | null {
  const v = metaJson(meta, META_BLOQUEO);
  const ciudad = typeof v?.ciudad === 'string' ? v.ciudad.trim() : '';
  if (!v || !ciudad) return null;
  return { ciudad, titular: String(v.titular ?? '').trim(), desde: String(v.desde ?? '') };
}

/** "Córdoba Capital", "cordoba", "CÓRDOBA CAPITAL CORDOBA" -> "cordoba". */
export function normalizeCiudad(s: string | null | undefined): string {
  return String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\b(capital|ciudad de|ciudad|cdad)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Misma ciudad, tolerando "Córdoba Capital" vs "Cordoba" o la provincia
 *  pegada ("Córdoba capital Cordoba"). */
export function mismaCiudad(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = normalizeCiudad(a), y = normalizeCiudad(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const ux = [...new Set(x.split(' '))].join(' '), uy = [...new Set(y.split(' '))].join(' ');
  return ux === uy;
}

/** La zona que protege una exclusividad (la ciudad literal si no se definió zona). */
export function zonaDe(e: Exclusividad): Zona {
  return e.zona ?? { nombre: e.ciudad, alias: [] };
}

/** "villa allende cordoba" empieza con "villa allende": la localidad con la provincia pegada. */
function ciudadEmpiezaCon(ciudad: string, nombre: string): boolean {
  const c = normalizeCiudad(ciudad), n = normalizeCiudad(nombre);
  return !!c && !!n && (c === n || c.startsWith(`${n} `));
}

/** ¿Esta ciudad (de una solicitud o cuenta) cae en la zona de la exclusividad? */
export function enZona(e: Exclusividad, ciudad: string | null | undefined): boolean {
  if (!ciudad) return false;
  const z = zonaDe(e);
  const candidatos = [z.nombre, e.ciudad, ...z.alias];
  return candidatos.some(n => mismaCiudad(n, ciudad) || ciudadEmpiezaCon(ciudad, n));
}

/** Primera exclusividad vigente cuya zona cubre la ciudad, o null. */
export function exclusividadEnCiudad<T extends { exclusividad: Exclusividad | null }>(cuentas: T[], ciudad: string | null | undefined): T | null {
  return cuentas.find(c => c.exclusividad && enZona(c.exclusividad, ciudad)) ?? null;
}

/** Mensaje para la cuenta bloqueada (portal y respuesta del pedido). */
export function mensajeBloqueo(b: BloqueoExclusividad): string {
  return `En ${b.ciudad} hay un local con exclusividad de Hype, así que por ahora no podemos tomar pedidos mayoristas de tu cuenta. Escribinos por WhatsApp y lo charlamos.`;
}

/* ─── Evaluación con pedidos pagados ──────────────────────────────────────
   Solo informa. `pagados` son las órdenes completed/processing del cliente
   (las mismas que cuentan como "gastado" en /admin/mayoristas). */

export interface PedidoPagado {
  /** ISO (date_created de Woo). */
  fecha: string;
  total: number;
}

export type EstadoExclusividad = 'sin' | 'elegible' | 'vigente-cumple' | 'vigente-riesgo' | 'vigente-no-cumple';

export interface EvaluacionExclusividad {
  estado: EstadoExclusividad;
  /** Pagado en los últimos 120 días. */
  ventana120: number;
  elegible: boolean;
  cuatrimestre: {
    desde: string; hasta: string;
    total: number;
    /** Meses ya terminados del cuatrimestre sin ningún pedido pagado ("2026-09"). */
    mesesSinPedido: string[];
    diasRestantes: number;
  };
  /** Una línea para el panel. */
  detalle: string;
}

export const ESTADO_EXCLUSIVIDAD_LABEL: Record<EstadoExclusividad, string> = {
  sin: '—',
  elegible: 'Elegible',
  'vigente-cumple': 'Vigente · cumple',
  'vigente-riesgo': 'Vigente · en riesgo',
  'vigente-no-cumple': 'Vigente · no cumple',
};

const DAY = 86_400_000;
const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR');
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const ym = (d: Date) => d.toISOString().slice(0, 7);

/** Cuatrimestre calendario que contiene `hoy` (UTC). */
export function cuatrimestreDe(hoy: Date): { desde: Date; hasta: Date } {
  const y = hoy.getUTCFullYear();
  const m0 = Math.floor(hoy.getUTCMonth() / 4) * 4;
  return { desde: new Date(Date.UTC(y, m0, 1)), hasta: new Date(Date.UTC(y, m0 + 4, 0)) };
}

export function evaluarExclusividad(pagados: PedidoPagado[], tiene: boolean, hoy: Date = new Date()): EvaluacionExclusividad {
  const orders = pagados
    .map(p => ({ t: Date.parse(p.fecha), total: Number(p.total) || 0 }))
    .filter(o => Number.isFinite(o.t) && o.t <= hoy.getTime() + DAY);

  const ventana120 = orders.filter(o => hoy.getTime() - o.t <= EXCLUSIVIDAD_VENTANA_DIAS * DAY).reduce((s, o) => s + o.total, 0);
  const elegible = ventana120 >= EXCLUSIVIDAD_MONTO;

  const { desde, hasta } = cuatrimestreDe(hoy);
  const enCuatri = orders.filter(o => o.t >= desde.getTime() && o.t <= hasta.getTime() + DAY);
  const total = enCuatri.reduce((s, o) => s + o.total, 0);
  const mesesConPedido = new Set(enCuatri.map(o => ym(new Date(o.t))));
  // Solo los meses ya terminados: el mes en curso todavía puede cumplirse.
  const mesesSinPedido: string[] = [];
  for (let m = new Date(desde); ym(m) < ym(hoy); m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1))) {
    if (!mesesConPedido.has(ym(m))) mesesSinPedido.push(ym(m));
  }
  const diasRestantes = Math.max(0, Math.ceil((hasta.getTime() - hoy.getTime()) / DAY));
  const cumpleMonto = total >= EXCLUSIVIDAD_MANTENER_MONTO;

  let estado: EstadoExclusividad;
  let detalle: string;
  if (!tiene) {
    estado = elegible ? 'elegible' : 'sin';
    detalle = elegible
      ? `${fmt(ventana120)} pagados en 120 días: llegó a las condiciones para la exclusividad.`
      : `${fmt(ventana120)} pagados en 120 días (hacen falta ${fmt(EXCLUSIVIDAD_MONTO)}).`;
  } else if (mesesSinPedido.length) {
    estado = 'vigente-no-cumple';
    detalle = `Sin pedidos pagados en ${mesesSinPedido.join(', ')}. Cuatrimestre: ${fmt(total)} de ${fmt(EXCLUSIVIDAD_MANTENER_MONTO)}.`;
  } else if (!cumpleMonto && diasRestantes <= 30) {
    estado = 'vigente-riesgo';
    detalle = `Cuatrimestre: ${fmt(total)} de ${fmt(EXCLUSIVIDAD_MANTENER_MONTO)} y quedan ${diasRestantes} días.`;
  } else {
    estado = 'vigente-cumple';
    detalle = cumpleMonto
      ? `Cuatrimestre: ${fmt(total)}, meses con pedido al día.`
      : `Cuatrimestre en curso: ${fmt(total)} de ${fmt(EXCLUSIVIDAD_MANTENER_MONTO)}, quedan ${diasRestantes} días.`;
  }

  return { estado, ventana120, elegible, cuatrimestre: { desde: ymd(desde), hasta: ymd(hasta), total, mesesSinPedido, diasRestantes }, detalle };
}
