import { getInstagramPosts } from '@/lib/instagram';
import InstagramFeedCarousel from './InstagramFeedCarousel';

const IG_PROFILE_URL = 'https://instagram.com/hypestylearg';
const POST_COUNT = 12;

/**
 * Sección de comunidad, al pie del home (arriba del footer). Server Component:
 * el token de Instagram se usa acá y no llega nunca al bundle del cliente.
 *
 * Si no hay feed —falta el token, venció, o la Graph API falló— devuelve null y
 * la sección no existe: ni hueco, ni cartel de error, ni estado de carga.
 */
export default async function InstagramFeed() {
  const posts = await getInstagramPosts(POST_COUNT);
  if (!posts) return null;

  return (
    <section className="w-full pt-10 md:pt-14 pb-10 md:pb-14" aria-labelledby="instagram-feed-title">
      <div className="max-w-[1400px] mx-auto px-4 flex items-center justify-between mb-6">
        <h2 id="instagram-feed-title" className="text-xl md:text-2xl font-bold uppercase tracking-tight">
          Seguinos en Instagram
        </h2>
        <a
          href={IG_PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="nav-link text-[12px] font-medium uppercase tracking-[0.1em] text-muted-foreground pb-0.5"
        >
          @hypestylearg
        </a>
      </div>

      {/* A sangre completa, como el resto de los bloques editoriales del pie. */}
      <InstagramFeedCarousel posts={posts} />
    </section>
  );
}
