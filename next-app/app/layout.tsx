import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import CartDrawer from '@/components/CartDrawer';
import WishlistDrawer from '@/components/WishlistDrawer';
import CookieBanner from '@/components/CookieBanner';
import LocaleSuggestion from '@/components/LocaleSuggestion';
import LoadingScreen from '@/components/LoadingScreen';
import MetaPixel from '@/components/MetaPixel';

export const metadata: Metadata = {
  title: 'Hypestyle — Streetwear Drops Limitados',
  description: 'Drops limitados. Envíos a todo el mundo.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>
          <LoadingScreen />
          <CartDrawer />
          <WishlistDrawer />
          <LocaleSuggestion />
          <CookieBanner />
          <MetaPixel />
          {children}
        </Providers>
      </body>
    </html>
  );
}
