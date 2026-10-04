import { redirect } from 'next/navigation';
import PrivateGate from '@/components/private-access/PrivateGate';
import PrivateCollection from '@/components/private-access/PrivateCollection';
import { safeReturnTo } from '@/lib/private-access/config';
import { fetchPrivateProducts, labelsFor, readPrivateAccessState } from '@/lib/private-access/server';

// Depende de la cookie de cada visitante: siempre dinámica, nunca cacheada.
export const dynamic = 'force-dynamic';

export default async function PrivateAccessPage({ searchParams }: { searchParams: { returnTo?: string } }) {
  const { active, session, config } = await readPrivateAccessState();
  const labels = labelsFor(config);
  // Solo /private-access/<slug>: el parámetro no sirve para mandar a otro lado.
  const returnTo = safeReturnTo(searchParams?.returnTo);

  // Sin sesión válida no se piden los productos: el catálogo no existe para
  // quien no desbloqueó, aunque conozca la URL.
  if (!active || !session) {
    return <PrivateGate active={active} returnTo={returnTo} {...labels} />;
  }

  // Ya tiene sesión y venía de un link a un producto: directo al producto.
  if (returnTo) redirect(returnTo);

  const products = await fetchPrivateProducts(config);
  return <PrivateCollection products={products} saleEndsAt={config.saleEndsAt} {...labels} />;
}
