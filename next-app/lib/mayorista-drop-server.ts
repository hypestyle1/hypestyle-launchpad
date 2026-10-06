// Lado servidor del drop mayorista (ver lib/mayorista-drop.ts): config de
// Private Access + nodos de la colección leídos del mu-plugin.

import { getPrivateAccessConfig } from './private-access/server';
import { wpGet } from './private-access/store';
import { isMockMode } from './private-access/config';
import { dropInfo, isDropHighlighted, isDropOpenForMayoristas, type MayoristaDropInfo } from './mayorista-drop';

export interface MayoristaDrop {
  info: MayoristaDropInfo;
  /** Destacado en el portal (banner, popup, badge). */
  highlighted: boolean;
  /** Nodos de la colección en el shape de WPGraphQL (privados y publicados). */
  nodes: any[];
}

/**
 * Colección abierta para mayoristas, o null si no hay ninguna. Cacheada 60 s
 * como el resto del catálogo. Si WordPress falla, null: el portal sigue con
 * el catálogo publicado de siempre.
 */
export async function fetchMayoristaDrop(): Promise<MayoristaDrop | null> {
  // El mock de Private Access tiene productos ficticios: no van al portal mayorista.
  if (isMockMode()) return null;
  const config = await getPrivateAccessConfig();
  if (!isDropOpenForMayoristas(config)) return null;
  const r = await wpGet<{ products: { nodes: any[] } }>('/products', {}, { revalidate: 60 });
  if (r.ok === false) {
    console.error('[mayorista-drop] products', r.status, r.error);
    return null;
  }
  const nodes = r.data.products?.nodes ?? [];
  if (!nodes.length) return null;
  return { info: dropInfo(config), highlighted: isDropHighlighted(config), nodes };
}

/** Solo el tag de la colección abierta (para el pedido y la disponibilidad), o null. */
export async function mayoristaDropTag(): Promise<string | null> {
  if (isMockMode()) return null;
  const config = await getPrivateAccessConfig();
  return isDropOpenForMayoristas(config) ? config.collectionTag : null;
}
