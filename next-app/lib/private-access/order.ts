// Marca de Private Access en el payload de create-order. Lo que mande el
// navegador en `privateAccess` se descarta siempre; solo se agrega si la
// cookie firmada es válida. El mu-plugin lo lee en hype_order_before_totals y
// guarda el meta `_hs_private_access` en el pedido.

import { verifySessionToken } from './session';

export async function withPrivateAccess<T extends Record<string, any>>(body: T, cookieValue: string | undefined | null): Promise<Omit<T, 'privateAccess'> & { privateAccess?: { memberId: number } }> {
  const { privateAccess: _ignored, ...rest } = body ?? ({} as T);
  const session = await verifySessionToken(cookieValue);
  return session ? { ...rest, privateAccess: { memberId: session.memberId } } : rest;
}
