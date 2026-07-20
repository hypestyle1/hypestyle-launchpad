'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { imgSrc } from '@/lib/img';
import { formatArs } from '@/lib/mayorista-format';
import { useMayoristaCart } from '@/context/MayoristaCartContext';

interface ShippingForm {
  first_name: string; last_name: string; company: string;
  address_1: string; city: string; state: string; postcode: string; phone: string;
}

const EMPTY_SHIPPING: ShippingForm = {
  first_name: '', last_name: '', company: '', address_1: '', city: '', state: '', postcode: '', phone: '',
};

export default function MayoristaCartPage() {
  const { items, remove, setQty, clear, total } = useMayoristaCart();
  const [step, setStep] = useState<'cart' | 'shipping'>('cart');
  const [shipping, setShipping] = useState<ShippingForm>(EMPTY_SHIPPING);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/mayorista/perfil')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data?.billing) return;
        const b = data.billing;
        setShipping(s => ({
          ...s,
          first_name: b.first_name || s.first_name,
          last_name:  b.last_name  || s.last_name,
          company:    b.company    || s.company,
          address_1:  b.address_1  || s.address_1,
          city:       b.city       || s.city,
          state:      b.state      || s.state,
          postcode:   b.postcode   || s.postcode,
          phone:      b.phone      || s.phone,
        }));
      })
      .catch(() => {});
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/mayorista/pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, shipping }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'No se pudo enviar el pedido');
      setConfirmedOrder(data.wcOrderNumber);
      clear();
    } catch (e: any) {
      setError(e.message || 'Error al enviar el pedido');
    } finally {
      setSending(false);
    }
  }

  function field(key: keyof ShippingForm) {
    return {
      value: shipping[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setShipping(s => ({ ...s, [key]: e.target.value })),
    };
  }

  if (confirmedOrder) {
    return (
      <div className="max-w-lg mx-auto px-5 py-24 text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Pedido enviado</p>
        <h1 className="text-2xl font-bold tracking-tight mt-2">Pedido #{confirmedOrder}</h1>
        <p className="text-[13px] text-white/50 mt-3">Ya lo recibimos. Te contactamos para coordinar preparación y entrega.</p>
        <Link href="/mayoristas" className="inline-block mt-8 bg-white text-black px-6 py-3 text-[12px] font-semibold uppercase tracking-wide hover:bg-white/90 transition-colors">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-5 py-24 text-center">
        <p className="text-white/50 text-sm">Todavía no agregaste productos.</p>
        <Link href="/mayoristas" className="inline-block mt-6 bg-white text-black px-6 py-3 text-[12px] font-semibold uppercase tracking-wide hover:bg-white/90 transition-colors">
          Ir al catálogo
        </Link>
      </div>
    );
  }

  if (step === 'shipping') {
    return (
      <form onSubmit={handleSend} className="max-w-lg mx-auto px-5 sm:px-8 py-8">
        <button type="button" onClick={() => setStep('cart')} className="text-[12px] uppercase tracking-wide text-white/40 hover:text-white transition-colors mb-6">
          ← Volver al pedido
        </button>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Datos de envío</h1>
        <p className="text-[13px] text-white/50 mb-6">Coordinamos la entrega a esta dirección.</p>

        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-1 text-[11px] uppercase tracking-wide text-white/50">
            Nombre
            <input required {...field('first_name')} className="mt-1 w-full bg-transparent border border-white/20 px-3 py-2 text-sm focus:border-white outline-none" />
          </label>
          <label className="col-span-1 text-[11px] uppercase tracking-wide text-white/50">
            Apellido
            <input required {...field('last_name')} className="mt-1 w-full bg-transparent border border-white/20 px-3 py-2 text-sm focus:border-white outline-none" />
          </label>
          <label className="col-span-2 text-[11px] uppercase tracking-wide text-white/50">
            Local / empresa
            <input {...field('company')} className="mt-1 w-full bg-transparent border border-white/20 px-3 py-2 text-sm focus:border-white outline-none" />
          </label>
          <label className="col-span-2 text-[11px] uppercase tracking-wide text-white/50">
            Dirección
            <input required {...field('address_1')} className="mt-1 w-full bg-transparent border border-white/20 px-3 py-2 text-sm focus:border-white outline-none" />
          </label>
          <label className="col-span-1 text-[11px] uppercase tracking-wide text-white/50">
            Ciudad
            <input required {...field('city')} className="mt-1 w-full bg-transparent border border-white/20 px-3 py-2 text-sm focus:border-white outline-none" />
          </label>
          <label className="col-span-1 text-[11px] uppercase tracking-wide text-white/50">
            Provincia
            <input {...field('state')} className="mt-1 w-full bg-transparent border border-white/20 px-3 py-2 text-sm focus:border-white outline-none" />
          </label>
          <label className="col-span-1 text-[11px] uppercase tracking-wide text-white/50">
            CP
            <input {...field('postcode')} className="mt-1 w-full bg-transparent border border-white/20 px-3 py-2 text-sm focus:border-white outline-none" />
          </label>
          <label className="col-span-1 text-[11px] uppercase tracking-wide text-white/50">
            Teléfono
            <input required {...field('phone')} className="mt-1 w-full bg-transparent border border-white/20 px-3 py-2 text-sm focus:border-white outline-none" />
          </label>
        </div>

        {error && <p className="mt-4 text-[12px] text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={sending}
          className="mt-8 w-full bg-white text-black py-3 text-[12px] font-semibold uppercase tracking-wide hover:bg-white/90 transition-colors disabled:opacity-50"
        >
          {sending ? 'Enviando…' : `Confirmar pedido — ${formatArs(total)}`}
        </button>
      </form>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 py-8">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Mi pedido</h1>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={`${item.slug}-${item.size}`} className="flex items-center gap-4 border border-white/10 p-3">
            <div className="relative w-16 h-16 bg-white/5 shrink-0">
              {item.image && <Image src={imgSrc(item.image)} alt={item.name} fill sizes="64px" className="object-cover object-top" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate">{item.name}</p>
              <p className="text-[11px] text-white/40">Talle {item.size}</p>
              <p className="text-[13px] font-semibold mt-0.5">{formatArs(item.price)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setQty(item.slug, item.size, item.quantity - 1)} className="w-7 h-7 border border-white/20 hover:border-white transition-colors">−</button>
              <span className="w-6 text-center text-[13px]">{item.quantity}</span>
              <button onClick={() => setQty(item.slug, item.size, item.quantity + 1)} className="w-7 h-7 border border-white/20 hover:border-white transition-colors">+</button>
            </div>
            <button onClick={() => remove(item.slug, item.size)} className="text-white/30 hover:text-red-400 transition-colors text-[12px] ml-2">✕</button>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-white/10 pt-4 flex items-center justify-between">
        <span className="text-[13px] uppercase tracking-wide text-white/50">Total</span>
        <span className="text-xl font-bold">{formatArs(total)}</span>
      </div>

      <button
        onClick={() => setStep('shipping')}
        className="mt-6 w-full bg-white text-black py-3 text-[12px] font-semibold uppercase tracking-wide hover:bg-white/90 transition-colors"
      >
        Continuar
      </button>
      <button onClick={clear} className="mt-3 w-full text-[11px] uppercase tracking-wide text-white/30 hover:text-red-400 transition-colors py-2">
        Vaciar pedido
      </button>
    </div>
  );
}
