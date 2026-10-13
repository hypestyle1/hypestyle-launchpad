import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import JsonLd from '@/components/JsonLd';
import { buildMetadata } from '@/lib/seo';
import { breadcrumbJsonLd } from '@/lib/jsonld';

const PATH = '/colaboraciones/';
const TITLE = 'Colaboraciones';
const DESCRIPTION =
  'Las colaboraciones de HYPESTYLE®: Alfredo Genovese, Mir Nicolás, Neo Pistea y Ferpa. Arte argentino sobre streetwear, en ediciones limitadas que no se repiten.';

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

/**
 * El hub de colabs (pedido 13/10): cada colaboración con artista, en el
 * tratamiento sobrio del Archivo. El destino principal es el lookbook de cada
 * una; el jersey de Genovese se sigue vendiendo (Best sellers · Clásicos).
 */
const COLABS = [
  {
    name: 'Fileteado Porteño x Alfredo Genovese',
    season: 'Diciembre 2025',
    description: 'Filete porteño sobre una camiseta de fútbol, pintado por el maestro Alfredo Genovese. Filmado en la cancha de la Villa 31.',
    image: 'genovese-drop-banner.webp',
    href: '/lookbook-genovese/',
    disponible: true,
  },
  {
    name: 'La Ciudad del Pop x Mir Nicolás',
    season: 'Octubre 2025',
    description: 'Arte inspirado en el universo visual de Mir Nicolás y la cultura urbana japonesa. Tres gráficas, con pop-up en Vorterix.',
    image: 'mir-nicolas-drop-banner.webp',
    href: '/lookbook-mir/',
    disponible: false,
  },
  {
    name: 'CULTO x Neo Pistea',
    season: 'Verano 2025',
    description: 'El merch oficial del disco. Tres remeras con Neo Pistea, agotadas: queda el lookbook del shooting y de la noche en Mar del Plata.',
    image: 'neo-pistea-drop-banner.webp',
    href: '/lookbook-neo/',
    disponible: false,
  },
  {
    name: 'Tie Dye Hoodie Drop x Ferpa',
    season: 'Septiembre 2020',
    description: 'Cuarenta buzos tie dye, ninguno a la venta: se repartieron entre los streamers y creadores del momento.',
    image: 'ferpa-drop-banner.webp',
    href: '/lookbook-ferpa/',
    disponible: false,
  },
];

export default function ColaboracionesPage() {
  return (
    <>
      <JsonLd data={[breadcrumbJsonLd([{ name: TITLE, path: PATH }])]} />
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)] bg-white">
        <header className="px-4 md:px-6 pt-8 md:pt-10 pb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2.5">Hypestyle</p>
          <h1 className="flex items-baseline gap-2.5 text-[34px] md:text-[56px] font-semibold tracking-[-0.035em] leading-[1.02]">
            Colaboraciones
            <span className="text-[13px] font-normal tracking-normal text-muted-foreground tabular-nums">{COLABS.length}</span>
          </h1>
          <p className="text-[14px] text-muted-foreground mt-3 max-w-md leading-relaxed">
            Arte argentino sobre streetwear. Ediciones limitadas con artistas, en drops que no se repiten.
          </p>
        </header>

        <section className="px-4 md:px-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-10">
            {COLABS.map((c) => (
              <a key={c.name} href={c.href} className="group block">
                <div className="relative overflow-hidden rounded-[4px] bg-bg-alt" style={{ aspectRatio: '16/10' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/${c.image}`}
                    alt={c.name}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                  />
                  {!c.disponible && (
                    <span className="absolute top-3 left-3 text-[9px] font-semibold uppercase tracking-wider px-2 py-1 bg-background/85 text-foreground backdrop-blur-sm rounded-[4px]">
                      Agotada
                    </span>
                  )}
                </div>
                <div className="mt-4 px-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Colab · {c.season}</p>
                  <h2 className="text-[20px] md:text-[26px] font-semibold tracking-[-0.03em] leading-tight mt-1.5">{c.name}</h2>
                  <p className="text-[14px] text-muted-foreground mt-2 max-w-md leading-relaxed">{c.description}</p>
                  <p className="text-[11px] md:text-[12px] font-semibold uppercase underline underline-offset-4 mt-3">Ver lookbook</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
