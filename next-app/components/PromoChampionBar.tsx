'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { usePromoChampionStatus } from '@/hooks/usePromoChampionStatus';

const GOLD = '#C9A227';
const NAVY = '#0d1b3d';
const CELESTE = '#75AADB';

function Star({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={GOLD} className="shrink-0">
      <path d="M12 0l3.09 6.26L22 7.27l-5 4.87 1.18 6.88L12 15.9l-6.18 3.25L7 12.14 2 7.27l6.91-1.01L12 0z" />
    </svg>
  );
}

// Barra fija sitewide: 50% off en todo el catálogo si Argentina sale campeón del
// mundo. Mismo patrón que Promo3x2Bar — solo se muestra en fase "won" (mientras
// promoActive esté vigente). Celeste y blanco (no navy) con dorado marcado, estrellas
// repartidas a lo largo de toda la franja.
export default function PromoChampionBar() {
  const pathname = usePathname();
  const { phase, promoActive } = usePromoChampionStatus();

  const hideOn = ['/admin', '/checkout', '/pendiente-de-pago', '/confirmacion'];
  if (phase !== 'won' || !promoActive || hideOn.some(p => pathname?.startsWith(p))) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[71] h-[40px] flex items-center justify-center gap-3 px-4"
      style={{
        background: `linear-gradient(90deg, ${CELESTE} 0%, #ffffff 50%, ${CELESTE} 100%)`,
        borderTop: `2px solid ${GOLD}`,
        borderBottom: `2px solid ${GOLD}`,
      }}
    >
      <Star />
      <span className="text-[10px] font-black tracking-[0.18em] uppercase" style={{ color: NAVY }}>
        Argentina campeón del mundo
      </span>
      <Star />
      <span className="text-[11px] font-black tracking-[0.16em] uppercase" style={{ color: GOLD }}>
        50% OFF en todo el cat&aacute;logo
      </span>
      <Star />
      <span className="hidden sm:block" style={{ color: `${NAVY}40` }}>&middot;</span>
      <Link
        href="/productos/"
        className="hidden sm:flex items-center gap-1 text-[10px] font-black tracking-[0.14em] uppercase px-3 py-1 border-2 transition-colors duration-150 shrink-0"
        style={{ color: NAVY, borderColor: GOLD }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = GOLD; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = NAVY; }}
      >
        Comprar
      </Link>
      <Star />
    </div>
  );
}
