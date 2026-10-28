import { Fragment } from 'react';
import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import ShopTheLook from '@/components/ShopTheLook';
import VistoEn from '@/components/VistoEn';
import BenefitsStrip from '@/components/BenefitsStrip';
import EsencialesShelf from '@/components/home/EsencialesShelf';
import Fw26Shelf from '@/components/home/Fw26Shelf';
import BestSellersShelf from '@/components/home/BestSellersShelf';
import EditorialBanner from '@/components/EditorialBanner';
import FlashSaleSection from '@/components/FlashSaleSection';
import Promo3x2Section from '@/components/Promo3x2Section';
import ReviewsHomeSection from '@/components/reviews/ReviewsHomeSection';
import InstagramFeed from '@/components/InstagramFeed';
import Footer from '@/components/Footer';
import HeroSs27 from '@/components/ss27-home/HeroSs27';
import Ss27Feed from '@/components/ss27-home/Ss27Feed';
import Hype72Banda from '@/components/home/hype72/Hype72Banda';
import Hype72Corte from '@/components/home/hype72/Hype72Corte';
import Hype72MiniCountdown from '@/components/home/hype72/Hype72MiniCountdown';
import Hype72Regalos from '@/components/home/hype72/Hype72Regalos';
import Hype72Shelf from '@/components/home/hype72/Hype72Shelf';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { fetchAllProducts } from '@/lib/products-server';
import { fetchHomeReviews } from '@/lib/reviews/server';
import { loadSs27Page } from '@/lib/ss27-coleccion-server';
import { SS27_HOME_EXTRA_SLUGS } from '@/lib/ss27-home';
import {
  hype72Countdown,
  hype72HomeOrden,
  hype72HomeStateResuelto,
  hype72TopBarItems,
  type Hype72SeccionId,
} from '@/lib/hype72-home';
import type { NormalizedProduct } from '@/lib/products-normalize';
import type { Ss27Product } from '@/lib/ss27-coleccion';
import { buildMetadata } from '@/lib/seo';

// Heroes anteriores (Hero + EventCountdown + PinnedIntro, HeroLaNuestra,
// HeroHannaDrop, HeroLookbookFW26) siguen en el repo, sin usar, por si hay que
// volver. Desde el drop SS27 (11/10/2026) el hero es HeroSs27.

// rawTitle: el título de la home se define entero acá, sin el sufijo de marca
// que lleva el resto del sitio (quedaría "…| HYPESTYLE" duplicando "Hype").
export const metadata = buildMetadata({
  title: 'Hype | Streetwear Argentino',
  rawTitle: true,
  description: 'HYPESTYLE® — streetwear argentino desde 2018. Hoodies, remeras, pants y sets de drops limitados. Envíos a todo el mundo.',
  path: '/',
});

/**
 * CACHÉ. Explícito a propósito desde el takeover de HYPE 72.
 *
 * El estado del takeover depende de la HORA DEL SERVIDOR, así que la home no
 * puede quedar cacheada para siempre o se perdería la apertura y, peor, el
 * cierre. 60 s es el mismo valor que usa toda página con fecha del proyecto
 * (`/colecciones/*`, `/hoodies`, `/new-in`, `/tees`…) y, de hecho, es el que la
 * home YA tenía sin declararlo: Next toma el `revalidate` más bajo de los
 * fetches del render, y `products-server` pide con `next: { revalidate: 60 }`.
 * Escribirlo acá no cambia el comportamiento, lo documenta y lo fija.
 *
 * Qué significa en la práctica: al abrir (1/11 23:00) y al cerrar (5/11 00:00)
 * la home puede quedar hasta ~60 s en el estado anterior para quien pegue el
 * primer request después de que expire el ISR. Es aceptable y es seguro en la
 * dirección que importa:
 *  - los PRECIOS no los decide la home: los trae cada ficha desde Woo y los
 *    cobra el checkout. La home nunca puede mostrar una oferta que el carrito
 *    no tenga, porque no escribe ningún monto;
 *  - la CUENTA REGRESIVA es del cliente (se refresca cada segundo), así que
 *    nunca muestra un tiempo congelado;
 *  - si al cerrar sobrevive un minuto de chrome del evento, lo único que queda
 *    viejo es el orden de las secciones, no una promesa comercial.
 * No se usa `force-dynamic`: la home es la página más visitada del sitio y
 * renderizarla por request para ganar 60 s de precisión en dos instantes de
 * tres días no se paga.
 */
export const revalidate = 60;

/**
 * NewInFW26, BasicosSection, BackInStock y MasHypeSection comparten la query
 * ['products'] de React Query, que pedía /api/products desde el browser: las
 * cuatro secciones se renderizaban vacías y se llenaban recién al resolver el
 * fetch. El documento pasaba de ~3.900px a ~21.000px de golpe y todo lo que
 * estaba en pantalla saltaba — el CLS del home en mobile llegaba a 0,8.
 *
 * Acá se precarga esa misma query en el servidor y se hidrata el cache, así el
 * primer render ya sale con los productos y no hay salto. fetchAllProducts()
 * usa exactamente el mismo query GraphQL que /api/products (mismos campos,
 * mismo orden por DATE, mismo dedupe por id), así que el dato hidratado y el
 * que traería el browser son idénticos: no hay refetch que vuelva a mover nada.
 *
 * SS27 va aparte: sus productos salen de la colección (tag ss27-part-01) por
 * el mu-plugin, igual que /colecciones/ss27, y llegan por props. Antes de la
 * apertura la lista viene vacía y la sección no se muestra.
 *
 * ── TAKEOVER HYPE 72 ────────────────────────────────────────────────────────
 * El cuerpo de la home NO tiene el orden escrito en el JSX: hay un diccionario
 * id → sección (`SECCIONES`) y se renderiza `hype72HomeOrden(state).map(...)`.
 * Así el orden es un dato puro y testeable (tests/unit/hype72-home.test.ts
 * verifica que fuera de la ventana sea idéntico al de siempre), en vez de algo
 * que hay que leer del JSX y creer. Fuera de la ventana el estado es 'normal' y
 * la lista es exactamente la de antes de este PR.
 * Todo el mecanismo vive en `lib/hype72-home.ts`. Ver ahí cómo se revierte.
 */
export default async function Home() {
  const queryClient = new QueryClient();
  // Las reseñas van por separado: no pasan por React Query, la sección las
  // recibe por props. Sin esto se montaba vacía y a los 6–9s insertaba ~715px
  // arriba de #new-in-fw26, que era lo último que quedaba del CLS del home.
  const [, reviews, ss27] = await Promise.all([
    queryClient.prefetchQuery({ queryKey: ['products'], queryFn: fetchAllProducts }),
    fetchHomeReviews(4),
    loadSs27Page(),
  ]);

  // Lo que acompaña al drop sin ser de la colección (medias, gorra): sale del
  // catálogo que ya se precargó arriba. Ver SS27_HOME_EXTRA_SLUGS.
  const catalog = queryClient.getQueryData<NormalizedProduct[]>(['products']) ?? [];
  const extras: Ss27Product[] = SS27_HOME_EXTRA_SLUGS
    .filter((slug) => !ss27.products.some((p) => p.slug === slug))
    .map((slug) => catalog.find((p) => p.slug === slug))
    .filter((p): p is NormalizedProduct => Boolean(p))
    .map((p) => ({ ...p, comingSoon: false }));

  // HORA DEL SERVIDOR. Un solo `ahora` para todo el render: el estado, el top
  // bar y la cuenta regresiva tienen que estar de acuerdo entre sí, y `ahora`
  // viaja al cliente para que el primer render del contador sea el mismo del
  // servidor (si no, mismatch de hidratación en los segundos).
  const ahora = Date.now();
  const hype72 = hype72HomeStateResuelto(ahora);
  const topBar = hype72TopBarItems(hype72);
  const cuenta = hype72Countdown(hype72);

  const SECCIONES: Record<Hype72SeccionId, React.ReactNode> = {
    // ── Las de siempre ──
    'promo-3x2': <Promo3x2Section />,
    'flash-sale': <FlashSaleSection />,
    'ss27-feed': <Ss27Feed products={ss27.state === 'open' ? [...ss27.products, ...extras] : []} />,
    'shop-the-look': <ShopTheLook />,
    // Visto en (17/10): artistas con Hype puesto, arriba de los estantes
    // para que la prueba social no quede al fondo del home.
    'visto-en': <VistoEn />,
    // Rediseño 2026 (aprobado 12/10): debajo del drop, los estantes del
    // sistema nuevo con índice sticky propio y handoff nativo entre sí.
    // Esenciales reemplaza a BasicosSection (conserva id="basicos"),
    // Fw26Shelf condensa a NewInFW26 (id="new-in-fw26") y BestSellers
    // reorganiza a BackInStock por familias (id="back-in-stock") — los
    // ids se mantienen para que los anclajes del menú sigan andando.
    // VideoSection y MasHypeSection salen: la home no se alarga (sus
    // productos viven en /colecciones/mas-hype y el video en la ficha).
    esenciales: <EsencialesShelf />,
    fw26: <Fw26Shelf />,
    'best-sellers': <BestSellersShelf />,
    'editorial-banner': <EditorialBanner />,
    reviews: <ReviewsHomeSection initial={reviews} />,
    // Último bloque antes del footer, a propósito: Clarity muestra que casi
    // nadie llega hasta acá, así que no compite con el producto arriba.
    instagram: <InstagramFeed />,

    // ── Takeover HYPE 72. Solo se renderizan si el orden del estado los pide. ──
    'hype72-banda': cuenta && hype72 !== 'normal'
      ? <Hype72Banda state={hype72} target={cuenta.target} ahora={ahora} />
      : null,
    'hype72-regalos': <Hype72Regalos />,
    'hype72-packs': (
      <Hype72Shelf
        id="hype72-packs"
        titulo="Packs"
        bloque="packs"
        link="/colecciones/regular-tees"
        nota="Pagás 3, llevás 4"
        max={16}
      />
    ),
    'hype72-archivo': (
      <Hype72Shelf
        id="hype72-archivo"
        titulo="Archivo"
        bloque="archivo"
        link="/productos"
        nota="Temporadas anteriores"
        max={16}
      />
    ),
    'hype72-sleeveless': (
      <Hype72Shelf id="hype72-sleeveless" titulo="Sleeveless" bloque="sleeveless" link="/arriba" max={12} />
    ),
    'hype72-hoodies-tees': (
      <Hype72Shelf id="hype72-hoodies-tees" titulo="Hoodies y remeras" bloque="hoodiesTees" link="/arriba" max={20} />
    ),
    'hype72-populares': (
      <Hype72Shelf id="hype72-populares" titulo="Lo más pedido" bloque="populares" link="/productos" max={12} />
    ),
    // Vidriera, separada de lo comprable y al final del bloque comercial.
    'hype72-proximamente': (
      <Hype72Shelf
        id="hype72-proximamente"
        titulo="Próximamente"
        bloque="proximamente"
        nota="Todavía no se puede comprar"
        max={8}
        vidriera
      />
    ),
    // Durante el evento el marquee del top bar lo ocupa el contador del
    // evento, así que los beneficios que hoy viven ahí (envío, cuotas,
    // cambios) vuelven como bloque. BenefitsStrip ya estaba escrito y hoy
    // está fuera de la home: entra tal cual, sin tocarlo.
    'hype72-condiciones': <BenefitsStrip />,
    'hype72-corte': <Hype72Corte />,
  };

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AnnouncementBar
        items={topBar ?? undefined}
        lead={cuenta
          ? <Hype72MiniCountdown target={cuenta.target} ahora={ahora} label={cuenta.label} />
          : undefined}
      />
      <Navbar />
      <main className="pt-[var(--offset)]">
        {/* El título del hero es texto decorativo, así que el H1 del documento va acá.
            Oculto a la vista (sr-only) pero presente en el DOM. */}
        <h1 className="sr-only">
          HYPESTYLE — Streetwear argentino. Drops limitados, envíos a todo el mundo.
        </h1>
        <HeroSs27 />
        {/* Orden: el drop nuevo arriba (SS27 + sus looks), después FW26, best
            sellers, básicos, editorial y la prueba social al final. Promo y
            Flash Sale devuelven null sin campaña. Durante HYPE 72 el orden lo
            manda hype72HomeOrden(). */}
        <div className="relative z-10 bg-white">
          {/* Fragment y no un <div>: el DOM que sale tiene que ser IDÉNTICO al
              de antes de este PR cuando el estado es 'normal'. Un wrapper, aun
              con `display: contents`, rompería el sticky de los índices de
              EsencialesShelf / Fw26Shelf / BestSellersShelf (un ancestro con
              `display: contents` deja de ser el contenedor del sticky). */}
          {hype72HomeOrden(hype72).map((id) => (
            <Fragment key={id}>{SECCIONES[id]}</Fragment>
          ))}
        </div>
      </main>
      <Footer />
    </HydrationBoundary>
  );
}
