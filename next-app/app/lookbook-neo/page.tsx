import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Lookbook from '@/components/Lookbook';
import { NEO } from '@/lib/lookbooks/neo';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Lookbook — CULTO x Neo Pistea',
  description: 'El merch oficial de CULTO: la colaboración de HYPESTYLE® con Neo Pistea, en el shooting de Buenos Aires y en vivo en Mar del Plata.',
  path: '/lookbook-neo/',
});

export default function LookbookNeoPage() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">
        <Lookbook data={NEO} />
      </main>
      <Footer />
    </>
  );
}
