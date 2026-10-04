import { notFound, redirect } from 'next/navigation';
import PrivateGate from '@/components/private-access/PrivateGate';
import PrivateProductView from '@/components/private-access/PrivateProductView';
import { fmtDayMonth, isPublicOpen } from '@/lib/private-access/config';
import { fetchPrivateProduct, fetchPrivateProducts, readPrivateAccessState } from '@/lib/private-access/server';

export const dynamic = 'force-dynamic';

export default async function PrivateProductPage({ params }: { params: { slug: string } }) {
  const { active, session, config } = await readPrivateAccessState();

  // Después de la apertura pública los links compartidos siguen vivos.
  if (isPublicOpen(config)) redirect(`/producto/${params.slug}/`);

  const labels = {
    collectionName: config.collectionName,
    collectionSubtitle: config.collectionSubtitle,
    discountPct: config.discountPct,
    saleEndsLabel: fmtDayMonth(config.saleEndsAt),
    publicOpenLabel: fmtDayMonth(config.publicOpenAt),
  };

  // Sin sesión no se revela ni si el producto existe.
  if (!active || !session) {
    return <PrivateGate active={active} {...labels} />;
  }

  const [product, all] = await Promise.all([fetchPrivateProduct(params.slug), fetchPrivateProducts()]);
  if (!product) notFound();

  const related = all.filter(p => p.slug !== product.slug);
  return (
    <PrivateProductView
      product={product}
      related={related}
      collectionName={config.collectionName}
      discountPct={config.discountPct}
      saleEndsLabel={labels.saleEndsLabel}
    />
  );
}
