'use client';

import { useCart } from '@/context/CartContext';
import { useLocale } from '@/context/LocaleContext';
import { useGiftProgress, GiftProgress } from '@/hooks/useGiftProgress';

/**
 * Barra de progreso de Purchase Gift. 100% informativa — el plugin de
 * WordPress decide de verdad qué regalo corresponde recién al crear la
 * orden (ver docs/purchase-gift-audit.md). Estética sobria: blanco/negro,
 * sin emojis, sin gradientes, variables CSS centralizadas en globals.css
 * (--hpg-*) para poder ajustar el diseño sin tocar este archivo.
 */
export default function GiftProgressBar({
  discountAmount = 0,
  className = 'px-6 pt-3 pb-3 border-b border-border',
}: {
  discountAmount?: number;
  className?: string;
}) {
  const { items } = useCart();
  const { formatPrice } = useLocale();
  const progress = useGiftProgress(items, discountAmount);

  if (!progress || !progress.active || progress.excluded) return null;
  if (!progress.milestones || progress.milestones.length === 0) return null;

  const messages = buildMessages(progress, formatPrice);
  if (messages.length === 0) return null;

  const pct = progress.progress_pct ?? 0;
  const maxAmount = progress.max_amount ?? 0;

  return (
    <div className={className}>
      <div aria-live="polite">
        {messages.map((msg, i) => (
          <p
            key={i}
            className="text-[11px] text-center leading-snug"
            style={{ color: i === 0 && progress.max_reached ? undefined : 'var(--hpg-text)' }}
          >
            {i === 0 && (progress.max_reached || hasJustReached(progress)) ? (
              <span className="font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--hpg-text)' }}>{msg}</span>
            ) : (
              <>
                <span style={{ color: 'var(--hpg-text-muted)' }}>{msg}</span>
              </>
            )}
          </p>
        ))}
      </div>

      <div
        className="relative mt-2 h-[3px] rounded-full overflow-visible"
        style={{ background: 'var(--hpg-track-bg)' }}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso hacia el próximo regalo por compra"
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: 'var(--hpg-fill-bg)' }}
        />
        {maxAmount > 0 && progress.milestones.map(m => (
          <span
            key={m.id}
            title={`${m.name} — ${formatPrice(m.amount)}`}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-[1.5px]"
            style={{
              left: `${Math.min(100, (m.amount / maxAmount) * 100)}%`,
              background: 'var(--hpg-tick-bg)',
              borderColor: m.reached ? 'var(--hpg-tick-border-reached)' : 'var(--hpg-tick-border)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * @param progress
 * @returns true si el último milestone se acaba de alcanzar (para resaltar
 * el mensaje de confirmación con más énfasis tipográfico).
 */
function hasJustReached(progress: GiftProgress): boolean {
  const reached = (progress.milestones || []).filter(m => m.reached);
  return reached.length > 0;
}

/**
 * Arma hasta 2 líneas de mensaje: confirmación del último nivel alcanzado
 * (si hay uno) + el próximo nivel pendiente, o el mensaje de regalo máximo.
 *
 * @param progress
 * @param formatPrice
 */
function buildMessages(progress: GiftProgress, formatPrice: (n: number) => string): string[] {
  const messages: string[] = [];
  const milestones = progress.milestones || [];
  const reached = milestones.filter(m => m.reached);
  const lastReached = reached[reached.length - 1];

  if (lastReached) {
    messages.push(`Desbloqueaste tu ${lastReached.name} de regalo.`);
  }

  if (progress.max_reached) {
    if (!lastReached) {
      messages.push('Desbloqueaste el regalo máximo.');
    }
  } else if (progress.next) {
    const next = progress.next;
    const template = next.customer_text && next.customer_text.trim()
      ? next.customer_text
      : 'Sumá {remaining} más y llevate {gift} de regalo.';
    messages.push(
      template
        .replace('{remaining}', formatPrice(next.remaining))
        .replace('{gift}', next.name)
    );
  }

  return messages;
}
