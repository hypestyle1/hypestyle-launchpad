'use client';

import { useEffect, useState } from 'react';

type Item = {
  order_item_id: number;
  product_id: number;
  name: string;
  image: string;
  already_reviewed: boolean;
};

type Incentive = { type: string; value: number; label: string } | null;

type ReviewData = {
  order_number: string;
  items: Item[];
  incentive: Incentive;
};

type RowState = { rating: number; text: string };

type Coupon = { id: number; code: string; value: number; type: string; expires_at: string | null } | null;

type SubmitResult = {
  results: { order_item_id: number; status: string; error?: string }[];
  coupon: Coupon;
};

type ViewStatus = 'loading' | 'error' | 'processing' | 'ready' | 'submitting' | 'done';

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center px-6">{children}</div>;
}

function stripTrailingZeros(value: number): string {
  return value.toString().replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="w-7 h-7" fill={filled ? '#000' : 'none'} stroke="#000" strokeWidth={filled ? 0 : 1.2}>
      <path d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L1.3 7.8l6.1-.7L10 1.5z" />
    </svg>
  );
}

function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Calificación">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} de 5 estrellas`}
          aria-pressed={n <= value}
          className="p-0.5"
        >
          <Star filled={n <= value} />
        </button>
      ))}
    </div>
  );
}

export default function ReviewClient({ token }: { token: string }) {
  const [status, setStatus] = useState<ViewStatus>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [data, setData] = useState<ReviewData | null>(null);
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setStatus('loading');
    try {
      const res = await fetch(`/api/reviews/${token}`, { cache: 'no-store' });

      if (res.status === 409) {
        setStatus('processing');
        setTimeout(load, 2000);
        return;
      }

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(payload?.message || 'No encontramos esta solicitud de reseña o ya no está disponible.');
        setStatus('error');
        return;
      }

      setData(payload as ReviewData);
      const initialRows: Record<number, RowState> = {};
      (payload.items || []).forEach((item: Item) => {
        initialRows[item.order_item_id] = { rating: 0, text: '' };
      });
      setRows(initialRows);
      setStatus('ready');
    } catch {
      setErrorMsg('No pudimos conectar. Probá de nuevo en un momento.');
      setStatus('error');
    }
  }

  function setRating(itemId: number, rating: number) {
    setRows(prev => ({ ...prev, [itemId]: { rating, text: prev[itemId]?.text || '' } }));
  }

  function setText(itemId: number, text: string) {
    setRows(prev => ({ ...prev, [itemId]: { rating: prev[itemId]?.rating || 0, text } }));
  }

  const anyRated = Object.values(rows).some(r => r.rating > 0);

  async function submit() {
    setErrorMsg('');
    setStatus('submitting');

    const reviews = Object.entries(rows)
      .filter(([, r]) => r.rating > 0)
      .map(([orderItemId, r]) => ({ order_item_id: Number(orderItemId), rating: r.rating, text: r.text }));

    try {
      const res = await fetch(`/api/reviews/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews }),
      });
      const payload = await res.json().catch(() => ({}));

      if (res.status === 409) {
        setErrorMsg('Ya estamos procesando tu solicitud, esperá unos segundos y volvé a intentar.');
        setStatus('ready');
        return;
      }

      if (!res.ok) {
        setErrorMsg(payload?.message || 'No pudimos guardar tu reseña. Volvé a intentar.');
        setStatus('ready');
        return;
      }

      setResult(payload as SubmitResult);
      setStatus('done');
    } catch {
      setErrorMsg('No pudimos conectar. Volvé a intentar.');
      setStatus('ready');
    }
  }

  if (status === 'loading') {
    return (
      <Centered>
        <p className="text-sm text-gray-400">Cargando...</p>
      </Centered>
    );
  }

  if (status === 'processing') {
    return (
      <Centered>
        <p className="text-sm text-gray-500">Ya estamos procesando tu solicitud, un momento...</p>
      </Centered>
    );
  }

  if (status === 'error') {
    return (
      <Centered>
        <p className="text-sm text-gray-700 max-w-sm text-center">
          {errorMsg || 'No encontramos esta solicitud de reseña o ya no está disponible.'}
        </p>
      </Centered>
    );
  }

  if (status === 'done' && result) {
    return (
      <Centered>
        <div className="max-w-md w-full text-center">
          <h1 className="text-lg font-semibold mb-2">Gracias por tu reseña</h1>
          <p className="text-sm text-gray-600 mb-6">Quedó pendiente de aprobación.</p>
          {result.coupon && (
            <div className="border-2 border-dashed border-black rounded-xl p-5">
              <p className="text-xs text-gray-500 mb-1">
                {stripTrailingZeros(result.coupon.value)}% OFF en tu próxima compra
              </p>
              <p className="text-xl font-bold tracking-wide">{result.coupon.code}</p>
              {result.coupon.expires_at && (
                <p className="text-[11px] text-gray-400 mt-1">Válido hasta {result.coupon.expires_at}</p>
              )}
            </div>
          )}
        </div>
      </Centered>
    );
  }

  if (!data) {
    return null;
  }

  const reviewableItems = data.items.filter(item => !item.already_reviewed);
  const alreadyReviewedItems = data.items.filter(item => item.already_reviewed);

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-lg font-semibold mb-1">Contanos qué te pareció</h1>
      <p className="text-sm text-gray-500 mb-6">Pedido #{data.order_number}</p>

      {data.incentive && (
        <p className="text-sm font-medium mb-6">Dejá tu reseña y recibí {data.incentive.label}.</p>
      )}

      {reviewableItems.length > 0 ? (
        <div className="space-y-6">
          {reviewableItems.map(item => (
            <div key={item.order_item_id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex gap-3 items-start">
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium mb-2">{item.name}</p>
                  <Stars value={rows[item.order_item_id]?.rating || 0} onChange={r => setRating(item.order_item_id, r)} />
                  <textarea
                    className="mt-3 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                    rows={3}
                    maxLength={2000}
                    placeholder="Contanos tu experiencia (opcional)"
                    value={rows[item.order_item_id]?.text || ''}
                    onChange={e => setText(item.order_item_id, e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Ya enviaste tu reseña para todos los productos de este pedido.</p>
      )}

      {alreadyReviewedItems.length > 0 && (
        <p className="text-xs text-green-600 mt-4">
          Ya reseñaste: {alreadyReviewedItems.map(i => i.name).join(', ')}.
        </p>
      )}

      {errorMsg && <p className="text-xs text-red-500 mt-4">{errorMsg}</p>}

      {reviewableItems.length > 0 && (
        <button
          onClick={submit}
          disabled={!anyRated || status === 'submitting'}
          className="w-full mt-6 bg-black text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-40"
        >
          {status === 'submitting' ? 'Enviando...' : 'Enviar reseña'}
        </button>
      )}
    </div>
  );
}
