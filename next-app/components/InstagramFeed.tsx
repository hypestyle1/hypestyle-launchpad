import { getInstagramPosts } from '@/lib/instagram';
import InstagramFeedCarousel from './InstagramFeedCarousel';

const POST_COUNT = 12;

/**
 * Sección de comunidad, al pie del home (arriba del footer). Server Component:
 * el token de Instagram se usa acá y no llega nunca al bundle del cliente — lo
 * único que baja son los posts ya resueltos.
 *
 * Si no hay feed —falta el token, venció, o la Graph API falló— devuelve null y
 * la sección no existe: ni hueco, ni cartel de error, ni estado de carga.
 */
export default async function InstagramFeed() {
  const posts = await getInstagramPosts(POST_COUNT);
  if (!posts) return null;

  return <InstagramFeedCarousel posts={posts} />;
}
