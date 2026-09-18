import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LookbookFW26 from '@/components/LookbookFW26';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Lookbook FW26',
  description: 'La colección FW26 de HYPESTYLE® puesta, en Rio de Janeiro. Cada foto con acceso directo al producto.',
  path: '/lookbook-fw26/',
});

export default function LookbookFW26Page() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">
        <LookbookFW26 />
      </main>
      <Footer />
    </>
  );
}
