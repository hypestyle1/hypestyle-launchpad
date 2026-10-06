// Drop nuevo en el portal mayorista: la colección de Private Access (SS27
// Part 01) entra al catálogo de /mayoristas antes de salir al público.
//
// Los productos de la colección están PRIVADOS en Woo hasta la apertura
// (lib/private-access/config.ts), así que la query pública de WPGraphQL no
// los ve. Se leen del mu-plugin de Private Access (server-to-server, con el
// secreto), que devuelve los privados y publicados del tag de la colección
// con el mismo shape que WPGraphQL. Al abrir al público quedan publicados y
// siguen apareciendo por la query normal; el drop solo les suma el badge.
//
// La ventana la manda la misma config de Private Access: si se pausa
// (force_off) o se deshabilita, la colección sale del portal mayorista también.

import { isMockMode, fmtDayMonth, type PrivateAccessConfig } from './private-access/config';

/** Días que el drop sigue destacado (banner, popup, badge) después de la apertura al público. */
export const DROP_HIGHLIGHT_DAYS = 21;

export interface MayoristaDropInfo {
  /** Tag de Woo de la colección: lo usa el pedido para aceptar los privados. */
  tag: string;
  name: string;
  subtitle: string;
  /** `11.10` */
  publicOpenLabel: string;
  /** true mientras todavía no salió al público. */
  beforePublic: boolean;
  /** Clave del popup (una vez por drop y por navegador). */
  key: string;
}

/** ¿La colección está disponible para mayoristas? Desde el arranque de Private Access, mientras no esté pausada. */
export function isDropOpenForMayoristas(config: PrivateAccessConfig, now = Date.now()): boolean {
  if (config.override === 'force_off') return false;
  if (!config.enabled && config.override !== 'force_on' && !isMockMode()) return false;
  return now >= new Date(config.startAt).getTime() || config.override === 'force_on';
}

/** ¿Se sigue destacando como novedad? Hasta DROP_HIGHLIGHT_DAYS después de la apertura al público. */
export function isDropHighlighted(config: PrivateAccessConfig, now = Date.now()): boolean {
  if (!isDropOpenForMayoristas(config, now)) return false;
  return now < new Date(config.publicOpenAt).getTime() + DROP_HIGHLIGHT_DAYS * 86_400_000;
}

export function dropInfo(config: PrivateAccessConfig, now = Date.now()): MayoristaDropInfo {
  return {
    tag: config.collectionTag,
    name: config.collectionName,
    subtitle: config.collectionSubtitle,
    publicOpenLabel: fmtDayMonth(config.publicOpenAt),
    beforePublic: now < new Date(config.publicOpenAt).getTime(),
    key: config.collectionTag,
  };
}

/**
 * Un producto leído por WC REST (`status`, `tags[].slug`) que está privado
 * pero pertenece a la colección abierta para mayoristas cuenta como publicado.
 * Cualquier otro privado/borrador sigue afuera (ver mayorista-availability).
 */
export function isDropPrivateProduct(product: { status?: string | null; tags?: { slug?: string }[] | null }, dropTag: string | null | undefined): boolean {
  if (!dropTag || product.status !== 'private') return false;
  return (product.tags ?? []).some(t => t?.slug === dropTag);
}
