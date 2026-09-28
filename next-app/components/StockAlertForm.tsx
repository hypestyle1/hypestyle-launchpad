'use client';

import { useState } from 'react';
import { useLocale } from '@/context/LocaleContext';

interface StockAlertFormProps {
  slug: string;
  /** Talles (o colores) agotados de este producto. */
  sizes: string[];
  /** El producto varía por color en vez de por talle. */
  isColorVariant?: boolean;
}

type Estado = 'cerrado' | 'abierto' | 'enviando' | 'listo';

/**
 * "Avisame cuando vuelva": aparece en la página de producto cuando hay talles
 * agotados. Guarda el mail (y el WhatsApp, si lo dejan) para ese talle. No
 * promete fecha ni reserva nada: es una lista para avisar cuando se reponga.
 */
export default function StockAlertForm({ slug, sizes, isColorVariant = false }: StockAlertFormProps) {
  const { t, language } = useLocale();
  const [estado, setEstado] = useState<Estado>('cerrado');
  const [size, setSize] = useState(sizes.length === 1 ? sizes[0] : '');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [error, setError] = useState('');

  if (sizes.length === 0) return null;

  // Si el talle elegido dejó de estar en la lista (se repuso), no se manda.
  const elegido = sizes.includes(size) ? size : (sizes.length === 1 ? sizes[0] : '');
  const unico = sizes.length === 1 && sizes[0] === 'Única';

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!elegido) { setError(t(isColorVariant ? 'Elegí el color que buscás' : 'Elegí el talle que buscás')); return; }
    setError('');
    setEstado('enviando');
    try {
      const res = await fetch('/api/stock-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, size: elegido, email, phone, lang: language, website }),
      });
      if (res.ok) { setEstado('listo'); return; }
      const data = await res.json().catch(() => null);
      setError(data?.code === 'email' ? t('Revisá el mail') : t('No pudimos guardar el aviso. Probá de nuevo.'));
    } catch {
      setError(t('No pudimos guardar el aviso. Probá de nuevo.'));
    }
    setEstado('abierto');
  }

  if (estado === 'listo') {
    return (
      <p className="text-[12px] text-green-700 font-medium mb-4" role="status">
        {t('Listo. Te escribimos apenas vuelva.')}
      </p>
    );
  }

  if (estado === 'cerrado') {
    return (
      <button
        type="button"
        onClick={() => setEstado('abierto')}
        className="text-[12px] underline text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        {unico
          ? t('Avisame cuando vuelva')
          : t(isColorVariant ? '¿Buscás un color agotado? Avisame cuando vuelva' : '¿Buscás un talle agotado? Avisame cuando vuelva')}
      </button>
    );
  }

  return (
    <form onSubmit={enviar} className="mb-4 border border-border rounded-[10px] p-3 space-y-2.5">
      <p className="text-[12px] font-semibold uppercase tracking-wider">{t('Avisame cuando vuelva')}</p>

      {!unico && sizes.length > 1 && (
        <div className="flex gap-2 flex-wrap" role="group" aria-label={t(isColorVariant ? 'Color' : 'Talle')}>
          {sizes.map(s => (
            <button
              key={s}
              type="button"
              aria-pressed={elegido === s}
              onClick={() => { setSize(s); setError(''); }}
              className={`px-3 py-1.5 text-[12px] font-semibold uppercase border transition-colors rounded-[10px] ${
                elegido === s ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      {!unico && sizes.length === 1 && (
        <p className="text-[12px] text-muted-foreground">
          {t(isColorVariant ? 'Color' : 'Talle')}: <span className="font-semibold text-foreground">{sizes[0]}</span>
        </p>
      )}

      <input
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder={t('Tu email')}
        aria-label={t('Tu email')}
        className="w-full border border-border rounded-[10px] px-3 py-2 text-[13px] bg-background"
      />
      <input
        type="tel"
        autoComplete="tel"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        placeholder={t('WhatsApp (opcional)')}
        aria-label={t('WhatsApp (opcional)')}
        className="w-full border border-border rounded-[10px] px-3 py-2 text-[13px] bg-background"
      />
      {/* Campo trampa para bots: fuera de pantalla y fuera del orden de tabulación. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={website}
        onChange={e => setWebsite(e.target.value)}
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      {error && <p className="text-[11px] text-destructive" role="alert">{error}</p>}

      <button
        type="submit"
        disabled={estado === 'enviando'}
        className="w-full bg-bg-dark hover:bg-bg-dark/85 text-primary-foreground py-2.5 text-[12px] font-bold uppercase tracking-[0.08em] rounded-[10px] transition-colors disabled:opacity-60"
      >
        {estado === 'enviando' ? t('Guardando…') : t('Avisame')}
      </button>
      <p className="text-[11px] text-muted-foreground">
        {t('Solo te escribimos por este producto.')}
      </p>
    </form>
  );
}
