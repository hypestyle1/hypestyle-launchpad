import PrivateGate from '@/components/private-access/PrivateGate';
import PrivateCollection from '@/components/private-access/PrivateCollection';
import { fmtDayMonth } from '@/lib/private-access/config';
import { fetchPrivateProducts, readPrivateAccessState } from '@/lib/private-access/server';

// Depende de la cookie de cada visitante: siempre dinámica, nunca cacheada.
export const dynamic = 'force-dynamic';

export default async function PrivateAccessPage() {
  const { active, session, config } = await readPrivateAccessState();
  const labels = {
    collectionName: config.collectionName,
    collectionSubtitle: config.collectionSubtitle,
    discountPct: config.discountPct,
    saleEndsLabel: fmtDayMonth(config.saleEndsAt),
    publicOpenLabel: fmtDayMonth(config.publicOpenAt),
  };

  if (!active || !session) {
    return <PrivateGate active={active} {...labels} />;
  }

  const products = await fetchPrivateProducts();
  return <PrivateCollection products={products} saleEndsAt={config.saleEndsAt} {...labels} />;
}
