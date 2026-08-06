import type { MetadataRoute } from 'next';
import { fetchProductSlugs } from '@/lib/wp-products';

const BASE_URL = 'https://hypestyle.com.ar';

const STATIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '/', changeFrequency: 'daily', priority: 1 },
  { path: '/productos/', changeFrequency: 'daily', priority: 0.9 },
  { path: '/new-in/', changeFrequency: 'daily', priority: 0.8 },
  { path: '/best-sellers/', changeFrequency: 'daily', priority: 0.8 },
  { path: '/novedades/', changeFrequency: 'daily', priority: 0.7 },
  { path: '/special-prices/', changeFrequency: 'daily', priority: 0.7 },
  { path: '/back-in-stock/', changeFrequency: 'daily', priority: 0.6 },
  { path: '/looks/', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/colecciones/', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/colecciones/faith-is-the-real-hype/', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/colecciones/fw26/', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/colecciones/summer-26/', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/colecciones/no-love-only-style/', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/colecciones/pink-set-drop/', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/colecciones/camo-set-drop/', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/colecciones/race/', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/colecciones/regular-tees/', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/colecciones/mas-hype/', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/arriba/', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/abajo/', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/accesorios/', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/sets/', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/tees/', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/hoodies/', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/pants/', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/jorts/', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/worldwide/', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/reviews/', changeFrequency: 'weekly', priority: 0.5 },
  { path: '/nosotros/', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/faqs/', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/contacto/', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/politicas-de-devolucion/', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/politica-de-privacidad/', changeFrequency: 'yearly', priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const productSlugs = await fetchProductSlugs();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const productEntries: MetadataRoute.Sitemap = productSlugs.map(slug => ({
    url: `${BASE_URL}/producto/${slug}/`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.6,
  }));

  return [...staticEntries, ...productEntries];
}
