import Image from 'next/image';
import Link from 'next/link';
import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import JsonLd from '@/components/JsonLd';
import Ss27Countdown from '@/components/ss27/Ss27Countdown';
import { buildMetadata } from '@/lib/seo';
import { breadcrumbJsonLd, collectionJsonLd } from '@/lib/jsonld';
import { PRIVATE_ACCESS_PATH } from '@/lib/private-access/config';
import { SS27_HERO_IMAGES, SS27_OG_IMAGE, SS27_PATH, toCardProps } from '@/lib/ss27-coleccion';
import { loadSs27Page } from '@/lib/ss27-coleccion-server';

// URL estable para la pauta del 11/10: /colecciones/ss27.
//
// El estado (antes / abriendo / abierta) se calcula en cada render con la
// config de Private Access; nada de fechas fijas. ISR de 60 s: una regeneración
// por minuto como mucho, sin importar el tráfico de los anuncios. Al abrir, el
// cron revalida esta ruta (lib/private-access/admin.ts → openCollection).
export const revalidate = 60;

const TITLE = 'Spring Summer 27 · Part 01';
const DESCRIPTION =
  'Spring Summer 27 Part 01 de HYPESTYLE: boxy tees, waffle longsleeves, hoodies lavados y la línea Athletic Dept. Producción limitada.';

export const metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: SS27_PATH,
  image: SS27_OG_IMAGE,
  imageAlt: 'HYPESTYLE Spring Summer 27 Part 01',
});

export default async function Ss27Page() {
  const { state, config, privateAccessActive, openLabel, products } = await loadSs27Page();
  const forSale = products.filter((p) => !p.comingSoon).length;

  return (
    <>
      <JsonLd
        data={[
          collectionJsonLd({
            name: TITLE,
            description: DESCRIPTION,
            path: SS27_PATH,
            products: products.map((p) => ({ name: p.name, slug: p.slug })),
          }),
          breadcrumbJsonLd([
            { name: 'Colecciones', path: '/colecciones/' },
            { name: TITLE, path: SS27_PATH },
          ]),
        ]}
      />
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)] bg-white">
        {/* ── Hero: tres fotos de estudio, en mobile se pasan con swipe ── */}
        <section aria-label="Spring Summer 27 · fotos de campaña">
          <div className="flex md:grid md:grid-cols-3 gap-[2px] overflow-x-auto md:overflow-visible snap-x snap-mandatory [scrollbar-width:none]">
            {SS27_HERO_IMAGES.map((img, i) => (
              <div key={img.src} className="relative shrink-0 w-[86vw] md:w-auto aspect-[4/5] snap-start bg-bg-alt">
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  priority={i === 0}
                  sizes="(min-width: 768px) 33vw, 86vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </section>

        <header className="max-w-[1400px] mx-auto px-4 pt-8 md:pt-12 pb-8 md:pb-10 border-b border-border">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Colección · Hypestyle</p>
          <h1 className="text-[34px] md:text-[64px] font-bold uppercase tracking-tight leading-[0.95]">
            Spring Summer 27
            <span className="block text-muted-foreground">Part 01</span>
          </h1>
          <p className="text-[14px] text-muted-foreground mt-4 max-w-md leading-relaxed">
            Boxy tees, waffle longsleeves y hoodies lavados. La primera parte de la temporada, en producción limitada.
          </p>
        </header>

        {state === 'before' ? (
          <section className="max-w-[1400px] mx-auto px-4 py-10 md:py-14">
            <div className="grid md:grid-cols-[1.4fr_1fr] gap-[2px]">
              {/* Apertura */}
              <div className="bg-bg-dark text-white p-7 md:p-12 flex flex-col justify-between gap-8">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/45 mb-3">Apertura</p>
                  <h2 className="text-[26px] md:text-[40px] font-bold uppercase tracking-tight leading-none">
                    Abre el <span className="whitespace-nowrap">{openLabel}</span>
                    <span className="block text-white/55">a las 00:00</span>
                  </h2>
                </div>
                <Ss27Countdown to={config.publicOpenAt} />
                <p className="text-[12px] text-white/50 max-w-sm">
                  A la hora de apertura la colección aparece en esta página, con talles y stock.
                </p>
              </div>

              {/* Mejores Amigos */}
              {privateAccessActive && (
                <Link
                  href={PRIVATE_ACCESS_PATH}
                  className="group bg-bg-alt p-7 md:p-12 flex flex-col justify-between gap-8"
                >
                  <div>
                    <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-[hsl(142,71%,38%)]" aria-hidden />
                      Private Access
                    </p>
                    <h2 className="text-[24px] md:text-[32px] font-bold uppercase tracking-tight leading-tight">
                      Mejores Amigos ya pueden entrar
                    </h2>
                    <p className="text-[14px] text-muted-foreground mt-3 leading-relaxed max-w-sm">
                      La colección ya está disponible para la lista de Mejores Amigos de Instagram
                      {config.discountPct ? `, con ${config.discountPct}% off` : ''}. Entrás con tu usuario.
                    </p>
                  </div>
                  <span className="text-[12px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    Entrar a Private Access
                    <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden>→</span>
                  </span>
                </Link>
              )}
            </div>
          </section>
        ) : state === 'opening' ? (
          <section className="max-w-[1400px] mx-auto px-4 py-14 md:py-20">
            <div className="bg-bg-dark text-white p-7 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/45 mb-3">Apertura</p>
                <h2 className="text-[24px] md:text-[34px] font-bold uppercase tracking-tight leading-none">
                  Estamos publicando la colección
                </h2>
                <p className="text-[13px] text-white/55 mt-3">En unos minutos aparece acá. La página se actualiza sola.</p>
              </div>
              <Ss27Countdown to={config.publicOpenAt} />
            </div>
          </section>
        ) : (
          <section className="max-w-[1400px] mx-auto px-4 py-10 md:py-14">
            <p className="text-[12px] text-muted-foreground mb-6">
              {forSale} producto{forSale !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
              {products.map((p) => (
                <ProductCard key={p.slug} {...toCardProps(p)} />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
