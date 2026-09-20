import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Lookbook from '@/components/Lookbook';
import { FAITH } from '@/lib/lookbooks/faith';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Lookbook — Faith Is The Real Hype',
  description: 'La colección Faith Is The Real Hype de HYPESTYLE® puesta, en Buenos Aires. Cada foto con acceso directo al producto.',
  path: '/lookbook-faith/',
});

export default function LookbookFaithPage() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">
        <Lookbook data={FAITH} />
      </main>
      <Footer />
    </>
  );
}
