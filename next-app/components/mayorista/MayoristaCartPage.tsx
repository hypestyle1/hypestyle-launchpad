'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { imgSrc } from '@/lib/img';
import { formatArs } from '@/lib/mayorista-format';
import { useMayoristaCart } from '@/context/MayoristaCartContext';

export default function MayoristaCartPage() {
  const { items, remove, setQty, clear, total } = useMayoristaCart();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<string | null>(null);

  async function handleSend() {
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/mayorista/pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
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

      {error && <p className="mt-4 text-[12px] text-red-400">{error}</p>}

      <button
        onClick={handleSend}
        disabled={sending}
        className="mt-6 w-full bg-white text-black py-3 text-[12px] font-semibold uppercase tracking-wide hover:bg-white/90 transition-colors disabled:opacity-50"
      >
        {sending ? 'Enviando…' : 'Enviar pedido'}
      </button>
      <button onClick={clear} className="mt-3 w-full text-[11px] uppercase tracking-wide text-white/30 hover:text-red-400 transition-colors py-2">
        Vaciar pedido
      </button>
    </div>
  );
}
