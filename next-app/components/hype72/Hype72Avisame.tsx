'use client';

import { useState } from 'react';
import { subscribeHype72 } from '@/lib/newsletter-subscribe';

/**
 * "Avisame": captura de email de la landing de HYPE 72.
 *
 * Comparte el endpoint con el popup del sitio
 * (lib/newsletter-subscribe.ts → /api/newsletter-subscribe), pero va con
 * `origen: 'hype72'`: entra a la lista propia del evento, queda etiquetado
 * HYPE72 para poder segmentar el envío, y NO dispara la bienvenida ni el cupón
 * HYPE10 (ese 10% se acumula con los packs del evento — ver
 * _claude/auditorias/2026-10-25-cupones-vs-packs.md).
 */
export default function Hype72Avisame() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;
    setLoading(true);
    try { await subscribeHype72(email); } catch {}
    setLoading(false);
    setDone(true);
  };

  if (done) {
    return (
      <p className="text-[15px] font-semibold text-white" aria-live="polite">
        Listo. Te escribimos cuando se revele cada drop.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
      <label htmlFor="hype72-email" className="sr-only">Tu email</label>
      <input
        id="hype72-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@email.com"
        required
        autoComplete="email"
        className="min-w-0 flex-1 border border-white/25 bg-transparent px-4 py-4 text-[15px] text-white placeholder:text-white/35 focus:border-white focus:outline-none"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-white px-8 py-4 text-[12px] font-bold uppercase tracking-[0.18em] text-black transition-opacity hover:opacity-80 disabled:opacity-60"
      >
        {loading ? 'Enviando' : 'Avisame'}
      </button>
    </form>
  );
}
