import PrivateGate from '@/components/private-access/PrivateGate';
import PrivateCollection from '@/components/private-access/PrivateCollection';
import { fetchPrivateProducts, labelsFor, readPrivateAccessState } from '@/lib/private-access/server';

// Depende de la cookie de cada visitante: siempre dinámica, nunca cacheada.
export const dynamic = 'force-dynamic';

export default async function PrivateAccessPage() {
  const { active, session, config } = await readPrivateAccessState();
  const labels = labelsFor(config);

  // Sin sesión válida no se piden los productos: el catálogo no existe para
  // quien no desbloqueó, aunque conozca la URL.
  if (!active || !session) {
    return <PrivateGate active={active} {...labels} />;
  }

  const products = await fetchPrivateProducts(config);
  return <PrivateCollection products={products} saleEndsAt={config.saleEndsAt} {...labels} />;
}
