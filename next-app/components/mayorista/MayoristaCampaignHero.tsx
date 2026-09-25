'use client';

import { BRAND_HERO, NEXT_DROP_TEXT } from '@/lib/mayorista-copy';
import { endsLabel, type CampaignBanner } from '@/lib/mayorista-campaign-view';

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
  if (!banner) {
    return (
      <section className="rounded-[16px] border border-border bg-bg-alt/40 px-6 sm:px-10 py-8 sm:py-10 mb-8">
        <p className="text-[10px] uppercase tracking-[0.25em] text-foreground/50">{BRAND_HERO.eyebrow}</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-2">{BRAND_HERO.headline}</h1>
        <p className="text-[13px] text-muted-foreground mt-2 max-w-xl">{BRAND_HERO.text}</p>
        <div className="flex flex-wrap items-center gap-4 mt-5">
          <button onClick={onCatalog} className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide rounded-full bg-bg-dark text-primary-foreground hover:bg-bg-dark/85 transition-colors">{BRAND_HERO.cta}</button>
          {NEXT_DROP_TEXT && <span className={`text-[11px] uppercase tracking-[0.18em] ${RED}`}>{NEXT_DROP_TEXT}</span>}
        </div>
      </section>
    );
  }

  const pct = Math.round(banner.maxDiscount * 100);
  return (
    <section className="relative rounded-[16px] border border-foreground bg-bg-dark text-primary-foreground px-6 sm:px-10 py-8 sm:py-12 mb-8 overflow-hidden">
      {preview && <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wider border border-primary-foreground/40 rounded-full px-2 py-0.5 text-primary-foreground/70">Preview · campaña en borrador</span>}
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-block px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] rounded-[6px] bg-sale text-sale-foreground">{banner.badge}</span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-primary-foreground/60">{endsLabel(banner.endsAt)}</span>
      </div>
      <h1 className="text-2xl sm:text-4xl font-bold tracking-tight mt-4 max-w-3xl leading-[1.05]">{banner.headline}</h1>
      {pct > 0 && <p className="text-lg sm:text-2xl font-semibold tracking-tight mt-2">Hasta <span className={RED}>{pct}% extra</span> sobre tu precio mayorista</p>}
      {banner.text && <p className="text-[13px] sm:text-[14px] text-primary-foreground/70 mt-3 max-w-xl leading-relaxed">{banner.text}</p>}
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
    </section>
  );
}
