import { notFound, redirect } from 'next/navigation';
import PrivateGate from '@/components/private-access/PrivateGate';
import PrivateFicha from '@/components/private-access/PrivateFicha';
import { isPublicOpen } from '@/lib/private-access/config';
import { fetchPrivateProductDetail, fetchPrivateProducts, labelsFor, readPrivateAccessState } from '@/lib/private-access/server';

export const dynamic = 'force-dynamic';

export default async function PrivateProductPage({ params }: { params: { slug: string } }) {
  const { active, session, config } = await readPrivateAccessState();

  // Después de la apertura pública los links compartidos siguen vivos.
  if (isPublicOpen(config)) redirect(`/producto/${params.slug}/`);

  const labels = labelsFor(config);

  // Sin sesión no se pide el producto ni se revela si existe: se muestra el
  // gate en esta misma URL, y al desbloquear se recarga y aparece la ficha.
  if (!active || !session) {
    return <PrivateGate active={active} {...labels} />;
  }

  const [product, all] = await Promise.all([fetchPrivateProductDetail(params.slug), fetchPrivateProducts(config)]);
  if (!product) notFound();

  return (
    <PrivateFicha
      product={product}
      related={all.filter(p => p.slug !== product.slug)}
      collectionName={config.collectionName}
      saleEndsLabel={labels.saleEndsLabel}
    />
  );
}
