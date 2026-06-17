'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useLocale } from '@/context/LocaleContext';
import { createOrderAndPreference } from '@/lib/wc-client';
import { getFbCookies } from '@/lib/fbtracking';
import { imgSrc } from '@/lib/img';

type Step = 'info' | 'envio' | 'pago';

const PROVINCIAS = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán',
];

const COUNTRIES = [
  { code: 'AR', name: 'Argentina' },
  { code: '', name: '──────────────' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: '', name: '──────────────' },
  { code: 'ES', name: 'Spain' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'PT', name: 'Portugal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AT', name: 'Austria' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'IE', name: 'Ireland' },
  { code: 'PL', name: 'Poland' },
  { code: 'GR', name: 'Greece' },
  { code: '', name: '──────────────' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'PE', name: 'Peru' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'EC', name: 'Ecuador' },
  { code: '', name: '──────────────' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'SG', name: 'Singapore' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'IN', name: 'India' },
  { code: 'CN', name: 'China' },
  { code: '', name: '──────────────' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'IL', name: 'Israel' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'OTHER', name: 'Other country' },
];

const INTL_RATE = { id: 'dhl_international', label: 'International Shipping — DHL Express', cost: 0 };
const FREE_SHIPPING_THRESHOLD = 250000;

interface ShippingRate { id: string; label: string; cost: number }
interface AndBranch { id: string; label: string; direccion: string }
interface InfoForm {
  email: string; newsletter: boolean; nombre: string; apellido: string; dni: string;
  direccion: string; depto: string; cp: string; ciudad: string; provincia: string; pais: string; telefono: string;
}
interface PagoForm { metodo: string; instagram: string }

export default function Checkout() {
  const { items, total, clear } = useCart();
  const router = useRouter();
  const { formatPrice, currency } = useLocale();
  const [step, setStep] = useState<Step>('info');
  const [coupon, setCoupon] = useState('');
  const [couponData, setCouponData] = useState<{ code: string; type: string; amount: number; description?: string; free_shipping?: boolean } | null>(null);
  const [couponValidating, setCouponValidating] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [info, setInfo] = useState<InfoForm>({
    email: '', newsletter: false, nombre: '', apellido: '', dni: '',
    direccion: '', depto: '', cp: '', ciudad: '', provincia: 'Buenos Aires', pais: 'AR', telefono: '',
  });
  const [pago, setPago] = useState<PagoForm>({ metodo: '', instagram: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);

  const [branches, setBranches] = useState<AndBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<AndBranch | null>(null);
  const [loadingBranches, setLoadingBranches] = useState(false);

  const isInternational = info.pais !== 'AR';
  const isSucursal = !isInternational && (selectedRate?.label?.toLowerCase().includes('sucursal') || selectedRate?.id?.toLowerCase().includes('sucursal'));
  const branchReady = isInternational || !isSucursal || !!selectedBranch;

  const subtotal = total;
  // El cupón de envío gratis cero-ea Andreani igual que el umbral de $250.000.
  const couponFreeShip = !isInternational && !!couponData?.free_shipping;
  const freeShipping = !isInternational && (subtotal >= FREE_SHIPPING_THRESHOLD || couponFreeShip);
  const envioCosto = freeShipping ? 0 : (selectedRate?.cost ?? 0);
  const shippingReady = isInternational ? !!selectedRate : freeShipping || !!selectedRate;
  const descuento = couponData ? (
    couponData.type === 'percent' ? Math.round(subtotal * (couponData.amount / 100)) : couponData.amount
  ) : 0;
  const envioEnPaso = step === 'pago' || step === 'envio' ? envioCosto : 0;
  const totalFinal = subtotal - descuento + envioEnPaso;
  const transferTotal = Math.round(subtotal * 0.90) - descuento + envioEnPaso;

  const handleCountryChange = (pais: string) => {
    const provincia = pais === 'AR' ? 'Buenos Aires' : '';
    setInfo(prev => ({ ...prev, pais, provincia }));
    setSelectedRate(null);
    setShippingRates([]);
    setRatesError(null);
    setBranches([]);
    setSelectedBranch(null);
    setPago(prev => ({ ...prev, metodo: '' }));
  };

  const fetchRates = async () => {
    if (!info.cp) return;
    setLoadingRates(true);
    setRatesError(null);
    setShippingRates([]);
    setSelectedRate(null);
    setBranches([]);
    setSelectedBranch(null);
    try {
      const res = await fetch(
        `/api/andreani-rates?cp=${encodeURIComponent(info.cp)}&provincia=${encodeURIComponent(info.provincia)}&valor=${subtotal}&peso=0.5`
      );
      const data: { rates?: ShippingRate[]; error?: string } = await res.json();
      if (data.rates && data.rates.length > 0) {
        setShippingRates(data.rates);
        setSelectedRate(data.rates[0]);
      } else {
        setRatesError('No se encontraron opciones de envío para este código postal.');
      }
    } catch {
      setRatesError('No se pudo calcular el envío. Intentá de nuevo.');
    } finally {
      setLoadingRates(false);
    }
  };

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('envio');
    if (isInternational) {
      setSelectedRate(INTL_RATE);
      setShippingRates([INTL_RATE]);
      setLoadingRates(false);
      setRatesError(null);
    } else {
      fetchRates();
    }
  };

  const fetchBranches = async (rate: ShippingRate) => {
    const isSuc = rate.label?.toLowerCase().includes('sucursal') || rate.id?.toLowerCase().includes('sucursal');
    if (!isSuc) { setBranches([]); setSelectedBranch(null); return; }
    setLoadingBranches(true);
    setBranches([]);
    setSelectedBranch(null);
    try {
      const res = await fetch(`/api/andreani-branches?cp=${encodeURIComponent(info.cp)}`);
      const data: { branches?: AndBranch[] } = await res.json();
      setBranches(data.branches ?? []);
    } catch {
      setBranches([]);
    } finally {
      setLoadingBranches(false);
    }
  };

  const handleRateSelect = (rate: ShippingRate) => {
    setSelectedRate(rate);
    fetchBranches(rate);
  };

  const handlePagoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pago.metodo || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const isTransfer      = pago.metodo === 'transferencia';
    const isLocalTransfer = isTransfer && !isInternational;
    const isPaypal        = pago.metodo === 'paypal';
    const isMp            = pago.metodo === 'mercadopago' || pago.metodo === 'tarjeta';
    const isGocuotas      = pago.metodo === 'gocuotas';
    try {
      let orderRes;
      try {
        orderRes = await createOrderAndPreference({
          items: items.map(item => ({ id: item.id, slug: item.id, name: item.name, price: item.price, quantity: item.quantity, size: item.size, image: item.image, customization: item.customization })),
          customer: { email: info.email, nombre: info.nombre, apellido: info.apellido, dni: info.dni, direccion: info.direccion, depto: info.depto, cp: info.cp, ciudad: info.ciudad, provincia: info.provincia, pais: info.pais, telefono: info.telefono, instagram: pago.instagram },
          shipping: envioCosto,
          discountAmount: (isLocalTransfer ? Math.round(subtotal * 0.10) : 0),
          couponCode: couponData?.code,
          paymentMethod: pago.metodo,
          shippingMethodId: selectedRate?.id,
          shippingLabel: selectedRate?.label,
          shippingBranch: selectedBranch ? `${selectedBranch.label} — ${selectedBranch.direccion}` : undefined,
          ...getFbCookies(),
        });
      } catch (wcErr) {
        console.error('[checkout] create-order error:', wcErr);
        setSubmitError('Error al crear el pedido. Revisá tu conexión e intentá de nuevo.');
        setSubmitting(false);
        return;
      }
      sessionStorage.setItem('hype_order', JSON.stringify({
        wcOrderId: orderRes.wcOrderId, wcOrderNumber: orderRes.wcOrderNumber,
        orderKey: orderRes.orderKey,
        orderNum: orderRes.wcOrderNumber, items,
        total: isLocalTransfer ? transferTotal : totalFinal,
        metodo: pago.metodo, email: info.email, nombre: info.nombre, apellido: info.apellido,
        direccion: info.direccion, ciudad: info.ciudad, provincia: info.provincia,
        cp: info.cp, telefono: info.telefono, pais: info.pais,
      }));
      if (isGocuotas) {
        let gcRes;
        try {
          gcRes = await fetch('/api/gocuotas-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              wcOrderId: orderRes.wcOrderId,
              total: totalFinal,
              email: info.email,
              phone: info.telefono,
              orderKey: orderRes.orderKey,
            }),
          });
        } catch {
          setSubmitError('Error de red al conectar con GOcuotas. Intentá de nuevo.');
          setSubmitting(false);
          return;
        }
        if (!gcRes.ok) {
          const errData = await gcRes.json().catch(() => ({})) as { error?: string };
          setSubmitError(`GOcuotas: ${errData.error || 'Error al iniciar el pago'}. Intentá de nuevo.`);
          setSubmitting(false);
          return;
        }
        const gcData = await gcRes.json() as { urlInit?: string };
        if (!gcData.urlInit) {
          setSubmitError('GOcuotas no devolvió un link de pago. Intentá de nuevo.');
          setSubmitting(false);
          return;
        }
        clear();
        window.location.href = gcData.urlInit;
        return;
      }
      if (isMp && !orderRes.initPoint) {
        setSubmitError('No se pudo iniciar el pago con MercadoPago. Intentá de nuevo o elegí otro método.');
        setSubmitting(false);
        return;
      }
      if (isPaypal) {
        let ppRes;
        try {
          ppRes = await fetch('/api/paypal-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wcOrderId: orderRes.wcOrderId, totalARS: totalFinal }),
          });
        } catch (ppErr) {
          console.error('[checkout] paypal-order fetch error:', ppErr);
          setSubmitError('Error de red al conectar con PayPal. Intentá de nuevo.');
          setSubmitting(false);
          return;
        }
        if (!ppRes.ok) {
          const errData = await ppRes.json().catch(() => ({})) as { error?: string };
          console.error('[checkout] paypal-order non-ok:', ppRes.status, errData);
          setSubmitError(`PayPal: ${errData.error || 'Error ' + ppRes.status}. Intentá de nuevo.`);
          setSubmitting(false);
          return;
        }
        const ppData = await ppRes.json() as { approvalUrl?: string };
        if (!ppData.approvalUrl) {
          setSubmitError('PayPal no devolvió un link de pago. Intentá de nuevo.');
          setSubmitting(false);
          return;
        }
        clear();
        window.location.href = ppData.approvalUrl;
        return;
      }
      clear();
      if (isMp && orderRes.initPoint) { window.location.href = orderRes.initPoint; }
      else if (isTransfer)            { router.push('/pendiente-de-pago/'); }
      else                            { router.push('/confirmacion/'); }
    } catch (err) {
      console.error('[checkout] unexpected error:', err);
      setSubmitError('Error inesperado. Revisá la consola del navegador.');
      setSubmitting(false);
    }
  };

  if (items.length === 0 && step === 'info') return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4">
      <p className="text-[14px] text-muted-foreground">Tu carrito está vacío.</p>
      <a href="/" className="text-[13px] underline">Volver al inicio</a>
    </div>
  );

  const stepLabel = (s: Step) => ({ info: 'Información', envio: 'Envío', pago: 'Pago' }[s]);
  const steps: Step[] = ['info', 'envio', 'pago'];

  const paymentMethods = [
    !isInternational && { id: 'tarjeta',       label: 'Tarjeta de crédito o débito',       sub: 'Hasta 3 cuotas sin interés' },
    !isInternational && { id: 'gocuotas',      label: '4 cuotas con débito sin interés',   sub: 'Con tu tarjeta de débito · sin interés' },
    !isInternational && { id: 'transferencia', label: 'Transferencia o depósito bancario',  sub: currency === 'ARS' ? `Pagás ${formatPrice(transferTotal)} (10% off)` : '' },
    !isInternational && { id: 'mercadopago',   label: 'Mercado Pago',                       sub: '' },
                        { id: 'paypal',        label: 'PayPal',                             sub: isInternational ? 'Credit card, debit or PayPal balance' : '' },
    isInternational  && { id: 'transferencia', label: 'Bank transfer (USD wire)',             sub: 'Lead Bank · USD ACH/Wire · details shown after order' },
  ].filter(Boolean) as { id: string; label: string; sub: string }[];

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border py-5 px-4 text-center">
        <a href="/"><img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto object-contain mx-auto" /></a>
        <div className="flex items-center justify-center gap-2 mt-3 text-[12px]">
          {steps.map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              {i > 0 && <span className="text-muted-foreground">›</span>}
              <span className={step === s ? 'font-semibold text-foreground' : 'text-muted-foreground'}>{stepLabel(s)}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12">
        <div>
          {step === 'info' && (
            <form onSubmit={handleInfoSubmit} className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[15px] font-semibold">Contacto</h2>
                </div>
                <input type="email" placeholder="Email" required value={info.email}
                  onChange={e => setInfo({ ...info, email: e.target.value })}
                  className="w-full border border-border px-4 py-3 text-[13px] focus:outline-none focus:border-foreground transition-colors rounded-[10px]" />
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input type="checkbox" checked={info.newsletter} onChange={e => setInfo({ ...info, newsletter: e.target.checked })} className="w-4 h-4" />
                  <span className="text-[12px] text-muted-foreground">
                    {isInternational ? 'Get early access to drops & restocks' : 'Recibir novedades, drops y acceso anticipado'}
                  </span>
                </label>
              </div>

              <div>
                <h2 className="text-[15px] font-semibold mb-3">
                  {isInternational ? 'Shipping address' : 'Dirección de envío'}
                </h2>
                <div className="space-y-2">

                  {/* Country selector */}
                  <select
                    value={info.pais}
                    onChange={e => handleCountryChange(e.target.value)}
                    className="w-full border border-border px-4 py-3 text-[13px] focus:outline-none focus:border-foreground transition-colors bg-white rounded-[10px]"
                  >
                    {COUNTRIES.map((c, i) =>
                      c.code === ''
                        ? <option key={i} value="" disabled>{c.name}</option>
                        : <option key={c.code} value={c.code}>{c.name}</option>
                    )}
                  </select>

                  {/* International notice */}
                  {isInternational && (
                    <div className="flex items-start gap-2.5 bg-foreground/[0.03] border border-border px-4 py-3 rounded-[10px]">
                      <span className="text-[14px] mt-0.5">🌍</span>
                      <p className="text-[12px] text-foreground/70 leading-relaxed">
                        <span className="font-semibold text-foreground">Worldwide shipping available.</span>
                        {' '}Place your order and we&apos;ll contact you within 24 hours to confirm your DHL shipping cost and delivery estimate.
                      </p>
                    </div>
                  )}

                  {isInternational ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <input placeholder="First name" required value={info.nombre} onChange={e => setInfo({ ...info, nombre: e.target.value })} className="border border-border px-4 py-3 text-[13px] focus:outline-none focus:border-foreground transition-colors rounded-[10px]" />
                        <input placeholder="Last name" required value={info.apellido} onChange={e => setInfo({ ...info, apellido: e.target.value })} className="border border-border px-4 py-3 text-[13px] focus:outline-none focus:border-foreground transition-colors rounded-[10px]" />
                      </div>
                      <input placeholder="Address" required value={info.direccion} onChange={e => setInfo({ ...info, direccion: e.target.value })} className="w-full border border-border px-4 py-3 text-[13px] focus:outline-none focus:border-foreground transition-colors rounded-[10px]" />
                      <input placeholder="Apartment, suite (optional)" value={info.depto} onChange={e => setInfo({ ...info, depto: e.target.value })} className="w-full border border-border px-4 py-3 text-[13px] focus:outline-none focus:border-foreground transition-colors rounded-[10px]" />
                      <div className="grid grid-cols-2 gap-2">
                        <input placeholder="City" required value={info.ciudad} onChange={e => setInfo({ ...info, ciudad: e.target.value })} className="border border-border px-4 py-3 text-[13px] focus:outline-none focus:border-foreground transition-colors rounded-[10px]" />
                        <input placeholder="State / Province" value={info.provincia} onChange={e => setInfo({ ...info, provincia: e.target.value })} className="border border-border px-4 py-3 text-[13px] focus:outline-none focus:border-foreground transition-colors rounded-[10px]" />
                      </div>
                      <input placeholder="Postal / ZIP code" required value={info.cp} onChange={e => setInfo({ ...info, cp: e.target.value })} className="w-full border border-border px-4 py-3 text-[13px] focus:outline-none focus:border-foreground transition-colors rounded-[10px]" />
                      <input placeholder="Phone (with country code)" required value={info.telefono} onChange={e => setInfo({ ...info, telefono: e.target.value })} className="w-full border border-border px-4 py-3 text-[13px] focus:outline-none focus:border-foreground transition-colors rounded-[10px]" />
                    </>
                  ) : (
                    <>
                      <select value={info.provincia} onChange={e => setInfo({ ...info, provincia: e.target.value })}
                        className="w-full border border-border px-4 py-3 text-[13px] focus:outline-none focus:border-foreground transition-colors bg-white rounded-[10px]">
                        {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <input placeholder="Nombre" required value={info.nombre} onChange={e => setInfo({ ...info, nombre: e.target.value })} className="border border-border px-4 py-3 text-[13px] focus:outline-none focus:border-foreground transition-colors rounded-[10px]" />
                        <input placeholder="Apellido" required value={info.apellido} onChange={e => setInfo({ ...info, apellido: e.target.value })} className="border border-border px-4 py-3 text-[13px] focus:outline-none focus:border-foreground transition-colors rounded-[10px]" />
                      </div>
                      <input placeholder="DNI" required value={info.dni} onChange={e => setInfo({ ...info, dni: e.target.value })} className="w-full border border-border px-4 py-3 text-[13px] focus:outline-none focus:border-foreground transition-colors rounded-[10px]" />
                      <input placeholder="Dirección y número" required value={info.direccion} onChange={e => setInfo({ ...info, direccion: e.target.value })} className="w-full border border-border px-4 py-3 text-[13px] focus:outline-none focus:border-foreground transition-colors rounded-[10px]" />
                      <input placeholder="Departamento / Piso (opcional)" value={info.depto} onChange={e => setInfo({ ...info, depto: e.target.value })} className="w-full border border-border px-4 py-3 text-[13px] focus:outline-none focus:border-foreground transition-colors rounded-[10px]" />
                      <div className="grid grid-cols-2 gap-2">
                        <input placeholder="Código postal" required value={info.cp} onChange={e => setInfo({ ...info, cp: e.target.value })} className="border border-border px-4 py-3 text-[13px] focus:outline-none focus:border-foreground transition-colors rounded-[10px]" />
                        <input placeholder="Ciudad" required value={info.ciudad} onChange={e => setInfo({ ...info, ciudad: e.target.value })} className="border border-border px-4 py-3 text-[13px] focus:outline-none focus:border-foreground transition-colors rounded-[10px]" />
                      </div>
                      <input placeholder="Teléfono (con código de área)" required value={info.telefono} onChange={e => setInfo({ ...info, telefono: e.target.value })} className="w-full border border-border px-4 py-3 text-[13px] focus:outline-none focus:border-foreground transition-colors rounded-[10px]" />
                    </>
                  )}
                </div>
              </div>

              <button type="submit" className="w-full bg-bg-dark text-primary-foreground py-4 text-[12px] font-bold uppercase tracking-[0.1em] hover:bg-bg-dark/85 transition-colors rounded-[10px]">
                {isInternational ? 'Continue to shipping' : 'Continuar con el envío'}
              </button>
            </form>
          )}

          {step === 'envio' && (
            <form onSubmit={e => { e.preventDefault(); setStep('pago'); if (typeof window !== 'undefined' && window.fbq) { window.fbq('track', 'InitiateCheckout', { value: totalFinal, currency: 'ARS', num_items: items.reduce((s, i) => s + i.quantity, 0) }); } }} className="space-y-6">
              <div className="border border-border divide-y divide-border text-[13px] rounded-[10px] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex gap-2"><span className="text-muted-foreground">{isInternational ? 'Contact' : 'Contacto'}</span><span>{info.email}</span></div>
                  <button type="button" onClick={() => setStep('info')} className="underline text-muted-foreground hover:text-foreground transition-colors text-[12px]">{isInternational ? 'Change' : 'Cambiar'}</button>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex gap-2"><span className="text-muted-foreground">{isInternational ? 'Ship to' : 'Enviar a'}</span><span>{info.direccion}, {info.ciudad}{info.provincia ? `, ${info.provincia}` : ''}</span></div>
                  <button type="button" onClick={() => setStep('info')} className="underline text-muted-foreground hover:text-foreground transition-colors text-[12px]">{isInternational ? 'Change' : 'Cambiar'}</button>
                </div>
              </div>

              <div>
                <h2 className="text-[15px] font-semibold mb-3">
                  {isInternational ? 'Shipping method' : 'Método de envío'}
                </h2>

                {isInternational ? (
                  <div className="space-y-3">
                    <div className="border border-foreground bg-foreground/[0.03] px-4 py-4 rounded-[10px] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border-2 border-foreground flex items-center justify-center flex-shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
                        </div>
                        <div>
                          <p className="text-[13px] font-medium">International Shipping — DHL Express</p>
                          <p className="text-[11px] text-muted-foreground">Cost confirmed after purchase · door to door</p>
                        </div>
                      </div>
                      <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">TBD</span>
                    </div>
                    <div className="bg-foreground/[0.02] border border-border px-4 py-3.5 rounded-[10px] text-[12px] text-foreground/60 leading-relaxed">
                      Complete your order now — we&apos;ll email you within 24 h with your DHL shipping quote and estimated delivery time. No charge until you approve the shipping cost.
                    </div>
                  </div>
                ) : (
                  <>
                    {loadingRates && (
                      <div className="border border-border px-4 py-4 rounded-[10px] flex items-center gap-3">
                        <svg className="animate-spin w-4 h-4 text-muted-foreground flex-shrink-0" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        <p className="text-[13px] text-muted-foreground">Calculando opciones de envío para CP {info.cp}...</p>
                      </div>
                    )}

                    {ratesError && !loadingRates && (
                      <div className="space-y-3">
                        <p className="text-[12px] text-destructive bg-destructive/10 px-4 py-3 rounded-[8px]">{ratesError}</p>
                        <button type="button" onClick={fetchRates}
                          className="text-[12px] underline text-muted-foreground hover:text-foreground transition-colors">
                          Intentar de nuevo
                        </button>
                      </div>
                    )}

                    {!loadingRates && shippingRates.length > 0 && (
                      <div className="space-y-2">
                        {shippingRates.map(rate => (
                          <label key={rate.id} className={`flex items-center justify-between border px-4 py-4 cursor-pointer transition-colors rounded-[10px] ${selectedRate?.id === rate.id ? 'border-foreground bg-foreground/[0.03]' : 'border-border hover:border-foreground/40'}`}>
                            <div className="flex items-center gap-3">
                              <input type="radio" name="envio" checked={selectedRate?.id === rate.id}
                                onChange={() => handleRateSelect(rate)} className="w-4 h-4 accent-foreground" />
                              <div>
                                <p className="text-[13px] font-medium">{rate.label}</p>
                              </div>
                            </div>
                            {freeShipping ? (
                              <div className="text-right">
                                <span className="text-[12px] text-muted-foreground line-through block">{formatPrice(rate.cost)}</span>
                                <span className="text-[13px] font-semibold text-green-700">Gratis</span>
                              </div>
                            ) : (
                              <span className="text-[13px] font-semibold">{formatPrice(rate.cost)}</span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}

                    {isSucursal && (
                      <div className="mt-4">
                        <p className="text-[13px] font-semibold mb-2">Elegí tu sucursal Andreani</p>
                        {loadingBranches && (
                          <div className="flex items-center gap-2 text-[13px] text-muted-foreground px-4 py-3 border border-border rounded-[10px]">
                            <svg className="animate-spin w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                            Buscando sucursales cerca de CP {info.cp}...
                          </div>
                        )}
                        {!loadingBranches && branches.length > 0 && (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {branches.map(b => (
                              <label key={b.id} className={`flex items-start gap-3 border px-4 py-3 cursor-pointer transition-colors rounded-[10px] ${selectedBranch?.id === b.id ? 'border-foreground bg-foreground/[0.03]' : 'border-border hover:border-foreground/40'}`}>
                                <input type="radio" name="sucursal" checked={selectedBranch?.id === b.id}
                                  onChange={() => setSelectedBranch(b)} className="w-4 h-4 accent-foreground mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-[13px] font-medium">{b.label}</p>
                                  {b.direccion && <p className="text-[11px] text-muted-foreground">{b.direccion}</p>}
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                        {!loadingBranches && branches.length === 0 && (
                          <p className="text-[12px] text-muted-foreground px-4 py-3 border border-border rounded-[10px]">
                            No se encontraron sucursales para CP {info.cp}. Podés igualmente continuar y te contactamos para coordinar.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={() => setStep('info')} className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                  {isInternational ? '‹ Back to information' : '‹ Volver a información'}
                </button>
                <button type="submit" disabled={loadingRates || !shippingReady || !branchReady}
                  className="bg-bg-dark text-primary-foreground px-8 py-3.5 text-[12px] font-bold uppercase tracking-[0.1em] hover:bg-bg-dark/85 transition-colors rounded-[10px] disabled:opacity-60 disabled:cursor-not-allowed">
                  {isInternational ? 'Continue to payment' : 'Continuar con el pago'}
                </button>
              </div>
            </form>
          )}

          {step === 'pago' && (
            <form onSubmit={handlePagoSubmit} className="space-y-6">
              <div className="border border-border divide-y divide-border text-[13px] rounded-[10px] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex gap-2"><span className="text-muted-foreground">{isInternational ? 'Contact' : 'Contacto'}</span><span>{info.email}</span></div>
                  <button type="button" onClick={() => setStep('info')} className="underline text-muted-foreground hover:text-foreground transition-colors text-[12px]">{isInternational ? 'Change' : 'Cambiar'}</button>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex gap-2"><span className="text-muted-foreground">{isInternational ? 'Ship to' : 'Enviar a'}</span><span>{info.direccion}, {info.ciudad}</span></div>
                  <button type="button" onClick={() => setStep('info')} className="underline text-muted-foreground hover:text-foreground transition-colors text-[12px]">{isInternational ? 'Change' : 'Cambiar'}</button>
                </div>
                {selectedRate && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex gap-2 flex-col">
                      <div className="flex gap-2"><span className="text-muted-foreground">{isInternational ? 'Shipping' : 'Envío'}</span><span>{selectedRate.label}</span></div>
                      {selectedBranch && <span className="text-[11px] text-muted-foreground pl-0">{selectedBranch.label} — {selectedBranch.direccion}</span>}
                    </div>
                    <button type="button" onClick={() => setStep('envio')} className="underline text-muted-foreground hover:text-foreground transition-colors text-[12px] flex-shrink-0 ml-4">{isInternational ? 'Change' : 'Cambiar'}</button>
                  </div>
                )}
              </div>

              {isInternational && (
                <div className="flex items-start gap-2.5 bg-foreground/[0.02] border border-border px-4 py-3 rounded-[10px]">
                  <span className="text-[13px] mt-0.5">📦</span>
                  <p className="text-[12px] text-foreground/60 leading-relaxed">
                    Your DHL shipping cost will be confirmed by email within 24 hours. Your order won&apos;t ship until you approve the quote.
                  </p>
                </div>
              )}

              <div>
                <p className="text-[13px] font-semibold mb-1">
                  {isInternational ? 'Instagram (optional)' : <>Instagram <span className="text-destructive">*</span></>}
                </p>
                <textarea value={pago.instagram} onChange={e => setPago({ ...pago, instagram: e.target.value })}
                  placeholder="@yourusername" rows={2} required={!isInternational}
                  className="w-full border border-border px-4 py-3 text-[13px] focus:outline-none focus:border-foreground transition-colors resize-none rounded-[10px]" />
              </div>

              <div>
                <h2 className="text-[14px] font-bold uppercase tracking-wider mb-3">
                  {isInternational ? 'Payment method' : 'Medio de pago'}
                </h2>
                <div className="space-y-2">
                  {paymentMethods.map(m => (
                    <label key={m.id} className={`flex items-center gap-3 border px-4 py-3.5 cursor-pointer transition-colors rounded-[10px] ${pago.metodo === m.id ? 'border-foreground bg-foreground/[0.03]' : 'border-border hover:border-foreground/40'}`}>
                      <input type="radio" name="metodo" value={m.id} checked={pago.metodo === m.id} onChange={() => setPago({ ...pago, metodo: m.id })} className="w-4 h-4 accent-foreground" />
                      <div className="flex-1">
                        <p className="text-[13px] font-medium">{m.label}</p>
                        {m.sub && <p className={`text-[11px] ${m.id === 'transferencia' && !isInternational ? 'text-green-700 font-semibold' : 'text-muted-foreground'}`}>{m.sub}</p>}
                      </div>
                      <span className="text-foreground/30">›</span>
                    </label>
                  ))}
                </div>
                {!pago.metodo && <p className="text-[11px] text-destructive mt-1">{isInternational ? 'Select a payment method' : 'Seleccioná un medio de pago'}</p>}
              </div>

              {submitError && <p className="text-[12px] text-destructive bg-destructive/10 px-4 py-3 rounded-[8px]">{submitError}</p>}
              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={() => setStep('envio')} className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                  {isInternational ? '‹ Back to shipping' : '‹ Volver al envío'}
                </button>
                <button type="submit" disabled={submitting}
                  className="bg-bg-dark text-primary-foreground px-8 py-3.5 text-[12px] font-bold uppercase tracking-[0.1em] hover:bg-bg-dark/85 transition-colors rounded-[10px] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
                  {submitting ? (<><svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>{isInternational ? 'Processing...' : 'Procesando...'}</>) : (isInternational ? 'Place order' : 'Realizar pedido')}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Order summary */}
        <div className="lg:border-l lg:border-border lg:pl-10">
          <div className="sticky top-6">
            <div className="space-y-4 mb-6">
              {items.map(item => (
                <div key={`${item.id}-${item.size}-${item.customization?.number ?? ''}-${item.customization?.playerName ?? ''}`} className="flex gap-3 items-center">
                  <div className="relative w-16 h-20 bg-bg-alt flex-shrink-0 overflow-hidden rounded-[10px]">
                    {item.image ? (
                      <img
                        src={imgSrc(item.image)}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : null}
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground/60 text-white text-[10px] flex items-center justify-center font-bold">{item.quantity}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium leading-tight">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground">Talle: {item.size}</p>
                    {item.customization && (item.customization.playerName || item.customization.number) && (
                      <p className="text-[11px] text-foreground/70 font-medium">
                        Dorsal: {item.customization.number && `#${item.customization.number}`}{item.customization.playerName && ` ${item.customization.playerName}`}
                      </p>
                    )}
                  </div>
                  <span className="text-[13px] font-semibold">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5 mb-5">
              <div className="flex gap-2">
                <input type="text" placeholder={isInternational ? 'Discount code' : 'Código de descuento'} value={coupon}
                  onChange={e => { setCoupon(e.target.value); setCouponError(null); if (couponData) setCouponData(null); }}
                  className="flex-1 border border-border px-3 py-2.5 text-[12px] focus:outline-none focus:border-foreground transition-colors rounded-[10px]" />
                <button
                  onClick={async () => {
                    if (!coupon.trim() || couponValidating) return;
                    setCouponValidating(true);
                    setCouponError(null);
                    try {
                      const res = await fetch('/api/validate-coupon', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code: coupon, total: subtotal }),
                      });
                      const data = await res.json() as { valid: boolean; code?: string; type?: string; amount?: number; free_shipping?: boolean; error?: string };
                      if (data.valid && data.code && data.type && data.amount !== undefined) {
                        setCouponData({ code: data.code, type: data.type, amount: data.amount, free_shipping: data.free_shipping });
                      }
                      else { setCouponError(data.error || 'Código inválido'); }
                    } catch { setCouponError('Error al validar el código'); }
                    finally { setCouponValidating(false); }
                  }}
                  disabled={couponValidating || !!couponData}
                  className="px-4 py-2.5 border border-border text-[12px] font-medium hover:border-foreground transition-colors rounded-[10px] disabled:opacity-60">
                  {couponData ? '✓ Applied' : couponValidating ? '...' : (isInternational ? 'Apply' : 'Aplicar')}
                </button>
              </div>
              {couponError && <p className="text-[11px] text-destructive">{couponError}</p>}
              {couponData && <p className="text-[11px] text-green-700 font-medium">Cupón {couponData.code} aplicado — {couponData.type === 'percent' ? `${couponData.amount}% off` : formatPrice(couponData.amount)}</p>}
            </div>
            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex justify-between text-[13px]"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              {descuento > 0 && <div className="flex justify-between text-[13px] text-green-700"><span>Descuento {couponData?.type === 'percent' ? `(${couponData.amount}%)` : ''}</span><span>−{formatPrice(descuento)}</span></div>}
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">{isInternational ? 'Shipping' : 'Envío'}</span>
                <span>
                  {step === 'info' ? (
                    <span className="text-muted-foreground text-[11px]">
                      {isInternational ? 'Calculated after purchase' : 'Se calcula a continuación'}
                    </span>
                  ) : isInternational ? (
                    <span className="text-muted-foreground text-[11px]">DHL — confirmed after order</span>
                  ) : loadingRates ? (
                    <span className="text-muted-foreground">Calculando...</span>
                  ) : freeShipping ? (
                    <><span className="line-through text-muted-foreground mr-1">{selectedRate ? formatPrice(selectedRate.cost) : ''}</span><span className="text-green-700 font-semibold">Gratis</span></>
                  ) : selectedRate ? (
                    formatPrice(selectedRate.cost)
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-[16px] font-bold border-t border-border pt-3 mt-2">
                <span>Total</span>
                <span>{formatPrice(step === 'info' || !shippingReady ? subtotal - descuento : totalFinal)}</span>
              </div>
              {step === 'pago' && pago.metodo === 'transferencia' && !isInternational && (
                <p className="text-[11px] text-green-700 font-semibold mt-1 text-right">Con transferencia pagás {formatPrice(transferTotal)}</p>
              )}
              {isInternational && step === 'pago' && (
                <p className="text-[11px] text-muted-foreground mt-1">* DHL shipping cost added after purchase</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
