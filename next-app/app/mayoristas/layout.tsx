import type { Metadata } from 'next';
import { MayoristaCartProvider } from '@/context/MayoristaCartContext';

export const metadata: Metadata = {
  title: 'Mayoristas — Hype.',
  robots: { index: false, follow: false, nocache: true },
};

export default function MayoristasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <MayoristaCartProvider>
        {children}
      </MayoristaCartProvider>
    </div>
  );
}
