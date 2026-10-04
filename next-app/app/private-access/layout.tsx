import type { Metadata } from 'next';

// Preventa privada: nunca indexada. follow para que el crawler siga los links
// del navbar y el footer. No va en robots.txt con Disallow: una URL bloqueada
// no se rastrea y el noindex no se leería nunca (ver public/robots.txt).
export const metadata: Metadata = {
  title: 'Private Access | SS27',
  robots: { index: false, follow: true },
};

export default function PrivateAccessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
