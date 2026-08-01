'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type ViewStatus = 'idle' | 'submitting' | 'error' | 'all_reviewed';

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center px-6">{children}</div>;
}

export default function ResenaClient() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<ViewStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setStatus('submitting');

    try {
      const res = await fetch('/api/review-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_number: orderNumber.trim(), email: email.trim() }),
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(payload?.message || 'No pudimos verificar ese pedido. Volvé a intentar.');
        setStatus('error');
        return;
      }

      if (payload?.all_reviewed) {
        setStatus('all_reviewed');
        return;
      }

      if (payload?.token) {
        router.push(`/review/${payload.token}`);
        return;
      }

      setErrorMsg('No pudimos verificar ese pedido. Volvé a intentar.');
      setStatus('error');
    } catch {
      setErrorMsg('No pudimos conectar. Probá de nuevo en un momento.');
      setStatus('error');
    }
  }

  if (status === 'all_reviewed') {
    return (
      <Centered>
        <div className="max-w-sm w-full text-center">
          <h1 className="text-lg font-semibold mb-2">Ya dejaste tu reseña</h1>
          <p className="text-sm text-gray-600">Ya reseñaste todos los productos de este pedido. ¡Gracias!</p>
        </div>
      </Centered>
    );
  }

  return (
    <Centered>
      <div className="max-w-sm w-full">
        <h1 className="text-lg font-semibold mb-1">Dejá tu reseña</h1>
        <p className="text-sm text-gray-500 mb-6">
          Contanos qué te pareció tu pedido y llevate un 10% OFF para tu próxima compra.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="order_number" className="block text-xs text-gray-500 mb-1">
              Número de pedido
            </label>
            <input
              id="order_number"
              type="text"
              inputMode="numeric"
              required
              value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)}
              placeholder="Ej: 2278"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs text-gray-500 mb-1">
              Email de la compra
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@mail.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400"
            />
          </div>

          {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}

          <button
            type="submit"
            disabled={status === 'submitting' || !orderNumber.trim() || !email.trim()}
            className="w-full bg-black text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-40"
          >
            {status === 'submitting' ? 'Buscando...' : 'Continuar'}
          </button>
        </form>

        <p className="text-[11px] text-gray-400 mt-6 text-center">
          El número de pedido y el email son los que usaste en tu compra.
        </p>
      </div>
    </Centered>
  );
}
