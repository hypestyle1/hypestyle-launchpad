import type { Metadata } from 'next';
import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RioEditorial from '@/components/RioEditorial';

// Ruta de trabajo para ver la editorial de Rio en contexto (navbar y footer
// reales) antes de meterla en el home. No se linkea desde ningún lado y no se
// indexa. Cuando se apruebe, se saca la ruta y la sección entra en app/page.tsx.
export const metadata: Metadata = {
  title: 'Rio — prueba de sección',
  robots: { index: false, follow: false },
};

export default function RioIdeasPage() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">
        <RioEditorial />
      </main>
      <Footer />
    </>
  );
}
