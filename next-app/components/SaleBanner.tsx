'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SALE_DESCRIPTOR, SALE_MAX_OFF, SALE_NOMBRE, SALE_URGENCIA, isSaleActive } from '@/lib/sale';

/**
 * Banda de Cold Archive en el home.
 *
 * Se renderiza desde el servidor a propósito. El home es estático y no
 * revalida, así que el patrón de "arrancar apagado y encender en un efecto"
 * —el que usan FlashSaleSection y Promo3x2Section— haría aparecer una banda
 * después de hidratar: es CLS, justo lo que se corrigió en el PR #314.
 *
 * Como contrapartida el HTML estático puede quedar viejo cuando la campaña
 * termine, así que el cliente la apaga si la fecha ya pasó. El efecto corre
 * después de la hidratación, no es un mismatch.
 */

const BENEFICIOS = [
  'Envío gratis desde $180.000',
  '10% extra por transferencia',
  '3 cuotas sin interés',
  'Regalo desde $90.000',
];

export default function SaleBanner() {
  const [terminado, setTerminado] = useState(false);

  useEffect(() => {
    if (!isSaleActive()) setTerminado(true);
  }, []);

  if (terminado) return null;

  return (
    <section className="bg-sale text-sale-foreground">
      <Link href="/special-prices/" className="block max-w-[1400px] mx-auto px-4 py-8 md:py-10 group">

        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-7">

          {/* Wordmark: el nombre manda, el descriptor explica */}
          <div className="leading-none">
            <p className="text-[30px] md:text-[46px] font-black italic uppercase tracking-[-0.045em]">
              {SALE_NOMBRE}<span className="text-white/55">.</span>
            </p>
            <p className="mt-2.5 text-[10px] md:text-[11px] font-medium uppercase tracking-[0.3em] text-white/65">
              {SALE_DESCRIPTOR}
            </p>
          </div>

          {/* La cifra: "hasta" arriba, no colgando al final */}
          <div className="leading-none">
            <p className="text-[10px] md:text-[11px] font-medium uppercase tracking-[0.28em] text-white/65 mb-2">
              Hasta
            </p>
            <p className="flex items-baseline gap-1.5">
              <span className="text-[56px] md:text-[80px] font-black tracking-[-0.05em] tabular-nums">
                {SALE_MAX_OFF}
              </span>
              <span className="text-[24px] md:text-[34px] font-black tracking-[-0.02em]">% OFF</span>
            </p>
          </div>

          {/* Todos los beneficios juntos, no de a uno */}
          <ul className="flex flex-col gap-1.5 text-[13px] md:text-[14px] text-white/90">
            {BENEFICIOS.map(b => (
              <li key={b} className="flex items-center gap-2.5">
                <span aria-hidden="true" className="w-1 h-1 bg-white/55 shrink-0" />
                {b}
              </li>
            ))}
          </ul>

          <span className="inline-flex items-center gap-2 bg-white text-sale px-7 py-3.5 text-[12px] font-extrabold uppercase tracking-[0.12em] group-hover:gap-3 transition-[gap]">
            Ver el sale
            <span aria-hidden="true">→</span>
          </span>

        </div>

        <p className="mt-6 pt-5 border-t border-white/25 text-[11px] uppercase tracking-[0.22em] text-white/60">
          Todo el catálogo en oferta · {SALE_URGENCIA}
        </p>

      </Link>
    </section>
  );
}
