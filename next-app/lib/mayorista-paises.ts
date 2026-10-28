/**
 * Países desde los que se puede pedir acceso al catálogo mayorista.
 *
 * Hasta el 28/10/2026 el alta era solo argentina: el formulario pedía CUIT de
 * 11 dígitos y el servidor grababa `country: 'AR'` fijo. Con eso, un local de
 * Chile no podía ni registrarse — se quedaba trabado en "El CUIT tiene que
 * tener 11 números" sin manera de seguir. Ahora el país se elige y de él
 * salen tres cosas: cómo se llama el identificador fiscal, cómo se valida, y
 * cómo se llama la división territorial.
 *
 * El CUIT argentino se sigue validando igual de estricto; afuera solo se pide
 * que haya algo razonable, porque cada país escribe el suyo distinto (RUT
 * chileno con dígito verificador, RUC, NIT, EIN, CIF…).
 */

export interface PaisMayorista {
  /** ISO-3166 alpha-2, que es lo que guarda `billing.country` de WooCommerce. */
  code: string;
  nombre: string;
  /** Nombre del identificador fiscal en ese país. */
  taxLabel: string;
  /** Rótulo de la división territorial (el `billing.state` de Woo). */
  regionLabel: string;
}

export const PAIS_DEFAULT = 'AR';

export const PAISES_MAYORISTA: PaisMayorista[] = [
  { code: 'AR', nombre: 'Argentina',      taxLabel: 'CUIT',            regionLabel: 'Provincia' },
  { code: 'CL', nombre: 'Chile',          taxLabel: 'RUT',             regionLabel: 'Región' },
  { code: 'UY', nombre: 'Uruguay',        taxLabel: 'RUT',             regionLabel: 'Departamento' },
  { code: 'PY', nombre: 'Paraguay',       taxLabel: 'RUC',             regionLabel: 'Departamento' },
  { code: 'BO', nombre: 'Bolivia',        taxLabel: 'NIT',             regionLabel: 'Departamento' },
  { code: 'PE', nombre: 'Perú',           taxLabel: 'RUC',             regionLabel: 'Región' },
  { code: 'BR', nombre: 'Brasil',         taxLabel: 'CNPJ',            regionLabel: 'Estado' },
  { code: 'CO', nombre: 'Colombia',       taxLabel: 'NIT',             regionLabel: 'Departamento' },
  { code: 'MX', nombre: 'México',         taxLabel: 'RFC',             regionLabel: 'Estado' },
  { code: 'US', nombre: 'Estados Unidos', taxLabel: 'EIN / Tax ID',    regionLabel: 'Estado' },
  { code: 'ES', nombre: 'España',         taxLabel: 'CIF / NIF',       regionLabel: 'Provincia' },
  { code: 'XX', nombre: 'Otro país',      taxLabel: 'Identificación fiscal', regionLabel: 'Provincia o estado' },
];

const BY_CODE = Object.fromEntries(PAISES_MAYORISTA.map(p => [p.code, p])) as Record<string, PaisMayorista>;

/** El país elegido, o Argentina si llega cualquier otra cosa. */
export function paisMayorista(code: unknown): PaisMayorista {
  const up = typeof code === 'string' ? code.trim().toUpperCase() : '';
  return BY_CODE[up] ?? BY_CODE[PAIS_DEFAULT];
}

/** Solo dígitos: el CUIT se escribe con guiones y puntos y después no se puede cruzar con la facturación. */
export function normalizeCuit(v: string): string {
  return v.replace(/\D/g, '');
}

/**
 * El identificador fiscal tal como se guarda. En Argentina, solo los 11
 * dígitos; afuera, lo que escribió el comercio sin espacios de más (el RUT
 * chileno lleva guión y dígito verificador, y perderlo sería perder el dato).
 */
export function normalizeTaxId(pais: unknown, v: string): string {
  return paisMayorista(pais).code === 'AR' ? normalizeCuit(v) : v.trim();
}

/** Mensaje de error, o null si el identificador sirve. Lo usan el formulario y el servidor. */
export function validarTaxId(pais: unknown, v: string): string | null {
  const p = paisMayorista(pais);
  const valor = normalizeTaxId(p.code, v);
  // 11 dígitos: 2 de tipo, 8 de documento y 1 verificador.
  if (p.code === 'AR') return valor.length === 11 ? null : 'El CUIT tiene que tener 11 números';
  if (valor.length < 5) return `Escribí tu ${p.taxLabel}`;
  return null;
}
