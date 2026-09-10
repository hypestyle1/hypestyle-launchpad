'use client';

import { useEffect, useRef, useState } from 'react';
import { MAX_PHOTOS, downscaleForUpload, validatePhotoFile } from '@/lib/reviews/photos';

type Item = {
  order_item_id: number;
  product_id: number;
  name: string;
  image: string;
  already_reviewed: boolean;
};

type Incentive = { type: string; value: number; label: string } | null;

type PhotosConfig = { enabled: boolean; max: number; max_bytes: number; accept: string[] } | null;

type ReviewData = {
  order_number: string;
  items: Item[];
  incentive: Incentive;
  photos?: PhotosConfig;
};

type PhotoState = {
  /** Clave local, estable mientras la foto sube. */
  key: string;
  /** Vista previa local (object URL) — se revoca al sacar la foto. */
  preview: string;
  status: 'uploading' | 'ready' | 'error';
  /** ID del attachment en WordPress, cuando ya subió. */
  id?: number;
  error?: string;
};

type RowState = { rating: number; text: string; photos: PhotoState[] };

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

/**
 * Selector de fotos por producto. Cada foto se reduce en el navegador y se
 * sube apenas se elige (a /api/reviews/{token}/photos); el submit manda solo
 * los IDs que devolvió el servidor. Si una subida falla, la foto queda
 * marcada y el cliente la puede sacar o reintentar — nunca bloquea la reseña.
 */
function PhotoPicker({
  token,
  photos,
  max,
  onChange,
}: {
  token: string;
  photos: PhotoState[];
  max: number;
  onChange: (updater: (prev: PhotoState[]) => PhotoState[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pickError, setPickError] = useState('');

  async function upload(key: string, file: File) {
    try {
      const reduced = await downscaleForUpload(file);
      const fd = new FormData();
      fd.append('file', reduced, reduced.name);
      const res = await fetch(`/api/reviews/${token}/photos`, { method: 'POST', body: fd });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.id) {
        throw new Error(payload?.message || 'No pudimos subir la foto.');
      }
      onChange(prev => prev.map(p => (p.key === key ? { ...p, status: 'ready', id: Number(payload.id), error: undefined } : p)));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos subir la foto.';
      onChange(prev => prev.map(p => (p.key === key ? { ...p, status: 'error', error: message } : p)));
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    setPickError('');
    let count = photos.length;
    for (const file of files) {
      const check = validatePhotoFile(file, count);
      if (!check.ok) {
        setPickError(check.reason || 'No pudimos agregar esa foto.');
        break;
      }
      count += 1;
      const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const preview = URL.createObjectURL(file);
      onChange(prev => [...prev, { key, preview, status: 'uploading' }]);
      void upload(key, file);
    }
  }

  function remove(key: string) {
    onChange(prev => {
      const target = prev.find(p => p.key === key);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter(p => p.key !== key);
    });
  }

  const canAdd = photos.length < max;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {photos.map(photo => (
          <div key={photo.key} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.preview} alt="" className={`w-full h-full object-cover ${photo.status === 'ready' ? '' : 'opacity-50'}`} />
            {photo.status === 'uploading' && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-700 bg-white/40">Subiendo…</span>
            )}
            {photo.status === 'error' && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] text-red-600 bg-white/70 text-center px-1 leading-tight">Falló</span>
            )}
            <button
              type="button"
              onClick={() => remove(photo.key)}
              aria-label="Quitar foto"
              className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-white text-[11px] leading-none flex items-center justify-center"
            >
              ×
            </button>
          </div>
        ))}
        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-16 h-16 rounded-lg border border-dashed border-gray-300 text-gray-500 flex flex-col items-center justify-center gap-0.5 hover:border-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Agregar foto"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 7h3l2-2h6l2 2h3v12H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            <span className="text-[10px]">Foto</span>
          </button>
        )}
      </div>
      <p className="text-[11px] text-gray-400 mt-1.5">
        {photos.length === 0
          ? `Sumá hasta ${max} fotos con la prenda puesta (opcional).`
          : `${photos.length} de ${max} fotos.`}
      </p>
      {pickError && <p className="text-[11px] text-red-500 mt-1">{pickError}</p>}
      {photos.some(p => p.status === 'error') && (
        <p className="text-[11px] text-red-500 mt-1">
          {photos.find(p => p.status === 'error')?.error} Sacala y probá de nuevo.
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        capture={undefined}
        className="hidden"
        onChange={onPick}
      />
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
        initialRows[item.order_item_id] = { rating: 0, text: '', photos: [] };
      });
      setRows(initialRows);
      setStatus('ready');
    } catch {
      setErrorMsg('No pudimos conectar. Probá de nuevo en un momento.');
      setStatus('error');
    }
  }

  function setRating(itemId: number, rating: number) {
    setRows(prev => ({ ...prev, [itemId]: { ...(prev[itemId] || { text: '', photos: [] }), rating } }));
  }

  function setText(itemId: number, text: string) {
    setRows(prev => ({ ...prev, [itemId]: { ...(prev[itemId] || { rating: 0, photos: [] }), text } }));
  }

  function setPhotos(itemId: number, updater: (prev: PhotoState[]) => PhotoState[]) {
    setRows(prev => {
      const row = prev[itemId] || { rating: 0, text: '', photos: [] };
      return { ...prev, [itemId]: { ...row, photos: updater(row.photos) } };
    });
  }

  const anyRated = Object.values(rows).some(r => r.rating > 0);
  const anyUploading = Object.values(rows).some(r => r.photos.some(p => p.status === 'uploading'));

  // Con reseñas de 1 solo producto y sin fotos, la config vieja (sin
  // `photos`) también funciona: el picker se muestra si el backend lo habilita.
  const photosEnabled = Boolean(data?.photos?.enabled);
  const photosMax = data?.photos?.max || MAX_PHOTOS;

  async function submit() {
    setErrorMsg('');
    setStatus('submitting');

    const reviews = Object.entries(rows)
      .filter(([, r]) => r.rating > 0)
      .map(([orderItemId, r]) => ({
        order_item_id: Number(orderItemId),
        rating: r.rating,
        text: r.text,
        photo_ids: r.photos.filter(p => p.status === 'ready' && p.id).map(p => p.id as number),
      }));

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
                  {photosEnabled && (
                    <PhotoPicker
                      token={token}
                      photos={rows[item.order_item_id]?.photos || []}
                      max={photosMax}
                      onChange={updater => setPhotos(item.order_item_id, updater)}
                    />
                  )}
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
          disabled={!anyRated || anyUploading || status === 'submitting'}
          className="w-full mt-6 bg-black text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-40"
        >
          {status === 'submitting' ? 'Enviando...' : anyUploading ? 'Subiendo fotos...' : 'Enviar reseña'}
        </button>
      )}
    </div>
  );
}
