'use client';

import GiftProgressBar from '@/components/GiftProgressBar';
import { HYPE72_PRECIOS_APROBADOS } from '@/lib/hype72-home';

/**
 * Escalera de regalos — bloque 04 del takeover.
 *
 * ARRIBA DE LOS PACKS, no al final: un beneficio por umbral solo cambia una
 * decisión si el cliente lo conoce ANTES de armar el carrito. Abajo del todo
 * llega tarde.
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  HOY NO SE PUBLICA LA ESCALERA. NO HAY STOCK PARA SOSTENERLA.            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Al 25/10/2026: 3 cadenas en stock contra ~35 que haría falta. El umbral ║
 * ║  más bajo todavía no es una promesa que se pueda cumplir, así que no se  ║
 * ║  anuncia ningún monto.                                                   ║
 * ║                                                                          ║
 * ║  Con `HYPE72_PRECIOS_APROBADOS = false` esta sección dice "Regalo por    ║
 * ║  compra" y la mecánica, SIN umbrales. Nada más.                          ║
 * ║                                                                          ║
 * ║  Cuando esté aprobado y haya stock, poner el interruptor en `true`: ahí  ║
 * ║  entra `GiftProgressBar`, que es el componente que YA existe y que ya    ║
 * ║  usa el carrito. Los umbrales NO se escriben acá: los trae el plugin     ║
 * ║  Purchase Gift por `/api/gift-progress`, que es la fuente de verdad, y   ║
 * ║  el regalo definitivo se vuelve a calcular server-side al crear la       ║
 * ║  orden. Así la home no puede prometer un umbral distinto del que cobra   ║
 * ║  el checkout.                                                            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Nota: mientras el interruptor esté en `false` esta sección NO pega a
 * `/api/gift-progress` (GiftProgressBar ni se monta), así que no suma una
 * consulta a WordPress por visitante del home.
 */
export default function Hype72Regalos() {
  return (
    <section
      id="hype72-regalos"
      className="max-w-[1400px] mx-auto px-4 py-8 md:py-12 scroll-mt-[var(--offset)]"
      aria-label="Regalo por compra"
    >
      <div className="border border-border p-5 md:p-8">
        <div className="flex flex-col gap-2 md:gap-2.5">
          <span
            className="text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: 'var(--hype72-acento)' }}
          >
            Regalo por compra
          </span>
          <h2 className="text-[20px] md:text-[26px] font-semibold leading-tight tracking-[-0.02em] max-w-[24ch] md:max-w-none">
            Durante las 72 horas, tu pedido viene con regalo.
          </h2>
          {/* Sin umbrales, sin montos, sin porcentajes. El regalo que
              corresponde lo muestra el carrito, que es donde se calcula. */}
          <p className="text-[12px] md:text-[13px] text-muted-foreground max-w-[46ch]">
            El regalo se suma solo al carrito cuando corresponde. Lo ves ahí
            antes de pagar.
          </p>
        </div>

        {HYPE72_PRECIOS_APROBADOS && (
          <div className="mt-5 border-t border-border pt-4">
            {/* Los umbrales salen del plugin, no de este archivo. Con el
                carrito vacío GiftProgressBar devuelve null solo. */}
            <GiftProgressBar className="" />
          </div>
        )}
      </div>
    </section>
  );
}
