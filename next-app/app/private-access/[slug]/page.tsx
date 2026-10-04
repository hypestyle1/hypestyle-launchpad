import { redirect } from 'next/navigation';
import PrivateFicha from '@/components/private-access/PrivateFicha';
import { PRIVATE_ACCESS_PATH, PRIVATE_SLUG_RE, gateUrlFor, isPublicOpen } from '@/lib/private-access/config';
import { fetchPrivateProductDetail, fetchPrivateProducts, labelsFor, readPrivateAccessState } from '@/lib/private-access/server';

// Depende de la cookie de cada visitante: siempre dinámica, nunca cacheada.
// Los headers (no-store, X-Robots-Tag) van en next.config.mjs.
export const dynamic = 'force-dynamic';

/**
 * Ficha privada. Todas las verificaciones corren en el servidor ANTES de pedir
 * el producto; si alguna falla, se redirige sin haber traído ni renderizado
 * ningún dato. Compartir el link no da acceso: quien lo abre sin sesión cae al
 * gate y vuelve acá solo si su Instagram está en la lista.
 *
 *  1. Si ya abrió al público → la ficha pública (/producto/<slug>).
 *  2. Campaña activa (fecha + switch + override del panel).
 *  3. Cookie de sesión presente, con firma HMAC válida y sin vencer.
 *  4. Slug con formato válido.
 *  5. Producto de la colección: el mu-plugin solo devuelve productos con el
 *     tag de la colección (privados o publicados). Otro slug → no existe acá.
 */
export default async function PrivateProductPage({ params }: { params: { slug: string } }) {
  const { active, session, config } = await readPrivateAccessState();

  if (isPublicOpen(config)) redirect(`/producto/${params.slug}/`);
  if (!active || !session) redirect(gateUrlFor(params.slug));
  if (!PRIVATE_SLUG_RE.test(params.slug)) redirect(PRIVATE_ACCESS_PATH);

  const [product, all] = await Promise.all([fetchPrivateProductDetail(params.slug), fetchPrivateProducts(config)]);
  if (!product) redirect(PRIVATE_ACCESS_PATH);

  return (
    <PrivateFicha
      product={product}
      related={all.filter(p => p.slug !== product.slug)}
      collectionName={config.collectionName}
      saleEndsLabel={labelsFor(config).saleEndsLabel}
    />
  );
}
