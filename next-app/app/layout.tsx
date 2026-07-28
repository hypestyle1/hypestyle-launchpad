import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import CartDrawer from '@/components/CartDrawer';
import WishlistDrawer from '@/components/WishlistDrawer';
import CookieBanner from '@/components/CookieBanner';
import LocaleSuggestion from '@/components/LocaleSuggestion';
import LoadingScreen from '@/components/LoadingScreen';
import MetaPixel from '@/components/MetaPixel';
import WhatsAppButton from '@/components/WhatsAppButton';
import ReviewsDrawer from '@/components/reviews/ReviewsDrawer';
import FlashSaleBar from '@/components/FlashSaleBar';
import Promo3x2Bar from '@/components/Promo3x2Bar';
import PromoChampionBar from '@/components/PromoChampionBar';
import ChampionTakeover from '@/components/ChampionTakeover';

const OG_DESCRIPTION = '© HYPESTYLE 2026 — STYLE&CULTURE. Cultura, identidad y estilo en cada drop. Worldwide Shipping.';

export const metadata: Metadata = {
  metadataBase: new URL('https://hypestyle.com.ar'),
  // El título visible en la pestaña es siempre "Hype." (branding limpio).
  title: 'Hype.',
  description: 'HYPESTYLE® es una marca argentina de streetwear fundada en 2018. Diseñamos prendas inspiradas en la cultura, la identidad y el estilo contemporáneo. Envíos a todo el mundo.',
  keywords: [
    'streetwear argentino', 'moda urbana', 'ropa streetwear', 'hypestyle', 'oversize',
    'boxy fit', 'streetwear argentina', 'fashion argentina', 'cultura urbana', 'diseño argentino',
  ],
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://hypestyle.com.ar' },
  openGraph: {
    title: 'HYPESTYLE — STYLE&CULTURE',
    description: OG_DESCRIPTION,
    url: 'https://hypestyle.com.ar',
    siteName: 'HYPESTYLE',
    locale: 'es_AR',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'HYPESTYLE — STYLE&CULTURE' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HYPESTYLE — STYLE&CULTURE',
    description: OG_DESCRIPTION,
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>
          <FlashSaleBar />
          <PromoChampionBar />
          <Promo3x2Bar />
          <LoadingScreen />
          <ChampionTakeover />
          <CartDrawer />
          <WishlistDrawer />
          <LocaleSuggestion />
          <CookieBanner />
          <MetaPixel />
          {children}
          <WhatsAppButton />
          <ReviewsDrawer />
        </Providers>
      </body>
    </html>
  );
}
