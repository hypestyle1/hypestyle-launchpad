import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Lookbook from '@/components/Lookbook';
import { GENOVESE } from '@/lib/lookbooks/genovese';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Lookbook — Fileteado Porteño x Alfredo Genovese',
  description: 'El Jersey Fileteado de HYPESTYLE® por Alfredo Genovese: filete porteño sobre una camiseta de fútbol, fotografiado y filmado en la cancha de la Villa 31.',
  path: '/lookbook-genovese/',
});

export default function LookbookGenovesePage() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">
        <Lookbook data={GENOVESE} />
      </main>
      <Footer />
    </>
  );
}
