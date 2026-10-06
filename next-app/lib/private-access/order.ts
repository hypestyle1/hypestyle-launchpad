// Private Access en la creación del pedido (create-order-gocuotas).
//
// Con una sesión válida de Mejores Amigos (cookie firmada, preventa activa):
//  - los precios de la colección privada se suman al catálogo del servidor,
//    así el pedido se puede tasar (el catálogo público no ve productos privados);
//  - el pedido lleva el meta `_hs_private_access` (métricas del panel).
// Sin sesión no pasa nada de eso: un producto privado sigue sin precio y el
// pedido se rechaza, aunque alguien conozca el slug y arme la request a mano.

import { PRIVATE_ACCESS_COOKIE, isPrivateAccessActive } from './config';
import { verifySessionToken } from './session';
import { fetchPrivateProducts, getPrivateAccessConfig } from './server';

export interface PrivateAccessOrderContext {
  memberId: number;
  collection: string;
  precios: Map<string, number>;
}

export async function privateAccessForOrder(cookieValue: string | undefined | null): Promise<PrivateAccessOrderContext | null> {
  const session = await verifySessionToken(cookieValue);
  if (!session) return null;
  const config = await getPrivateAccessConfig();
  if (!isPrivateAccessActive(config)) return null;
  const productos = await fetchPrivateProducts(config);
  const precios = new Map<string, number>();
  // Las "Próximamente" no se venden en la preventa: sin precio, el pedido las rechaza.
  for (const p of productos) if (p.slug && p.price > 0 && !p.comingSoon) precios.set(p.slug, p.price);
  return { memberId: session.memberId, collection: config.collectionTag, precios };
}

/** Meta del pedido de Woo (REST acepta metas con guión bajo en pedidos). */
export function privateAccessMeta(ctx: PrivateAccessOrderContext | null): { key: string; value: string } | null {
  if (!ctx) return null;
  return { key: '_hs_private_access', value: JSON.stringify({ memberId: ctx.memberId, collection: ctx.collection }) };
}
