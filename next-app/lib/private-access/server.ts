// Lado servidor de Private Access: sesión desde las cookies del request y
// catálogo privado. Hoy el catálogo es el mock; mañana `fetchPrivateProducts`
// y `fetchPrivateProduct` pegan al mu-plugin con el secreto (server-to-server,
// nunca desde el browser) y normalizan con fromWPNode().

import { cookies } from 'next/headers';
import { PRIVATE_ACCESS_COOKIE, getPrivateAccessConfig, isMockMode, isPrivateAccessActive } from './config';
import { verifySessionToken, type PrivateAccessSession } from './session';
import { getMockProduct, getMockProducts, type PrivateProduct } from './mock';

export interface PrivateAccessState {
  active: boolean;
  session: PrivateAccessSession | null;
  config: ReturnType<typeof getPrivateAccessConfig>;
}

/** Lee la cookie del request actual. Vuelve dinámica a la página que lo llama (a propósito). */
export async function readPrivateAccessState(): Promise<PrivateAccessState> {
  const config = getPrivateAccessConfig();
  const active = isPrivateAccessActive(config);
  const token = cookies().get(PRIVATE_ACCESS_COOKIE)?.value;
  const session = active ? await verifySessionToken(token) : null;
  return { active, session, config };
}

export async function fetchPrivateProducts(): Promise<PrivateProduct[]> {
  if (isMockMode()) return getMockProducts();
  // TODO (mañana): GET {WP}/wp-json/hypestyle/v1/private-access/products con X-Hypestyle-Secret.
  return [];
}

export async function fetchPrivateProduct(slug: string): Promise<PrivateProduct | undefined> {
  if (isMockMode()) return getMockProduct(slug);
  // TODO (mañana): GET {WP}/wp-json/hypestyle/v1/private-access/product?slug= con X-Hypestyle-Secret.
  return undefined;
}
