'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { MAX_PHOTOS, downscaleForUpload, validatePhotoFile } from '@/lib/reviews/photos';

/*
 * Formulario de reseña al que se entra con el link personal (mail, WhatsApp
 * o autoservicio en /resena). El link ya identifica pedido y cliente: acá
 * no se pide ningún dato, solo la opinión.
 *
 * Criterio del rediseño (5/11/2026):
 * - Mobile primero (390×844): un producto por pantalla, estrellas de 44 px,
 *   botón fijo al pie con safe-area. Nada flotante encima (ver retail-chrome).
 * - Escribir es lo que más cuesta: después de la nota aparecen frases rápidas
 *   y el calce del talle. Se suman al texto al enviar, así el backend no
 *   cambia (sigue recibiendo {order_item_id, rating, text, photo_ids}).
 * - El incentivo se ve antes de empezar y el cupón se copia con un toque.
 * - Nota baja ⇒ la pantalla final ofrece resolverlo por WhatsApp.
 */

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
  /** Opcional: el plugin lo puede mandar para saludar por el nombre. */
  first_name?: string;
  items: Item[];
  incentive: Incentive;
  photos?: PhotosConfig;
};

type PhotoState = {
  key: string;
  preview: string;
  status: 'uploading' | 'ready' | 'error';
  id?: number;
  error?: string;
};

type Fit = '' | 'chico' | 'justo' | 'grande';

type RowState = { rating: number; text: string; photos: PhotoState[]; tags: string[]; fit: Fit };

type Coupon = { id: number; code: string; value: number; type: string; expires_at: string | null } | null;

type SubmitResult = {
  results: { order_item_id: number; status: string; error?: string }[];
  coupon: Coupon;
};

type ViewStatus = 'loading' | 'error' | 'processing' | 'ready' | 'submitting' | 'done';

const WA_NUMBER = '5491178292430';

const RATING_LABELS = ['', 'No me gustó', 'Podría ser mejor', 'Está bien', 'Muy bueno', 'Me encantó'];

const TAGS_HIGH = ['Calce perfecto', 'Muy buena tela', 'Gran calidad', 'Llegó rápido', 'La uso un montón', 'Igual a las fotos'];
const TAGS_MID = ['Buena calidad', 'El calce', 'La tela', 'El envío', 'El precio'];
const TAGS_LOW = ['El talle', 'La tela', 'La calidad', 'El envío', 'Distinto a las fotos'];

const FIT_LABELS: Record<Exclude<Fit, ''>, string> = { chico: 'Me quedó chico', justo: 'Me quedó justo', grande: 'Me quedó grande' };

const SIZE_RE = /\s[-–]\s(XXS|XS|S|M|L|XL|XXL|XXXL|\d{1,2})$/i;

/** "Regular Tees - 3 PACK (black) - S" → { title: "Regular Tees - 3 PACK (black)", size: "S" } */
function splitName(name: string): { title: string; size: string } {
  const m = name.match(SIZE_RE);
  if (!m) return { title: name, size: '' };
  return { title: name.slice(0, m.index).trim(), size: m[1].toUpperCase() };
}

function tagsFor(rating: number): string[] {
  if (rating >= 4) return TAGS_HIGH;
  if (rating === 3) return TAGS_MID;
  return TAGS_LOW;
}

function placeholderFor(rating: number): string {
  if (rating >= 4) return '¿Qué es lo que más te gustó? ¿Cómo te queda?';
  if (rating === 3) return '¿Qué le faltó para ser un 5?';
  return 'Contanos qué pasó. Lo leemos y lo vamos a mejorar.';
}

/** Arma el texto final: lo que escribió + frases rápidas + calce. */
function composeText(row: RowState, size: string): string {
  const parts: string[] = [];
  const typed = row.text.trim();
  if (typed) parts.push(typed);
  const extras: string[] = [];
  if (row.tags.length) extras.push(row.tags.join(' · '));
  if (row.fit) extras.push(size ? `Talle ${size}: ${FIT_LABELS[row.fit].toLowerCase()}` : FIT_LABELS[row.fit]);
  if (extras.length) parts.push(extras.join(' · '));
  return parts.join('\n\n').slice(0, 2000);
}

function stripTrailingZeros(value: number): string {
  return value.toString().replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

/** "2026-12-05 02:12:31" → "05/12/2026". Si no parsea, lo deja como vino. */
function formatDate(raw: string): string {
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : raw;
}

function emptyRow(): RowState {
  return { rating: 0, text: '', photos: [], tags: [], fit: '' };
}

/* ───────────────────────── piezas ───────────────────────── */

function Wordmark({ className = '' }: { className?: string }) {
  // Logo oficial (public/hype-wordmark.svg).
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/hype-wordmark.svg" alt="Hype" className={className} />;
}

function Shell({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-white text-black flex flex-col">
      <header className="h-14 flex items-center justify-center border-b border-black/10 shrink-0">
        <Link href="/" aria-label="Ir a Hype">
          <Wordmark className="h-[22px] w-auto" />
        </Link>
      </header>
      <main className="flex-1 w-full max-w-[480px] mx-auto px-4">{children}</main>
      {footer}
    </div>
  );
}

function StatusScreen({ title, body, children }: { title: string; body?: string; children?: React.ReactNode }) {
  return (
    <Shell>
      <div className="pt-20 pb-10 text-center">
        <h1 className="text-[22px] font-semibold leading-tight">{title}</h1>
        {body && <p className="text-sm text-black/60 mt-3 max-w-[320px] mx-auto">{body}</p>}
        {children}
      </div>
    </Shell>
  );
}

function Skeleton() {
  return (
    <Shell>
      <div className="pt-8 animate-pulse" aria-label="Cargando">
        <div className="h-3 w-24 bg-black/10" />
        <div className="h-7 w-56 bg-black/10 mt-3" />
        <div className="h-16 w-full bg-black/10 mt-6" />
        <div className="flex gap-4 mt-8">
          <div className="w-24 h-[120px] bg-black/10" />
          <div className="flex-1">
            <div className="h-4 w-full bg-black/10" />
            <div className="h-4 w-2/3 bg-black/10 mt-2" />
          </div>
        </div>
        <div className="flex gap-2 mt-8 justify-center">
          {[0, 1, 2, 3, 4].map(i => <div key={i} className="w-11 h-11 bg-black/10" />)}
        </div>
      </div>
    </Shell>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="w-9 h-9" fill={filled ? '#000' : 'none'} stroke="#000" strokeWidth={filled ? 0 : 1.1} aria-hidden>
      <path d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L1.3 7.8l6.1-.7L10 1.5z" />
    </svg>
  );
}

function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="flex justify-center gap-1" role="radiogroup" aria-label="Calificación">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === value}
            aria-label={`${n} de 5 estrellas: ${RATING_LABELS[n]}`}
            onClick={() => onChange(n)}
            className="w-12 h-12 flex items-center justify-center active:scale-90 transition-transform"
          >
            <StarIcon filled={n <= value} />
          </button>
        ))}
      </div>
      <p className={`text-center text-sm mt-2 h-5 ${value ? 'text-black font-medium' : 'text-black/40'}`} aria-live="polite">
        {value ? RATING_LABELS[value] : 'Tocá una estrella'}
      </p>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 px-3.5 text-[13px] border transition-colors ${
        active ? 'bg-black text-white border-black' : 'bg-white text-black border-black/20 active:border-black'
      }`}
    >
      {children}
    </button>
  );
}

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
      if (!res.ok || !payload?.id) throw new Error(payload?.message || 'No pudimos subir la foto.');
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
  const failed = photos.find(p => p.status === 'error');

  return (
    <div>
      <div className="flex gap-2">
        {photos.map(photo => (
          <div key={photo.key} className="relative w-[76px] h-[95px] overflow-hidden bg-black/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.preview} alt="" className={`w-full h-full object-cover ${photo.status === 'ready' ? '' : 'opacity-50'}`} />
            {photo.status === 'uploading' && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium bg-white/40">Subiendo…</span>
            )}
            {photo.status === 'error' && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-red-600 bg-white/70">Falló</span>
            )}
            <button
              type="button"
              onClick={() => remove(photo.key)}
              aria-label="Quitar foto"
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/75 text-white text-[13px] leading-none flex items-center justify-center"
            >
              ×
            </button>
          </div>
        ))}
        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={`${photos.length ? 'w-[76px]' : 'flex-1'} h-[95px] border border-dashed border-black/30 flex flex-col items-center justify-center gap-1.5 active:border-black transition-colors`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d="M4 7h3l2-2h6l2 2h3v12H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            <span className="text-[12px] font-medium">{photos.length ? 'Otra' : 'Subí una foto con la prenda puesta'}</span>
          </button>
        )}
      </div>
      <p className="text-[11px] text-black/40 mt-1.5">
        {photos.length === 0 ? `Opcional · hasta ${max} fotos` : `${photos.length} de ${max} fotos`}
      </p>
      {pickError && <p className="text-[12px] text-red-600 mt-1">{pickError}</p>}
      {failed && <p className="text-[12px] text-red-600 mt-1">{failed.error} Sacala y probá de nuevo.</p>}
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onPick} />
    </div>
  );
}

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Safari viejo sin permiso: el código igual queda a la vista para copiarlo a mano.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="w-full h-12 bg-white text-black text-sm font-semibold active:opacity-80"
    >
      {copied ? 'Código copiado' : 'Copiar código'}
    </button>
  );
}

/* ───────────────────────── pantalla ───────────────────────── */

export default function ReviewClient({ token }: { token: string }) {
  const [status, setStatus] = useState<ViewStatus>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [data, setData] = useState<ReviewData | null>(null);
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    try {
      const res = await fetch(`/api/reviews/${token}`, { cache: 'no-store' });
      if (res.status === 409) {
        setStatus('processing');
        setTimeout(load, 2000);
        return;
      }
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(payload?.message || '');
        setStatus('error');
        return;
      }
      setData(payload as ReviewData);
      const initial: Record<number, RowState> = {};
      (payload.items || []).forEach((item: Item) => {
        initial[item.order_item_id] = emptyRow();
      });
      setRows(initial);
      setStatus('ready');
    } catch {
      setErrorMsg('No pudimos conectar. Probá de nuevo en un momento.');
      setStatus('error');
    }
  }

  function patchRow(itemId: number, patch: Partial<RowState>) {
    setRows(prev => ({ ...prev, [itemId]: { ...(prev[itemId] || emptyRow()), ...patch } }));
  }

  function setRating(itemId: number, rating: number) {
    setRows(prev => {
      const row = prev[itemId] || emptyRow();
      // Si cambia de "le gustó" a "no le gustó" las frases ya no aplican.
      const keep = row.tags.filter(t => tagsFor(rating).includes(t));
      return { ...prev, [itemId]: { ...row, rating, tags: keep } };
    });
  }

  function toggleTag(itemId: number, tag: string) {
    const row = rows[itemId] || emptyRow();
    patchRow(itemId, { tags: row.tags.includes(tag) ? row.tags.filter(t => t !== tag) : [...row.tags, tag] });
  }

  function setPhotos(itemId: number, updater: (prev: PhotoState[]) => PhotoState[]) {
    setRows(prev => {
      const row = prev[itemId] || emptyRow();
      return { ...prev, [itemId]: { ...row, photos: updater(row.photos) } };
    });
  }

  const reviewable = useMemo(() => (data?.items || []).filter(i => !i.already_reviewed), [data]);
  const alreadyReviewed = useMemo(() => (data?.items || []).filter(i => i.already_reviewed), [data]);
  const total = reviewable.length;
  const current = reviewable[step];
  const currentRow = current ? rows[current.order_item_id] || emptyRow() : emptyRow();
  const isLast = step >= total - 1;

  const anyRated = Object.values(rows).some(r => r.rating > 0);
  const anyUploading = Object.values(rows).some(r => r.photos.some(p => p.status === 'uploading'));
  const lowestRating = Math.min(...Object.values(rows).filter(r => r.rating > 0).map(r => r.rating), 6);

  const photosEnabled = Boolean(data?.photos?.enabled);
  const photosMax = data?.photos?.max || MAX_PHOTOS;

  function goTo(next: number) {
    setStep(next);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function submit() {
    setErrorMsg('');
    setStatus('submitting');

    const reviews = reviewable
      .map(item => ({ item, row: rows[item.order_item_id] || emptyRow() }))
      .filter(({ row }) => row.rating > 0)
      .map(({ item, row }) => ({
        order_item_id: item.order_item_id,
        rating: row.rating,
        text: composeText(row, splitName(item.name).size),
        photo_ids: row.photos.filter(p => p.status === 'ready' && p.id).map(p => p.id as number),
      }));

    try {
      const res = await fetch(`/api/reviews/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews }),
      });
      const payload = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setErrorMsg('Ya estamos procesando tu reseña, esperá unos segundos y volvé a intentar.');
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
      window.scrollTo({ top: 0 });
    } catch {
      setErrorMsg('No pudimos conectar. Volvé a intentar.');
      setStatus('ready');
    }
  }

  /* ── estados ── */

  if (status === 'loading') return <Skeleton />;

  if (status === 'processing') {
    return <StatusScreen title="Un segundo" body="Estamos terminando de guardar tu reseña." />;
  }

  if (status === 'error') {
    return (
      <StatusScreen
        title="Este link ya no está disponible"
        body={errorMsg || 'Puede que haya vencido o que ya hayas dejado tu reseña. Si querés dejarla igual, escribinos y te mandamos uno nuevo.'}
      >
        <div className="mt-8 flex flex-col gap-2 max-w-[320px] mx-auto">
          <a
            href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hola! Quería dejar mi reseña pero el link no me funciona')}`}
            className="h-12 bg-black text-white text-sm font-semibold flex items-center justify-center"
          >
            Escribinos por WhatsApp
          </a>
          <Link href="/" className="h-12 border border-black/20 text-sm font-medium flex items-center justify-center">
            Ir a la tienda
          </Link>
        </div>
      </StatusScreen>
    );
  }

  if (status === 'done' && result) {
    const name = data?.first_name?.trim();
    const coupon = result.coupon;
    return (
      <Shell>
        <div className="pt-12 pb-12">
          <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center mx-auto" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
          <h1 className="text-[26px] font-semibold leading-tight text-center mt-5">
            {name ? `Gracias, ${name}` : 'Gracias por tu reseña'}
          </h1>
          <p className="text-sm text-black/60 text-center mt-2 max-w-[300px] mx-auto">
            Ya la recibimos. La publicamos en la tienda después de revisarla.
          </p>

          {coupon && (
            <div className="bg-black text-white p-5 mt-8">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Tu regalo</p>
              <p className="text-[20px] font-semibold mt-1">{stripTrailingZeros(coupon.value)}% OFF en tu próxima compra</p>
              <div className="border border-dashed border-white/40 mt-4 py-4 text-center">
                <p className="text-[22px] font-bold tracking-[0.12em] select-all">{coupon.code}</p>
              </div>
              <div className="mt-3">
                <CopyCode code={coupon.code} />
              </div>
              {coupon.expires_at && (
                <p className="text-[11px] text-white/50 mt-3 text-center">Válido hasta el {formatDate(coupon.expires_at)}</p>
              )}
            </div>
          )}

          {lowestRating <= 2 && (
            <div className="border border-black/15 p-5 mt-6">
              <p className="text-[15px] font-semibold">¿Lo resolvemos?</p>
              <p className="text-sm text-black/60 mt-1">
                Lamentamos que no haya estado a la altura. Escribinos y lo vemos con vos.
              </p>
              <a
                href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hola! Dejé una reseña del pedido #${data?.order_number} y quería contarles qué pasó`)}`}
                className="mt-4 h-12 bg-black text-white text-sm font-semibold flex items-center justify-center"
              >
                Hablar por WhatsApp
              </a>
            </div>
          )}

          <Link
            href="/"
            className={`mt-6 h-12 text-sm font-semibold flex items-center justify-center ${coupon ? 'border border-black' : 'bg-black text-white'}`}
          >
            {coupon ? 'Usarlo en la tienda' : 'Ir a la tienda'}
          </Link>

          {lowestRating >= 4 && (
            <p className="text-[13px] text-black/60 text-center mt-6">
              ¿La subís a una historia? Etiquetanos en{' '}
              <a href="https://instagram.com/hypestylearg" className="underline underline-offset-2 text-black">
                @hypestylearg
              </a>
            </p>
          )}
        </div>
      </Shell>
    );
  }

  if (!data) return null;

  if (total === 0) {
    return (
      <StatusScreen title="Ya dejaste tu reseña" body="Gracias por tomarte el tiempo. Ya tenemos tu opinión de todos los productos de este pedido.">
        <Link href="/" className="mt-8 h-12 max-w-[320px] mx-auto bg-black text-white text-sm font-semibold flex items-center justify-center">
          Ir a la tienda
        </Link>
      </StatusScreen>
    );
  }

  /* ── formulario ── */

  const name = data.first_name?.trim();
  const { title, size } = splitName(current.name);
  const rated = currentRow.rating > 0;
  const submitting = status === 'submitting';

  const footer = (
    <div className="sticky bottom-0 bg-white border-t border-black/10 shrink-0">
      <div className="max-w-[480px] mx-auto px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        {errorMsg && <p className="text-[12px] text-red-600 mb-2">{errorMsg}</p>}
        {isLast ? (
          <button
            type="button"
            onClick={submit}
            disabled={!anyRated || anyUploading || submitting}
            className="w-full h-[52px] bg-black text-white text-[15px] font-semibold disabled:opacity-30 transition-opacity"
          >
            {submitting ? 'Enviando…' : anyUploading ? 'Subiendo fotos…' : total > 1 ? 'Enviar reseñas' : 'Enviar reseña'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => goTo(step + 1)}
            className="w-full h-[52px] bg-black text-white text-[15px] font-semibold disabled:opacity-30"
            disabled={!rated}
          >
            Siguiente
          </button>
        )}
        {!isLast && !rated && (
          <button type="button" onClick={() => goTo(step + 1)} className="w-full h-9 text-[13px] text-black/50 mt-1">
            Saltear este producto
          </button>
        )}
        {isLast && data.incentive && !anyRated && (
          <p className="text-[12px] text-black/50 text-center mt-2">Calificá para recibir {data.incentive.label}</p>
        )}
      </div>
    </div>
  );

  return (
    <Shell footer={footer}>
      <div ref={topRef} className="scroll-mt-4" />

      {/* Encabezado */}
      <section className="pt-7">
        <p className="text-[11px] uppercase tracking-[0.14em] text-black/50">Pedido #{data.order_number}</p>
        <h1 className="text-[26px] font-semibold leading-[1.15] mt-2">
          {name ? `${name}, ¿qué tal te quedó?` : '¿Qué tal te quedó?'}
        </h1>
        <p className="text-sm text-black/60 mt-2">Te lleva un minuto. Tu opinión ayuda a otros a elegir.</p>
      </section>

      {data.incentive && step === 0 && (
        <div className="bg-black text-white px-4 py-3.5 mt-5 flex items-center gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="shrink-0" aria-hidden>
            <rect x="3" y="8" width="18" height="13" />
            <path d="M3 12h18M12 8v13M12 8c-1.5-3-6-3.5-6-1s4 1 6 1zm0 0c1.5-3 6-3.5 6-1s-4 1-6 1z" />
          </svg>
          <p className="text-[13px] leading-snug">
            <span className="font-semibold">{data.incentive.label}</span> en tu próxima compra. Te damos el código apenas la mandás.
          </p>
        </div>
      )}

      {/* Progreso (solo con más de un producto) */}
      {total > 1 && (
        <div className="mt-6" aria-label={`Producto ${step + 1} de ${total}`}>
          <div className="flex justify-between text-[12px] text-black/50 mb-2">
            <span>Producto {step + 1} de {total}</span>
            {step > 0 && (
              <button type="button" onClick={() => goTo(step - 1)} className="underline underline-offset-2">
                Anterior
              </button>
            )}
          </div>
          <div className="flex gap-1">
            {reviewable.map((item, i) => (
              <div key={item.order_item_id} className={`h-[3px] flex-1 ${i <= step ? 'bg-black' : 'bg-black/10'}`} />
            ))}
          </div>
        </div>
      )}

      {/* Producto */}
      <section className="mt-6 pb-8">
        <div className="flex gap-4 items-center">
          <div className="w-24 h-[120px] bg-[#f4f4f4] shrink-0 overflow-hidden">
            {current.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.image} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-medium leading-snug">{title}</p>
            {size && <p className="text-[13px] text-black/50 mt-1">Talle {size}</p>}
          </div>
        </div>

        <div className="mt-7">
          <Stars value={currentRow.rating} onChange={r => setRating(current.order_item_id, r)} />
        </div>

        {rated && (
          <div className="mt-7 space-y-7">
            <div>
              <p className="text-[13px] font-medium mb-2.5">
                {currentRow.rating >= 4 ? '¿Qué es lo que más te gustó?' : '¿Qué podríamos mejorar?'}
              </p>
              <div className="flex flex-wrap gap-2">
                {tagsFor(currentRow.rating).map(tag => (
                  <Chip key={tag} active={currentRow.tags.includes(tag)} onClick={() => toggleTag(current.order_item_id, tag)}>
                    {tag}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[13px] font-medium mb-2.5">¿Cómo te quedó el talle{size ? ` ${size}` : ''}?</p>
              <div className="grid grid-cols-3 gap-2">
                {(['chico', 'justo', 'grande'] as const).map(f => (
                  <Chip
                    key={f}
                    active={currentRow.fit === f}
                    onClick={() => patchRow(current.order_item_id, { fit: currentRow.fit === f ? '' : f })}
                  >
                    {f === 'chico' ? 'Chico' : f === 'justo' ? 'Justo' : 'Grande'}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor={`txt-${current.order_item_id}`} className="text-[13px] font-medium block mb-2.5">
                Contanos más <span className="text-black/40 font-normal">(opcional)</span>
              </label>
              <textarea
                id={`txt-${current.order_item_id}`}
                className="w-full border border-black/20 px-3 py-3 text-[16px] leading-snug focus:outline-none focus:border-black resize-none"
                rows={4}
                maxLength={1800}
                placeholder={placeholderFor(currentRow.rating)}
                value={currentRow.text}
                onChange={e => patchRow(current.order_item_id, { text: e.target.value })}
              />
            </div>

            {photosEnabled && (
              <PhotoPicker
                token={token}
                photos={currentRow.photos}
                max={photosMax}
                onChange={updater => setPhotos(current.order_item_id, updater)}
              />
            )}
          </div>
        )}

        {alreadyReviewed.length > 0 && step === 0 && (
          <p className="text-[12px] text-black/50 mt-8">Ya reseñaste: {alreadyReviewed.map(i => splitName(i.name).title).join(', ')}.</p>
        )}
      </section>
    </Shell>
  );
}
