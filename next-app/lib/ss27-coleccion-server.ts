// Lado servidor de /colecciones/ss27: config de Private Access (cacheada 60 s)
// y, solo si ya abrió, los productos de la colección leídos del mu-plugin
// (mismo endpoint que el portal mayorista, orden menu_order de Woo).
// Antes de la apertura ni se piden: la página no lista nada privado.

import { getPrivateAccessConfig } from './private-access/server';
import { isPrivateAccessActive, fmtWeekdayDayMonth, type PrivateAccessConfig } from './private-access/config';
import { wpGet } from './private-access/store';
import { previewOverride, ss27State, toSs27Products, type Ss27Product, type Ss27State } from './ss27-coleccion';

export interface Ss27Page {
  state: Ss27State;
  config: PrivateAccessConfig;
  /** Preventa de Mejores Amigos en curso (para el bloque que lleva a /private-access). */
  privateAccessActive: boolean;
  /** `domingo 11.10` */
  openLabel: string;
  products: Ss27Product[];
}

async function fetchCollectionNodes(): Promise<any[]> {
  const r = await wpGet<{ products: { nodes: any[] } }>('/products', {}, { revalidate: 60 });
  if (r.ok === false) {
    console.error('[ss27-coleccion] products', r.status, r.error);
    return [];
  }
  return r.data.products?.nodes ?? [];
}

export async function loadSs27Page(now = Date.now()): Promise<Ss27Page> {
  const config = await getPrivateAccessConfig();
  const preview = previewOverride();
  const base = {
    config,
    privateAccessActive: isPrivateAccessActive(config, now),
    openLabel: fmtWeekdayDayMonth(config.publicOpenAt),
  };

  if (preview === 'before') return { ...base, state: 'before', products: [] };
  if (preview === 'open') {
    const products = toSs27Products(await fetchCollectionNodes(), true);
    return { ...base, state: products.length ? 'open' : 'opening', products };
  }

  if (ss27State(config, 0, now) === 'before') return { ...base, state: 'before', products: [] };
  const products = toSs27Products(await fetchCollectionNodes());
  return { ...base, state: ss27State(config, products.length, now), products };
}
