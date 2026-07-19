'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { usePromoChampionStatus } from '@/hooks/usePromoChampionStatus';

const GOLD = '#D4AF37';
const CELESTE = '#75AADB';

function Star({ size = 8 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={GOLD}>
      <path d="M12 0l3.09 6.26L22 7.27l-5 4.87 1.18 6.88L12 15.9l-6.18 3.25L7 12.14 2 7.27l6.91-1.01L12 0z" />
    </svg>
  );
}

// Barra fija sitewide: 50% off en todo el catálogo (menos LA NUESTRA, que sigue su
// propio descuento por gol) si Argentina sale campeón del mundo. Mismo patrón que
// Promo3x2Bar — solo se muestra en fase "won" (mientras promoActive esté vigente).
export default function PromoChampionBar() {
  const pathname = usePathname();
  const { phase, promoActive } = usePromoChampionStatus();

  const hideOn = ['/admin', '/checkout', '/pendiente-de-pago', '/confirmacion'];
  if (phase !== 'won' || !promoActive || hideOn.some(p => pathname?.startsWith(p))) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[71] h-[40px] flex items-center justify-center gap-3 px-4"
      style={{
        background: `linear-gradient(135deg, #0d1b3d 0%, #1B3B6F 45%, ${CELESTE} 100%)`,
        borderBottom: `1px solid ${GOLD}`,
      }}
    >
      <div className="flex items-center gap-1 shrink-0">
        <Star /><Star /><Star /><Star />
      </div>
      <span className="text-[10px] font-black tracking-[0.18em] uppercase" style={{ color: GOLD }}>
        Argentina campeón del mundo
      </span>
      <span className="text-white/30 text-[10px]">&middot;</span>
      <span className="text-[10px] font-black tracking-[0.14em] uppercase text-white">
        50% OFF en todo &mdash; menos LA NUESTRA
      </span>
      <span className="text-white/25 text-[10px] hidden sm:block">&middot;</span>
      <Link
        href="/productos/"
        className="hidden sm:flex items-center gap-1 text-[10px] font-bold tracking-[0.14em] uppercase text-white border px-3 py-1 hover:bg-white hover:text-[#1B3B6F] transition-colors duration-150 shrink-0"
        style={{ borderColor: `${GOLD}66` }}
      >
        Comprar
      </Link>
    </div>
  );
}
