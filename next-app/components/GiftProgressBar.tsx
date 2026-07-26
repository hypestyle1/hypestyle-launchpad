'use client';

import { useLocale } from '@/context/LocaleContext';
import { useGiftProgress, type GiftProgressResponse } from '@/hooks/useGiftProgress';

interface GiftProgressBarProps {
  email?: string;
  couponCode?: string;
  className?: string;
}

/**
 * Barra de progreso de Purchase Gift. Sincroniza automáticamente la línea de
 * regalo en el carrito (vía useGiftProgress) y muestra el estado — todos los
 * niveles como "ticks" sobre la barra, no solo el próximo. Estética sobria:
 * blanco/negro, sin emojis, variables CSS centralizadas en globals.css
 * (--hpg-*) para poder ajustar el diseño sin tocar este archivo. El regalo
 * mostrado acá nunca es una garantía — se vuelve a calcular server-side al
 * crear la orden.
 */
export default function GiftProgressBar({ email, couponCode, className = 'px-6 pt-3 pb-3 border-b border-border' }: GiftProgressBarProps) {
  const { formatPrice } = useLocale();
  const { data } = useGiftProgress({ email, couponCode });

  if (!data || !data.active || data.excluded) return null;
  if (!data.milestones || data.milestones.length === 0) return null;

  const messages = buildMessages(data, formatPrice);
  if (messages.length === 0) return null;

  const pct = data.progress?.percentage ?? 0;
  const maxAmount = data.progress?.maximum_threshold ?? 0;

  return (
    <div className={className}>
      <div aria-live="polite">
        {messages.map((msg, i) => (
          <p
            key={i}
            className="text-[11px] text-center leading-snug"
            style={{ color: i === 0 && data.max_reached ? undefined : 'var(--hpg-text)' }}
          >
            {i === 0 && (data.max_reached || hasJustReached(data)) ? (
              <span className="font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--hpg-text)' }}>{msg}</span>
            ) : (
              <span style={{ color: 'var(--hpg-text-muted)' }}>{msg}</span>
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
        {maxAmount > 0 && data.milestones.map((m) => (
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

/** true si al menos un milestone ya está alcanzado (para resaltar el mensaje). */
function hasJustReached(data: GiftProgressResponse): boolean {
  return (data.milestones || []).some((m) => m.reached);
}

/**
 * Arma hasta 2 líneas de mensaje: confirmación del último nivel alcanzado
 * (si hay uno) + el próximo nivel pendiente, o el mensaje de regalo máximo.
 */
function buildMessages(data: GiftProgressResponse, formatPrice: (n: number) => string): string[] {
  const messages: string[] = [];
  const milestones = data.milestones || [];
  const reached = milestones.filter((m) => m.reached);
  const lastReached = reached[reached.length - 1];

  if (lastReached) {
    messages.push(`Desbloqueaste tu ${lastReached.name} de regalo.`);
  }

  if (data.max_reached) {
    if (!lastReached) {
      messages.push('Desbloqueaste el regalo máximo.');
    }
  } else if (data.next_level) {
    const next = data.next_level;
    const nextMilestone = milestones.find((m) => m.id === next.id);
    const template = nextMilestone?.customer_text && nextMilestone.customer_text.trim()
      ? nextMilestone.customer_text
      : 'Sumá {remaining} más y llevate {gift} de regalo.';
    messages.push(
      template
        .replace('{remaining}', formatPrice(next.remaining))
        .replace('{gift}', nextMilestone?.name ?? '')
    );
  }

  return messages;
}
