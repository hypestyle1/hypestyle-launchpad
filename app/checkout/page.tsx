'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useLocale } from '@/context/LocaleContext';
import { createOrderAndPreference } from '@/lib/wc-client';
import { imgSrc } from '@/lib/img';

type Step = 'info' | 'envio' | 'pago';

const PROVINCIAS = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán',
];

const FREE_SHIPPING_THRESHOLD = 250000;

interface ShippingRate { id: string; label: string; cost: number }
interface AndBranch { id: string; label: string; direccion: string }
interface InfoForm {
  email: string; newsletter: boolean; nombre: string; apellido: string; dni: string;
  direccion: string; depto: string; cp: string; ciudad: string; provincia: string; telefono: string;
}
interface PagoForm { metodo: string; instagram: string }

export default function Checkout() {
  const { items, total, clear } = useCart();
  const router = useRouter();
  const { formatPrice, currency } = useLocale();
  const [step, setStep] = useState<Step>('info');
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponValidating, setCouponValidating] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [info, setInfo] = useState<InfoForm>({
    email: '', newsletter: false, nombre: '', apellido: '', dni: '',
    direccion: '', depto: '', cp: '', ciudad: '', provincia: 'Buenos Aires', telefono: '',
  });
  const [pago, setPago] = useState<PagoForm>({ metodo: '', instagram: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Shipping rates state
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);

  // Andreani branches state
  const [branches, setBranches] = useState<AndBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<AndBranch | null>(null);
  const [loadingBranches, setLoadingBranches] = useState(false);

  const isSucursal = selectedRate?.label?.toLowerCase().includes('sucursal') || selectedRate?.id?.toLowerCase().includes('sucursal');
  const branchReady = !isSucursal || !!selectedBranch;

  const subtotal = total;
  const freeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const envioCosto = freeShipping ? 0 : (selectedRate?.cost ?? 0);
  const shippingReady = freeShipping || !!selectedRate;
  const descuento = couponApplied ? Math.round(subtotal * 0.1) : 0;
  const envioEnPaso = step === 'pago' || step === 'envio' ? envioCosto : 0;
  const totalFinal = subtotal - descuento + envioEnPaso;
  const transferTotal = Math.round(subtotal * 0.90) - descuento + envioEnPaso;

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
    const isTransfer = pago.metodo === 'transferencia';
    const isPaypal   = pago.metodo === 'paypal';
    const isMp = pago.metodo === 'mercadopago' || pago.metodo === 'tarjeta';
    try {
      let orderRes;
      try {
        orderRes = await createOrderAndPreference({
          items: items.map(item => ({ id: item.id, slug: item.id, name: item.name, price: item.price, quantity: item.quantity, size: item.size, image: item.image })),
          customer: { email: info.email, nombre: info.nombre, apellido: info.apellido, dni: info.dni, direccion: info.direccion, depto: info.depto, cp: info.cp, ciudad: info.ciudad, provincia: info.provincia, telefono: info.telefono, instagram: pago.instagram },
          shipping: envioCosto,
          discountAmount: (isTransfer ? Math.round(subtotal * 0.10) : 0) + descuento,
          paymentMethod: pago.metodo,
          shippingMethodId: selectedRate?.id,
          shippingLabel: selectedRate?.label,
          shippingBranch: selectedBranch ? `${selectedBranch.label} — ${selectedBranch.direccion}` : undefined,
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
        total: isTransfer ? transferTotal : totalFinal,
        metodo: pago.metodo, email: info.email, nombre: info.nombre, apellido: info.apellido,
        direccion: info.direccion, ciudad: info.ciudad, provincia: info.provincia,
        cp: info.cp, telefono: info.telefono,
      }));
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
            <form onSubmit={e => { e.preventDefault(); setStep('envio'); fetchRates(); }} className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[15px] font-semibold">Contacto</h2>
                </div>
                <input type="email" placeholder="Email" required value={info.email}
                  onChange={e => setInfo({ ...info, email: e.target.value })}
                  className="w-full border border-border px-4 py-3 text-[13px] focus:outline-none focus:border-foreground transition-colors rounded-[10px]" />
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input type="checkbox" checked={info.newsletter} onChange={e => setInfo({ ...info, newsletter: e.target.checked })} className="w-4 h-4" />
                  <span className="text-[12px] text-muted-foreground">Recibir novedades, drops y acceso anticipado</span>
                </label>
              </div>
              <div>
                <h2 className="text-[15px] font-semibold mb-3">Dirección de envío</h2>
                <div className="space-y-2">
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
                </div>
              </div>
              <button type="submit" className="w-full bg-bg-dark text-primary-foreground py-4 text-[12px] font-bold uppercase tracking-[0.1em] hover:bg-bg-dark/85 transition-colors rounded-[10px]">
                Continuar con el envío
              </button>
            </form>
          )}

          {step === 'envio' && (
            <form onSubmit={e => { e.preventDefault(); setStep('pago'); if (typeof window !== 'undefined' && window.fbq) { window.fbq('track', 'InitiateCheckout', { value: totalFinal, currency: 'ARS', num_items: items.reduce((s, i) => s + i.quantity, 0) }); } }} className="space-y-6">
              <div className="border border-border divide-y divide-border text-[13px] rounded-[10px] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex gap-2"><span className="text-muted-foreground">Contacto</span><span>{info.email}</span></div>
                  <button type="button" onClick={() => setStep('info')} className="underline text-muted-foreground hover:text-foreground transition-colors text-[12px]">Cambiar</button>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex gap-2"><span className="text-muted-foreground">Enviar a</span><span>{info.direccion}, {info.ciudad}, {info.provincia}</span></div>
                  <button type="button" onClick={() => setStep('info')} className="underline text-muted-foreground hover:text-foreground transition-colors text-[12px]">Cambiar</button>
                </div>
              </div>

              <div>
                <h2 className="text-[15px] font-semibold mb-3">Método de envío</h2>

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

                {/* Selector de sucursal Andreani */}
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
              </div>

              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={() => setStep('info')} className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">‹ Volver a información</button>
                <button type="submit" disabled={loadingRates || !shippingReady || !branchReady}
                  className="bg-bg-dark text-primary-foreground px-8 py-3.5 text-[12px] font-bold uppercase tracking-[0.1em] hover:bg-bg-dark/85 transition-colors rounded-[10px] disabled:opacity-60 disabled:cursor-not-allowed">
                  Continuar con el pago
                </button>
              </div>
            </form>
          )}

          {step === 'pago' && (
            <form onSubmit={handlePagoSubmit} className="space-y-6">
              <div className="border border-border divide-y divide-border text-[13px] rounded-[10px] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex gap-2"><span className="text-muted-foreground">Contacto</span><span>{info.email}</span></div>
                  <button type="button" onClick={() => setStep('info')} className="underline text-muted-foreground hover:text-foreground transition-colors text-[12px]">Cambiar</button>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex gap-2"><span className="text-muted-foreground">Enviar a</span><span>{info.direccion}, {info.ciudad}</span></div>
                  <button type="button" onClick={() => setStep('info')} className="underline text-muted-foreground hover:text-foreground transition-colors text-[12px]">Cambiar</button>
                </div>
                {selectedRate && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex gap-2 flex-col">
                      <div className="flex gap-2"><span className="text-muted-foreground">Envío</span><span>{selectedRate.label}</span></div>
                      {selectedBranch && <span className="text-[11px] text-muted-foreground pl-0">{selectedBranch.label} — {selectedBranch.direccion}</span>}
                    </div>
                    <button type="button" onClick={() => setStep('envio')} className="underline text-muted-foreground hover:text-foreground transition-colors text-[12px] flex-shrink-0 ml-4">Cambiar</button>
                  </div>
                )}
              </div>
              <div>
                <p className="text-[13px] font-semibold mb-1">Instagram <span className="text-destructive">*</span></p>
                <textarea value={pago.instagram} onChange={e => setPago({ ...pago, instagram: e.target.value })}
                  placeholder="@tuusuario — para sumarte a Close Friends" rows={2} required
                  className="w-full border border-border px-4 py-3 text-[13px] focus:outline-none focus:border-foreground transition-colors resize-none rounded-[10px]" />
              </div>
              <div>
                <h2 className="text-[14px] font-bold uppercase tracking-wider mb-3">Medio de pago</h2>
                <div className="space-y-2">
                  {[
                    { id: 'tarjeta', label: 'Tarjeta de crédito o débito', sub: 'Hasta 3 cuotas sin interés' },
                    { id: 'transferencia', label: 'Transferencia o depósito bancario', sub: currency === 'ARS' ? `Pagás ${formatPrice(transferTotal)} (10% off)` : '' },
                    { id: 'mercadopago', label: 'Mercado Pago', sub: '' },
                    { id: 'paypal', label: 'PayPal', sub: '' },
                  ].map(m => (
                    <label key={m.id} className={`flex items-center gap-3 border px-4 py-3.5 cursor-pointer transition-colors rounded-[10px] ${pago.metodo === m.id ? 'border-foreground bg-foreground/[0.03]' : 'border-border hover:border-foreground/40'}`}>
                      <input type="radio" name="metodo" value={m.id} checked={pago.metodo === m.id} onChange={() => setPago({ ...pago, metodo: m.id })} className="w-4 h-4 accent-foreground" />
                      <div className="flex-1">
                        <p className="text-[13px] font-medium">{m.label}</p>
                        {m.sub && <p className={`text-[11px] ${m.id === 'transferencia' ? 'text-green-700 font-semibold' : 'text-muted-foreground'}`}>{m.sub}</p>}
                      </div>
                      <span className="text-foreground/30">›</span>
                    </label>
                  ))}
                </div>
                {!pago.metodo && <p className="text-[11px] text-destructive mt-1">Seleccioná un medio de pago</p>}
              </div>
              {submitError && <p className="text-[12px] text-destructive bg-destructive/10 px-4 py-3 rounded-[8px]">{submitError}</p>}
              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={() => setStep('envio')} className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">‹ Volver al envío</button>
                <button type="submit" disabled={submitting}
                  className="bg-bg-dark text-primary-foreground px-8 py-3.5 text-[12px] font-bold uppercase tracking-[0.1em] hover:bg-bg-dark/85 transition-colors rounded-[10px] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
                  {submitting ? (<><svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Procesando...</>) : 'Realizar pedido'}
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
                <div key={`${item.id}-${item.size}`} className="flex gap-3 items-center">
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
                  </div>
                  <span className="text-[13px] font-semibold">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5 mb-5">
              <div className="flex gap-2">
                <input type="text" placeholder="Código de descuento" value={coupon}
                  onChange={e => { setCoupon(e.target.value); setCouponError(null); if (couponApplied) setCouponApplied(false); }}
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
                        body: JSON.stringify({ code: coupon }),
                      });
                      const data = await res.json() as { valid: boolean; error?: string };
                      if (data.valid) { setCouponApplied(true); }
                      else { setCouponError(data.error || 'Código inválido'); }
                    } catch { setCouponError('Error al validar el código'); }
                    finally { setCouponValidating(false); }
                  }}
                  disabled={couponValidating || couponApplied}
                  className="px-4 py-2.5 border border-border text-[12px] font-medium hover:border-foreground transition-colors rounded-[10px] disabled:opacity-60">
                  {couponApplied ? '✓ Aplicado' : couponValidating ? '...' : 'Aplicar'}
                </button>
              </div>
              {couponError && <p className="text-[11px] text-destructive">{couponError}</p>}
              {couponApplied && <p className="text-[11px] text-green-700 font-medium">Cupón HYPE10 aplicado — 10% off</p>}
            </div>
            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex justify-between text-[13px]"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              {descuento > 0 && <div className="flex justify-between text-[13px] text-green-700"><span>Descuento (10%)</span><span>−{formatPrice(descuento)}</span></div>}
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Envío</span>
                <span>
                  {step === 'info' ? (
                    <span className="text-muted-foreground">Se calcula a continuación</span>
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
              {step === 'pago' && pago.metodo === 'transferencia' && (
                <p className="text-[11px] text-green-700 font-semibold mt-1 text-right">Con transferencia pagás {formatPrice(transferTotal)}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
