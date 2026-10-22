/**
 * Ciudad y provincia a partir del código postal argentino, para autocompletar
 * el checkout: tipeás el CP y se llenan solas (siempre visibles y editables —
 * es un prellenado, no una verdad absoluta).
 *
 * El mapa (data/cp-localidades.json, ~65 KB) se genera con
 * scripts/generar-cp-localidades.mjs a partir del listado de localidades del
 * Correo Argentino, y se carga con import dinámico recién en el primer lookup
 * para no pesar en el bundle inicial.
 *
 * Algunos CPs no tienen ciudad cabecera deducible (ciudad vacía): ahí solo se
 * autocompleta la provincia, que siempre está.
 */
import { normalizeCpAr } from './postal-code';

export interface CpLocalidad {
  ciudad: string;
  provincia: string;
}

type Mapa = Record<string, [ciudad: string, provincia: string]>;
let mapa: Mapa | null = null;

export async function localidadPorCp(cpRaw: string): Promise<CpLocalidad | null> {
  const cp = normalizeCpAr(cpRaw);
  if (!/^\d{4}$/.test(cp)) return null;
  if (!mapa) {
    mapa = (await import('@/data/cp-localidades.json')).default as unknown as Mapa;
  }
  const hit = mapa[cp];
  return hit ? { ciudad: hit[0], provincia: hit[1] } : null;
}
