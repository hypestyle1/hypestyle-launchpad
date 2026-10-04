import type { Metadata } from 'next';

// Preventa privada: nunca indexada ni archivada, y sin seguir links (las fichas
// privadas no tienen que descubrirse desde acá). Además del meta, next.config
// manda X-Robots-Tag y Cache-Control: private, no-store para todo /private-access.
// No va en robots.txt con Disallow: una URL bloqueada no se rastrea y el
// noindex no se leería nunca (ver public/robots.txt).
export const metadata: Metadata = {
  title: 'Private Access | SS27',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
};

export default function PrivateAccessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
