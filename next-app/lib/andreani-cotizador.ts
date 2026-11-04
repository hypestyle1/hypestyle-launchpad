import { normalizeCpAr } from '@/lib/postal-code';
import type { TarifaEnvio } from '@/lib/envio';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';

/**
 * Tarifas de Andreani para un CP, vía el tarifario del plugin en WordPress.
 * La usan /api/andreani-rates (lo que ve el checkout) y la creación del pedido
 * (lo que se cobra), así que las dos ven las mismas opciones y costos.
 *
 * CACHÉ EN MEMORIA (3/11/2026): cada cotización dispara admin-ajax.php, que
 * arranca WordPress completo (26 plugins + 10 mu-plugins) sin ningún caché.
 * Con Hostinger al 100% de recursos durante el Cyber, ese era el consumidor
 * de CPU más grande correlacionado con tráfico (lsphp admin-ajax al 80%).
 *
 * Decisiones:
 * - La clave es EXACTA (cp|provincia|valor|peso): nunca se sirve la tarifa de
 *   otro carrito, los importes son idénticos a los sin caché.
 * - Checkout y creación del pedido comparten la misma entrada, así que lo
 *   mostrado y lo cobrado no pueden divergir entre sí.
 * - Solo se cachean respuestas buenas (con rates); los errores no envenenan.
 * - Si WP falla y hay una entrada vencida de hace menos de STALE_SI_ERROR_MS,
 *   se sirve esa en vez de matar el checkout (las caídas del 3/11 devolvían
 *   500 acá y el cliente no podía elegir envío). Poner 0 para desactivarlo.
 * - Es memoria por instancia warm de Vercel, no un caché global: el peor caso
 *   es un MISS de más, nunca datos cruzados.
 */
const TTL_MS = 15 * 60 * 1000;
const STALE_SI_ERROR_MS = 2 * 60 * 60 * 1000;
const MAX_ENTRADAS = 500;

type Cotizacion = { rates?: TarifaEnvio[]; error?: string };
export type EstadoCacheAndreani = 'HIT' | 'MISS' | 'STALE';

const cache = new Map<string, { data: Cotizacion; at: number }>();
let hits = 0;
let misses = 0;
let stales = 0;

/** Solo para tests. */
export function _resetCacheAndreani() {
  cache.clear();
  hits = 0;
  misses = 0;
  stales = 0;
}

function guardar(key: string, data: Cotizacion) {
  if (cache.size >= MAX_ENTRADAS) {
    const masVieja = cache.keys().next().value;
    if (masVieja !== undefined) cache.delete(masVieja);
  }
  cache.set(key, { data, at: Date.now() });
}

function log(estado: EstadoCacheAndreani, key: string, edadMs: number) {
  console.log(
    `[andreani-cache] ${estado} ${key} edad=${Math.round(edadMs / 1000)}s acumulado hit/miss/stale=${hits}/${misses}/${stales}`,
  );
}

async function cotizarEnWp(args: {
  cp: string; provincia: string; valor: string; peso: string;
}): Promise<Cotizacion> {
  const body = new URLSearchParams({
    action: 'hype_shipping_rates',
    cp: args.cp,
    provincia: args.provincia,
    valor: args.valor,
    peso: args.peso,
  });
  const res = await fetch(`${WP_URL}/wp-admin/admin-ajax.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    cache: 'no-store',
  });
  return res.json();
}

export async function cotizarAndreaniConEstado(args: {
  cp: string; provincia?: string; valor?: number | string; peso?: number | string;
}): Promise<{ data: Cotizacion; estado: EstadoCacheAndreani }> {
  const cp = normalizeCpAr(args.cp);
  if (!cp) return { data: { error: 'cp requerido' }, estado: 'MISS' };

  const provincia = args.provincia ?? '';
  const valor = String(args.valor ?? '10000');
  const peso = String(args.peso ?? '0.5');
  const key = `${cp}|${provincia}|${valor}|${peso}`;

  const guardada = cache.get(key);
  const edad = guardada ? Date.now() - guardada.at : 0;
  if (guardada && edad < TTL_MS) {
    hits++;
    log('HIT', key, edad);
    return { data: guardada.data, estado: 'HIT' };
  }

  try {
    const data = await cotizarEnWp({ cp, provincia, valor, peso });
    if (data && !data.error && Array.isArray(data.rates) && data.rates.length > 0) {
      guardar(key, data);
    }
    misses++;
    log('MISS', key, 0);
    return { data, estado: 'MISS' };
  } catch (err) {
    if (guardada && edad < STALE_SI_ERROR_MS) {
      stales++;
      log('STALE', key, edad);
      return { data: guardada.data, estado: 'STALE' };
    }
    throw err;
  }
}

export async function cotizarAndreani(args: {
  cp: string; provincia?: string; valor?: number | string; peso?: number | string;
}): Promise<Cotizacion> {
  return (await cotizarAndreaniConEstado(args)).data;
}
