'use client';

import Link from 'next/link';
import { useState } from 'react';
import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  GiftCard,
  GIFT_CARD_TIERS,
  GIFT_CARD_CUSTOM,
  GIFT_CARD_CUSTOM_MIN,
  GIFT_CARD_CUSTOM_MAX,
  GIFT_CARD_CUSTOM_STEP,
  formatGiftAmount,
} from '@/components/GiftCard';
import { useReveal } from '@/hooks/useReveal';

const clampMonto = (n: number) =>
  Math.min(
    GIFT_CARD_CUSTOM_MAX,
    Math.max(GIFT_CARD_CUSTOM_MIN, Math.round(n / GIFT_CARD_CUSTOM_STEP) * GIFT_CARD_CUSTOM_STEP),
  );

const PASOS = [
  {
    titulo: 'Elegís el monto',
    texto: 'Tres montos fijos. El que compres es el crédito que recibe la persona, entero.',
  },
  {
    titulo: 'Te llega el código',
    texto:
      'Apenas se acredita el pago te mandamos por mail el código y la tarjeta lista para reenviar.',
  },
  {
    titulo: 'Lo usa cuando quiere',
    texto:
      'El código se carga en el checkout y se descuenta del total. No vence y se puede usar en más de una compra.',
  },
];

export default function GiftCardsClient() {
  const heroRef = useReveal();
  const cardsRef = useReveal();
  const customRef = useReveal();
  const pasosRef = useReveal();

  // Monto de la tarjeta a medida. Se escribe libre y se redondea al paso al
  // salir del campo, así el número no salta mientras se tipea.
  const [monto, setMonto] = useState(150000);
  const [montoRaw, setMontoRaw] = useState('150000');
  const commitMonto = () => {
    const n = clampMonto(Number(montoRaw.replace(/\D/g, '')) || GIFT_CARD_CUSTOM_MIN);
    setMonto(n);
    setMontoRaw(String(n));
  };

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">
        <section ref={heroRef} className="px-4 py-16 md:py-24">
          <div className="mx-auto max-w-[720px] text-center">
            <p className="reveal rd1 mb-5 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              Gift cards
            </p>
            <h1 className="reveal rd2 text-[32px] font-semibold leading-[1.15] md:text-[48px]">
              Regalá crédito, que elija la prenda.
            </h1>
            <p className="reveal rd3 mx-auto mt-6 max-w-[520px] text-[15px] leading-[1.7] text-muted-foreground">
              El talle, el color y el fit los decide quien la recibe. Vos ponés el monto.
            </p>
          </div>
        </section>

        <section ref={cardsRef} className="px-4 pb-16 md:pb-24">
          <div className="mx-auto grid max-w-[1100px] gap-8 md:grid-cols-3 md:gap-6">
            {GIFT_CARD_TIERS.map((tier, i) => (
              <div key={tier.slug} className={`reveal rd${i + 1}`}>
                <GiftCard tier={tier} />
                <div className="mt-5 text-center">
                  <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                    {tier.nombre}
                  </p>
                  <Link
                    href={`/producto/${tier.slug}/`}
                    className="mt-3 inline-flex w-full items-center justify-center bg-bg-dark px-8 py-3.5 text-[12px] font-bold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-bg-dark/85"
                  >
                    Regalar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* A medida: monto libre. */}
        <section ref={customRef} className="border-t border-border px-4 py-16 md:py-24">
          <div className="mx-auto grid max-w-[1100px] items-center gap-10 md:grid-cols-2 md:gap-16">
            <div className="reveal rd1">
              <GiftCard tier={GIFT_CARD_CUSTOM} monto={monto} />
            </div>
            <div className="reveal rd2">
              <p className="mb-4 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                A medida
              </p>
              <h2 className="text-[26px] font-semibold leading-[1.15] md:text-[32px]">
                Vos ponés el número.
              </h2>
              <p className="mt-4 max-w-[420px] text-[14px] leading-[1.7] text-muted-foreground">
                Entre {formatGiftAmount(GIFT_CARD_CUSTOM_MIN)} y {formatGiftAmount(GIFT_CARD_CUSTOM_MAX)},
                en pasos de {formatGiftAmount(GIFT_CARD_CUSTOM_STEP)}.
              </p>

              <label className="mt-8 block">
                <span className="mb-2 block text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  Monto
                </span>
                <div className="flex items-center border border-border focus-within:border-foreground">
                  <span className="pl-4 text-[16px] text-muted-foreground">$</span>
                  <input
                    inputMode="numeric"
                    value={montoRaw ? Number(montoRaw).toLocaleString('es-AR') : ''}
                    onChange={(e) => setMontoRaw(e.target.value.replace(/\D/g, ''))}
                    onBlur={commitMonto}
                    onKeyDown={(e) => e.key === 'Enter' && commitMonto()}
                    className="w-full bg-transparent px-3 py-3.5 text-[18px] font-semibold outline-none"
                    aria-label="Monto de la gift card"
                  />
                </div>
              </label>

              <input
                type="range"
                min={GIFT_CARD_CUSTOM_MIN}
                max={GIFT_CARD_CUSTOM_MAX}
                step={GIFT_CARD_CUSTOM_STEP}
                value={monto}
                onChange={(e) => { const n = Number(e.target.value); setMonto(n); setMontoRaw(String(n)); }}
                className="mt-4 w-full accent-black"
                aria-label="Elegir monto"
              />

              <Link
                href={`/producto/${GIFT_CARD_CUSTOM.slug}/?monto=${monto}`}
                className="mt-8 inline-flex w-full items-center justify-center bg-bg-dark px-8 py-3.5 text-[12px] font-bold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-bg-dark/85 md:w-auto md:px-12"
              >
                Regalar {formatGiftAmount(monto)}
              </Link>
            </div>
          </div>
        </section>

        <section ref={pasosRef} className="border-t border-border px-4 py-16 md:py-20">
          <div className="mx-auto grid max-w-[1100px] gap-10 md:grid-cols-3 md:gap-8">
            {PASOS.map((paso, i) => (
              <div key={paso.titulo} className={`reveal rd${i + 1}`}>
                <p className="mb-3 text-[11px] tracking-[0.15em] text-muted-foreground">
                  0{i + 1}
                </p>
                <h2 className="mb-2 text-[16px] font-semibold">{paso.titulo}</h2>
                <p className="text-[14px] leading-[1.7] text-muted-foreground">{paso.texto}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
