import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Lookbook from '@/components/Lookbook';
import { MIR } from '@/lib/lookbooks/mir';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Lookbook — La Ciudad del Pop x Mir Nicolás',
  description: 'La Ciudad del Pop: la colaboración de HYPESTYLE® con Mir Nicolás. Arte inspirado en su universo visual y en la cultura urbana japonesa, con el film de la colección.',
  path: '/lookbook-mir/',
});

export default function LookbookMirPage() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">
        <Lookbook data={MIR} />
      </main>
      <Footer />
    </>
  );
}
