'use client';

import { useState } from 'react';
import { subscribeNewsletter } from '@/lib/newsletter-subscribe';

/**
 * "Avisame": captura de email de la landing de HYPE 72.
 *
 * No tiene lista ni endpoint propio — usa el alta de newsletter que ya existe
 * (lib/newsletter-subscribe.ts → /api/newsletter-subscribe), la misma que el
 * popup del sitio. Eso significa que el que deja el mail acá entra a la lista
 * y recibe el mail de bienvenida con el cupón, igual que desde el popup.
 */
export default function Hype72Avisame() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;
    setLoading(true);
    try { await subscribeNewsletter(email); } catch {}
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
