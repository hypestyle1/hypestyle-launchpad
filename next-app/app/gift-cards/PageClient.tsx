'use client';

import { useState } from 'react';
import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { GiftCard } from '@/components/GiftCard';
import { DynamicButton } from '@/components/ui/dynamic-button';
import { useCart } from '@/context/CartContext';
import { useReveal } from '@/hooks/useReveal';
import {
  GIFT_CARD_SLUG,
  GIFT_CARD_PRESETS,
  GIFT_CARD_MIN,
  GIFT_CARD_MAX,
  GIFT_CARD_STEP,
  clampGiftAmount,
  formatGiftAmount,
  giftCardTone,
  GIFT_CARD_TONE_LABEL,
  type GiftData,
} from '@/lib/gift-card';

const PASOS = [
  { titulo: 'Elegís el monto', texto: 'De $50.000 en adelante, de a $50.000. El color de la tarjeta cambia con el monto.' },
  { titulo: 'Llega por mail', texto: 'Apenas se acredita el pago. A vos siempre; a quien se la regalás, si querés, con tu mensaje y en la fecha que elijas.' },
  { titulo: 'Se usa en el checkout', texto: 'El código va en el dorso y se carga en el campo de descuento. El saldo que sobra queda para la próxima compra. Vale 12 meses desde la emisión.' },
];

const CONDICIONES = [
  'Producto digital: llega por mail apenas se acredita el pago. No se envía nada físico.',
  'Vale 12 meses desde la emisión, en hypestyle.com.ar. Se puede usar en más de una compra hasta agotar el saldo.',
  'Una gift card no se puede usar para comprar otra gift card ni se canjea por dinero.',
  'Todas las ventas de gift cards son definitivas: sin cambios ni devoluciones.',
];

const inputClass =
  'w-full border border-border bg-transparent px-4 py-3 text-[14px] outline-none transition-colors focus:border-foreground placeholder:text-muted-foreground';

export default function GiftCardsClient() {
  const heroRef = useReveal();
  const pasosRef = useReveal();
  const { add, setDrawerOpen } = useCart();

  const [monto, setMonto] = useState(100000);
  const [otroRaw, setOtroRaw] = useState('');
  const [dorso, setDorso] = useState(false);
  const [esRegalo, setEsRegalo] = useState(false);
  const [gift, setGift] = useState<GiftData>({});
  const [agregado, setAgregado] = useState(false);

  const esPreset = GIFT_CARD_PRESETS.includes(monto);

  const commitOtro = () => {
    const n = Number(otroRaw.replace(/\D/g, ''));
    if (!n) return;
    const v = clampGiftAmount(n);
    setMonto(v);
    setOtroRaw(String(v));
  };

  const emailOk = !esRegalo || !gift.paraEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gift.paraEmail);

  const agregar = () => {
    if (!emailOk) return;
    const g: GiftData | undefined = esRegalo
      ? {
          paraEmail: gift.paraEmail?.trim() || undefined,
          paraNombre: gift.paraNombre?.trim() || undefined,
          deNombre: gift.deNombre?.trim() || undefined,
          mensaje: gift.mensaje?.trim().slice(0, 200) || undefined,
          enviarEl: gift.enviarEl || undefined,
        }
      : undefined;
    add({
      id: GIFT_CARD_SLUG,
      name: `Gift Card ${GIFT_CARD_TONE_LABEL[giftCardTone(monto)]}`,
      price: monto,
      image: '',
      size: 'U',
      quantity: 1,
      customization: g ? { playerName: '', number: '', gift: g } : undefined,
    });
    setAgregado(true);
    setDrawerOpen(true);
    window.setTimeout(() => setAgregado(false), 1800);
  };

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">
        <section ref={heroRef} className="px-4 py-12 md:py-20">
          <div className="mx-auto grid max-w-[1100px] items-start gap-10 md:grid-cols-[1.1fr_1fr] md:gap-16">
            {/* La tarjeta. Click para darla vuelta. */}
            <div className="reveal rd1 md:sticky md:top-[calc(var(--offset)+24px)]">
              <GiftCard monto={monto} dorso={dorso} onClick={() => setDorso((d) => !d)} className="cursor-pointer" />
              <p className="mt-3 text-center text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                {dorso ? 'El código llega por mail' : 'Tocá la tarjeta para ver el dorso'}
              </p>
            </div>

            <div className="reveal rd2">
              <p className="mb-4 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Gift card</p>
              <h1 className="text-[30px] font-semibold leading-[1.1] md:text-[40px]">
                Regalá crédito, que elija la prenda.
              </h1>
              <p className="mt-4 text-[15px] leading-[1.7] text-muted-foreground">
                El talle, el color y el fit los decide quien la recibe. Vos ponés el monto.
              </p>

              {/* Monto */}
              <div className="mt-8">
                <div className="mb-3 flex items-baseline justify-between">
                  <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Monto</span>
                  <span className="text-[13px] font-semibold">{formatGiftAmount(monto)}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {GIFT_CARD_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { setMonto(p); setOtroRaw(''); }}
                      aria-pressed={monto === p}
                      className={`border px-2 py-2.5 text-[12px] font-semibold tabular-nums transition-colors ${
                        monto === p ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-foreground'
                      }`}
                    >
                      {p / 1000}k
                    </button>
                  ))}
                </div>
                <label className="mt-3 block">
                  <span className="sr-only">Otro monto</span>
                  <div className={`flex items-center border transition-colors focus-within:border-foreground ${!esPreset ? 'border-foreground' : 'border-border'}`}>
                    <span className="pl-4 text-[14px] text-muted-foreground">Otro monto: $</span>
                    <input
                      inputMode="numeric"
                      placeholder={`de ${GIFT_CARD_MIN / 1000}k a ${GIFT_CARD_MAX / 1000}k, de a ${GIFT_CARD_STEP / 1000}k`}
                      value={otroRaw ? Number(otroRaw).toLocaleString('es-AR') : ''}
                      onChange={(e) => setOtroRaw(e.target.value.replace(/\D/g, ''))}
                      onBlur={commitOtro}
                      onKeyDown={(e) => e.key === 'Enter' && commitOtro()}
                      className="w-full bg-transparent px-2 py-3 text-[14px] font-semibold outline-none"
                    />
                  </div>
                </label>
              </div>

              {/* Regalo */}
              <label className="mt-8 flex cursor-pointer items-center gap-3">
                <input type="checkbox" checked={esRegalo} onChange={(e) => setEsRegalo(e.target.checked)} className="h-4 w-4 accent-black" />
                <span className="text-[14px]">Quiero mandarla como regalo</span>
              </label>

              {esRegalo && (
                <div className="mt-4 space-y-2">
                  <input
                    type="email"
                    placeholder="Email de quien la recibe"
                    value={gift.paraEmail ?? ''}
                    onChange={(e) => setGift({ ...gift, paraEmail: e.target.value })}
                    className={`${inputClass} ${!emailOk ? 'border-destructive' : ''}`}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="Su nombre (opcional)"
                      value={gift.paraNombre ?? ''}
                      onChange={(e) => setGift({ ...gift, paraNombre: e.target.value })}
                      className={inputClass}
                    />
                    <input
                      placeholder="Tu nombre (opcional)"
                      value={gift.deNombre ?? ''}
                      onChange={(e) => setGift({ ...gift, deNombre: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <textarea
                      placeholder="Mensaje (opcional)"
                      maxLength={200}
                      rows={3}
                      value={gift.mensaje ?? ''}
                      onChange={(e) => setGift({ ...gift, mensaje: e.target.value })}
                      className={`${inputClass} resize-none`}
                    />
                    <p className="mt-1 text-right text-[11px] text-muted-foreground">{(gift.mensaje ?? '').length}/200</p>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Mandar el (opcional)</span>
                    <input
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      value={gift.enviarEl ?? ''}
                      onChange={(e) => setGift({ ...gift, enviarEl: e.target.value })}
                      className={inputClass}
                    />
                  </label>
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    Sin email, la tarjeta te llega sólo a vos y la reenviás como quieras.
                  </p>
                </div>
              )}

              <DynamicButton
                width="full"
                onClick={agregar}
                disabled={!emailOk}
                className="mt-8 bg-bg-dark px-8 py-4 text-[12px] font-bold uppercase tracking-[0.1em] text-primary-foreground hover:bg-bg-dark/85 disabled:opacity-60"
              >
                {agregado ? 'Agregada al carrito' : `Agregar al carrito · ${formatGiftAmount(monto)}`}
              </DynamicButton>

              <details className="mt-6 border-t border-border pt-4">
                <summary className="cursor-pointer text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  Condiciones
                </summary>
                <ul className="mt-3 space-y-2">
                  {CONDICIONES.map((c) => (
                    <li key={c} className="text-[12px] leading-relaxed text-muted-foreground">{c}</li>
                  ))}
                </ul>
              </details>
            </div>
          </div>
        </section>

        <section ref={pasosRef} className="border-t border-border px-4 py-16 md:py-20">
          <div className="mx-auto grid max-w-[1100px] gap-10 md:grid-cols-3 md:gap-8">
            {PASOS.map((paso, i) => (
              <div key={paso.titulo} className={`reveal rd${i + 1}`}>
                <p className="mb-3 text-[11px] tracking-[0.15em] text-muted-foreground">0{i + 1}</p>
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
