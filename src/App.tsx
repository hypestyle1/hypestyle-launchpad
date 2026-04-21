import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { LocaleProvider } from "@/context/LocaleContext";
import { CookieProvider } from "@/context/CookieContext";
import CookieBanner from "@/components/CookieBanner";
import MetaPixel from "@/components/MetaPixel";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import CartDrawer from "@/components/CartDrawer";
import WishlistDrawer from "@/components/WishlistDrawer";
import LocaleSuggestion from "@/components/LocaleSuggestion";
import LoadingScreen from "@/components/LoadingScreen";
import ScrollToTop from "@/components/ScrollToTop";
import Index from "./pages/Index.tsx";
import Nosotros from "./pages/Nosotros.tsx";
import Politicas from "./pages/Politicas.tsx";
import Producto from "./pages/Producto.tsx";
import Checkout from "./pages/Checkout.tsx";
import ConfirmacionPedido from "./pages/ConfirmacionPedido.tsx";
import PendientePago from "./pages/PendientePago.tsx";
import Colecciones from "./pages/Colecciones.tsx";
import Worldwide from "./pages/Worldwide.tsx";
import FAQs from "./pages/FAQs.tsx";
import Contacto from "./pages/Contacto.tsx";
import Categoria from "./pages/Categoria.tsx";
import BestSellersPage from "./pages/BestSellersPage.tsx";
import SpecialPricesPage from "./pages/SpecialPricesPage.tsx";
import BackInStockPage from "./pages/BackInStockPage.tsx";
import NovedadesPage from "./pages/NovedadesPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CookieProvider>
    <LocaleProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <LoadingScreen />
        <CartDrawer />
        <WishlistDrawer />
        <LocaleSuggestion />
        <CookieBanner />
        <MetaPixel />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/colecciones/" element={<Colecciones />} />
          <Route path="/nosotros/" element={<Nosotros />} />
          <Route path="/politicas-de-devolucion/" element={<Politicas />} />
          <Route path="/producto/:slug/" element={<Producto />} />
          <Route path="/checkout/" element={<Checkout />} />
          <Route path="/confirmacion/" element={<ConfirmacionPedido />} />
          <Route path="/pendiente-de-pago/" element={<PendientePago />} />
          <Route path="/worldwide/" element={<Worldwide />} />
          <Route path="/faqs/" element={<FAQs />} />
          <Route path="/contacto/" element={<Contacto />} />
          <Route path="/best-sellers/" element={<BestSellersPage />} />
          <Route path="/special-prices/" element={<SpecialPricesPage />} />
          <Route path="/back-in-stock/" element={<BackInStockPage />} />
          <Route path="/novedades/" element={<NovedadesPage />} />
          <Route path="/productos/" element={<Categoria />} />
          <Route path="/arriba/" element={<Categoria />} />
          <Route path="/tees/" element={<Categoria />} />
          <Route path="/hoodies/" element={<Categoria />} />
          <Route path="/abajo/" element={<Categoria />} />
          <Route path="/pants/" element={<Categoria />} />
          <Route path="/jorts/" element={<Categoria />} />
          <Route path="/sets/" element={<Categoria />} />
          <Route path="/accesorios/" element={<Categoria />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </LocaleProvider>
    </CookieProvider>
  </QueryClientProvider>
);

export default App;
