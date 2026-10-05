// Exclusividad por ciudad (política del 05/10/2026, ver HOW_IT_WORKS_SECTIONS
// en lib/mayorista-copy.ts):
//   - Se gana con $3.000.000 en pedidos pagados dentro de 120 días.
//   - Se sostiene con al menos un pedido pagado por mes y $3.000.000 por
//     cuatrimestre.
//   - Mientras dura: no se aprueban locales nuevos en esa ciudad y las cuentas
//     que ya existían ahí no pueden hacer pedidos.
// Se administra a mano. Vive en metas del customer de Woo, sin guión bajo
// (WC descarta los meta protegidos al leer/escribir customers por REST):
//   mayorista_exclusividad          en la cuenta titular
//   mayorista_bloqueo_exclusividad  en las cuentas de esa ciudad que no pueden pedir
// Los dos son JSON en string.

export const META_EXCLUSIVIDAD = 'mayorista_exclusividad';
export const META_BLOQUEO = 'mayorista_bloqueo_exclusividad';

export const EXCLUSIVIDAD_MONTO = 3_000_000;
export const EXCLUSIVIDAD_VENTANA_DIAS = 120;

export interface Exclusividad {
  ciudad: string;
  desde: string;
  pedido?: number | string;
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

export function parseExclusividad(meta: Meta): Exclusividad | null {
  const v = metaJson(meta, META_EXCLUSIVIDAD);
  const ciudad = typeof v?.ciudad === 'string' ? v.ciudad.trim() : '';
  if (!v || !ciudad) return null;
  return { ciudad, desde: String(v.desde ?? ''), ...(v.pedido != null ? { pedido: v.pedido as number | string } : {}) };
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

/** Primera exclusividad vigente que coincide con la ciudad, o null. */
export function exclusividadEnCiudad<T extends { exclusividad: Exclusividad | null }>(cuentas: T[], ciudad: string | null | undefined): T | null {
  return cuentas.find(c => c.exclusividad && mismaCiudad(c.exclusividad.ciudad, ciudad)) ?? null;
}

/** Mensaje para la cuenta bloqueada (portal y respuesta del pedido). */
export function mensajeBloqueo(b: BloqueoExclusividad): string {
  return `En ${b.ciudad} hay un local con exclusividad de Hype, así que por ahora no podemos tomar pedidos mayoristas de tu cuenta. Escribinos por WhatsApp y lo charlamos.`;
}
