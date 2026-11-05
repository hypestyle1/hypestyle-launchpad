'use client';

import { BRAND_HERO, NEXT_DROP_TEXT, consignacionHero } from '@/lib/mayorista-copy';
import { useMayoristaPerfil } from '@/context/MayoristaPerfilContext';
import { endsLabel, type CampaignBanner } from '@/lib/mayorista-campaign-view';
import { paymentWindowFor, paymentWindowCopy, heroImageFor } from '@/lib/mayorista-flash';
import MayoristaCountdown from './MayoristaCountdown';

// Hero del portal mayorista. Con campaña vigente: ventana privada para
// locales (badge, headline, "Hasta X% extra", texto, fecha de cierre, CTA).
// Sin campaña: hero de marca con el teaser del próximo drop como línea
// secundaria. Estética del sitio: blanco y negro, bordes finos, y el rojo de
// campaña (--sale, no el de error) solo como acento.
const RED = 'text-sale';

export default function MayoristaCampaignHero({ banner, onCta, onCatalog, preview }: {
  banner: CampaignBanner | null;
  onCta: () => void;
  onCatalog: () => void;
  preview?: boolean;
}) {
  // En consignación el hero de marca no puede prometer "50% del PVP": ahí el
  // trato es otro (lib/mayorista-consignacion.ts).
  const { consignacion } = useMayoristaPerfil();
  const hero = consignacion ? consignacionHero(consignacion.pct) : BRAND_HERO;

  if (!banner) {
    return (
      <section className="rounded-[16px] border border-border bg-bg-alt/40 px-6 sm:px-10 py-8 sm:py-10 mb-8">
        <p className="text-[10px] uppercase tracking-[0.25em] text-foreground/50">{hero.eyebrow}</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-2">{hero.headline}</h1>
        <p className="text-[13px] text-muted-foreground mt-2 max-w-xl">{hero.text}</p>
        <div className="flex flex-wrap items-center gap-4 mt-5">
          <button onClick={onCatalog} className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide rounded-full bg-bg-dark text-primary-foreground hover:bg-bg-dark/85 transition-colors">{hero.cta}</button>
          {NEXT_DROP_TEXT && <span className={`text-[11px] uppercase tracking-[0.18em] ${RED}`}>{NEXT_DROP_TEXT}</span>}
        </div>
      </section>
    );
  }

  const pct = Math.round(banner.maxDiscount * 100);
  const exact = pct > 0 && Math.round(banner.minDiscount * 100) === pct;
  const paymentHours = paymentWindowFor(banner.id);
  const image = heroImageFor(banner.id);
  return (
    <section className="relative rounded-[16px] border border-foreground bg-bg-dark text-primary-foreground mb-8 overflow-hidden sm:grid sm:grid-cols-[1fr_minmax(0,40%)]">
      {/* Foto: arriba en mobile, a la derecha en desktop. */}
      {image && (
        <div className="relative h-[220px] sm:h-auto sm:order-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="Zip Hoodie Camo Olive" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/10 to-transparent sm:bg-gradient-to-r sm:from-bg-dark sm:via-transparent" aria-hidden />
        </div>
      )}
      <div className="relative px-6 sm:px-10 py-8 sm:py-12 sm:order-1">
      {preview && <span className="absolute z-10 top-3 right-3 text-[10px] uppercase tracking-wider border border-primary-foreground/40 rounded-full px-2 py-0.5 text-primary-foreground/70">Preview · campaña en borrador</span>}
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-block px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] rounded-[6px] bg-sale text-sale-foreground">{banner.badge}</span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-primary-foreground/60">{endsLabel(banner.endsAt)}</span>
      </div>
      <h1 className="text-2xl sm:text-4xl font-bold tracking-tight mt-4 max-w-3xl leading-[1.05]">{banner.headline}</h1>
      {pct > 0 && <p className="text-lg sm:text-2xl font-semibold tracking-tight mt-2">{exact ? <><span className={RED}>{pct}% adicional</span> sobre tu precio mayorista</> : <>Hasta <span className={RED}>{pct}% extra</span> sobre tu precio mayorista</>}</p>}
      <div className="mt-5"><MayoristaCountdown endsAt={banner.endsAt} /></div>
      {banner.text && <p className="text-[13px] sm:text-[14px] text-primary-foreground/70 mt-3 max-w-xl leading-relaxed">{banner.text}</p>}
      {paymentHours && <p className="text-[12px] sm:text-[13px] mt-3 max-w-xl leading-snug border border-sale/70 rounded-[10px] px-3 py-2 text-primary-foreground">{paymentWindowCopy(paymentHours)}</p>}
      <div className="flex flex-wrap items-center gap-3 mt-6">
        <button onClick={onCta} className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide rounded-full bg-primary-foreground text-bg-dark hover:bg-primary-foreground/90 transition-colors">{banner.cta} →</button>
        <button onClick={onCatalog} className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide rounded-full border border-primary-foreground/40 text-primary-foreground hover:border-primary-foreground transition-colors">Todo el catálogo</button>
        {banner.secondary && <span className={`text-[11px] uppercase tracking-[0.18em] sm:ml-2 ${RED}`}>{banner.secondary}</span>}
      </div>
      {banner.groups.some(g => g.count > 0) && (
        <div className="flex flex-wrap gap-2 mt-6">
          {banner.groups.filter(g => g.count > 0).map(g => (
            <span key={g.key} className="text-[10px] uppercase tracking-wide border border-primary-foreground/30 rounded-full px-2.5 py-1 text-primary-foreground/80">{g.label} · {g.count}</span>
          ))}
        </div>
      )}
      </div>
    </section>
  );
}
