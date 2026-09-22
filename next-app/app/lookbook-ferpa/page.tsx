import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Lookbook from '@/components/Lookbook';
import { FERPA } from '@/lib/lookbooks/ferpa';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Lookbook — Tie Dye Hoodie Drop x Ferpa',
  description: 'Tie Dye Hoodie Drop: la colaboración de HYPESTYLE® con Fer Palacio en 2020. Cuarenta buzos exclusivos que se repartieron entre los streamers y creadores del momento.',
  path: '/lookbook-ferpa/',
});

export default function LookbookFerpaPage() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">
        <Lookbook data={FERPA} />
      </main>
      <Footer />
    </>
  );
}
