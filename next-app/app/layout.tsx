import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import CartDrawer from '@/components/CartDrawer';
import WishlistDrawer from '@/components/WishlistDrawer';
import CookieBanner from '@/components/CookieBanner';
import LocaleSuggestion from '@/components/LocaleSuggestion';
import LoadingScreen from '@/components/LoadingScreen';
import MetaPixel from '@/components/MetaPixel';
import MicrosoftClarity from '@/components/MicrosoftClarity';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import WhatsAppButton from '@/components/WhatsAppButton';
import ReviewsDrawer from '@/components/reviews/ReviewsDrawer';
import FlashSaleBar from '@/components/FlashSaleBar';
import Promo3x2Bar from '@/components/Promo3x2Bar';
import PromoChampionBar from '@/components/PromoChampionBar';
import ChampionTakeover from '@/components/ChampionTakeover';
import JsonLd from '@/components/JsonLd';
import { organizationJsonLd, websiteJsonLd } from '@/lib/jsonld';

const OG_DESCRIPTION = '© HYPESTYLE 2026 — STYLE&CULTURE. Cultura, identidad y estilo en cada drop. Worldwide Shipping.';

export const metadata: Metadata = {
  metadataBase: new URL('https://hypestyle.com.ar'),
  // Fallback: solo aplica a páginas que no definan el suyo. Toda página
  // indexable pone título propio vía buildMetadata() en lib/seo.ts — el <title>
  // es el titular del resultado de Google, y con "Hype." eran todos iguales.
  title: 'Hype | Streetwear Argentino',
  description: 'HYPESTYLE® es una marca argentina de streetwear fundada en 2018. Diseñamos prendas inspiradas en la cultura y el estilo contemporáneo.',
  keywords: [
    'streetwear argentino', 'moda urbana', 'ropa streetwear', 'hypestyle', 'oversize',
    'boxy fit', 'streetwear argentina', 'fashion argentina', 'cultura urbana', 'diseño argentino',
  ],
  robots: { index: true, follow: true },
  // OJO: acá NO va `alternates.canonical`. Estaba fijo en la home y, como casi
  // ninguna página hija lo pisaba, cada ficha de producto y cada colección se
  // declaraba duplicado de la home. Cada página define el suyo con buildMetadata().
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GSC_VERIFICATION,
  },
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
        {/* Identidad de la marca para Google, en todas las páginas. */}
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
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
          <MicrosoftClarity />
          <GoogleAnalytics />
          {children}
          <WhatsAppButton />
          <ReviewsDrawer />
        </Providers>
      </body>
    </html>
  );
}
