'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SALE_END_LABEL, SALE_MAX_OFF, isSaleActive } from '@/lib/sale';

/**
 * Banda del Winter Sale en el home.
 *
 * Se renderiza desde el servidor a proposito. El home es estatico y no
 * revalida, asi que el patron de "arrancar apagado y encender en un efecto"
 * —el que usan FlashSaleSection y Promo3x2Section— haria aparecer una banda de
 * 130px despues de hidratar: es CLS, justo lo que se corrigio en el PR #314.
 *
 * Como contrapartida el HTML estatico puede quedar viejo cuando el sale
 * termine, asi que el cliente la apaga si la fecha ya paso. El efecto corre
 * despues de la hidratacion, no es un mismatch.
 *
 * No lleva contador de dias: el numero saldria del build y estaria vencido. El
 * contador vivo esta en el heroe de /special-prices/, que revalida cada 60s.
 */
export default function SaleBanner() {
  const [terminado, setTerminado] = useState(false);

  useEffect(() => {
    if (!isSaleActive()) setTerminado(true);
  }, []);

  if (terminado) return null;

  return (
    <section className="bg-sale text-sale-foreground">
      <Link href="/special-prices/" className="block max-w-[1400px] mx-auto px-4 py-7 md:py-9 group">
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">

          <div className="flex items-baseline gap-3 md:gap-4">
            <span className="text-[54px] md:text-[86px] font-black leading-[0.8] tracking-[-0.06em] tabular-nums">
              {SALE_MAX_OFF}
            </span>
            <span className="text-[22px] md:text-[34px] font-black tracking-[-0.03em]">% OFF</span>
            <span className="text-[11px] md:text-[12px] uppercase tracking-[0.16em] text-white/75 pb-1 md:pb-2">
              hasta
            </span>
          </div>

          <div className="min-w-[190px]">
            <p className="text-[22px] md:text-[30px] font-black uppercase leading-none tracking-[-0.03em]">
              Winter Sale
            </p>
            <p className="mt-2 text-[13px] md:text-[14px] text-white/85">
              Todo el catálogo en oferta · hasta el {SALE_END_LABEL}
            </p>
          </div>

          <span className="inline-flex items-center gap-2 bg-white text-sale px-6 py-3 text-[12px] font-extrabold uppercase tracking-[0.12em] group-hover:gap-3 transition-[gap]">
            Ver el sale
            <span aria-hidden="true">→</span>
          </span>

        </div>
      </Link>
    </section>
  );
}
