import type { Metadata, Viewport } from 'next';
import { Golos_Text } from 'next/font/google';
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
import SpotifyPlayer from '@/components/SpotifyPlayer';
import ReviewsDrawer from '@/components/reviews/ReviewsDrawer';
import FlashSaleBar from '@/components/FlashSaleBar';
import Promo3x2Bar from '@/components/Promo3x2Bar';
import PromoChampionBar from '@/components/PromoChampionBar';
import ChampionTakeover from '@/components/ChampionTakeover';
import JsonLd from '@/components/JsonLd';
import { organizationJsonLd, websiteJsonLd } from '@/lib/jsonld';

// La tipografía de toda la marca. next/font la descarga en build time y la
// sirve desde nuestro dominio, así que no hay request a Google en runtime ni
// CSS que bloquee el render. `display: swap` deja pintar el texto con la
// fuente de sistema mientras llega.
const golos = Golos_Text({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-golos',
});

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
    <html lang="es" className={golos.variable}>
      <head>
        {/* Las fotos del hero (el LCP del home) viven en el WordPress, y el
            navegador recién abre la conexión cuando descubre la URL — con
            DNS + TLS de por medio eso son ~400 ms perdidos antes del primer
            byte. Con preconnect el handshake arranca en paralelo al HTML.
            Los otros dos son los scripts de medición: no bloquean nada, pero
            resuelven el DNS gratis mientras la página se pinta. */}
        <link rel="preconnect" href="https://lightpink-rook-704850.hostingersite.com" crossOrigin="" />
        <link rel="preconnect" href="https://connect.facebook.net" crossOrigin="" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      </head>
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
          <SpotifyPlayer />
          <ReviewsDrawer />
        </Providers>
      </body>
    </html>
  );
}
