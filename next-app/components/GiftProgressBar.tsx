'use client';

import { useLocale } from '@/context/LocaleContext';
import { useGiftProgress, type GiftMilestone, type GiftProgressResponse } from '@/hooks/useGiftProgress';

interface GiftProgressBarProps {
  email?: string;
  couponCode?: string;
  className?: string;
}

/**
 * Barra de progreso de Purchase Gift. Sincroniza automáticamente la línea de
 * regalo en el carrito (vía useGiftProgress) y muestra el estado — todos los
 * niveles como "ticks" sobre la barra, no solo el próximo, con foto del
 * regalo tanto en la confirmación de desbloqueo como en el próximo nivel.
 * Estética sobria: blanco/negro con verde como acento de "logro" (mismo tono
 * que ya usan la barra de envío gratis y el 3x2), variables CSS centralizadas
 * en globals.css (--hpg-*) para el track/fill/ticks. El regalo mostrado acá
 * nunca es una garantía — se vuelve a calcular server-side al crear la orden.
 */
export default function GiftProgressBar({ email, couponCode, className = 'px-6 pt-3 pb-3 border-b border-border' }: GiftProgressBarProps) {
  const { formatPrice } = useLocale();
  const { data } = useGiftProgress({ email, couponCode });

  if (!data || !data.active || data.excluded) return null;
  if (!data.milestones || data.milestones.length === 0) return null;

  const milestones = data.milestones;
  const reached = milestones.filter((m) => m.reached);
  const lastReached = reached[reached.length - 1];
  const pct = data.progress?.percentage ?? 0;
  const maxAmount = data.progress?.maximum_threshold ?? 0;
  const nextMilestone = data.next_level ? milestones.find((m) => m.id === data.next_level!.id) : undefined;
  const nextMessage = buildNextMessage(data, nextMilestone, formatPrice);

  if (!lastReached && !nextMessage) return null;

  return (
    <div className={className}>
      <div
        className="rounded-[10px] px-3 py-2.5"
        style={{ background: 'var(--hpg-card-bg)', border: '1px solid var(--hpg-card-border)' }}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <GiftIcon />
          <span className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--hpg-fill-bg)' }}>
            Regalo por compra
          </span>
        </div>

        {lastReached && (
          <div className="flex items-center gap-2.5 rounded-[8px] bg-white/60 px-2 py-1.5 mb-1.5">
            <GiftThumb image={lastReached.image} />
            <p className="text-[11px] font-bold leading-snug text-green-700">
              Desbloqueaste tu {lastReached.name} de regalo
            </p>
          </div>
        )}

        {nextMessage && (
          <div className="flex items-center gap-2.5" aria-live="polite">
            <GiftThumb image={nextMilestone?.image} muted />
            <p className="text-[11px] leading-snug" style={{ color: 'var(--hpg-text-muted)' }}>{nextMessage}</p>
          </div>
        )}

        <div
          className="relative mt-2.5 h-[4px] rounded-full overflow-visible"
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
          {maxAmount > 0 && milestones.map((m) => (
            <span
              key={m.id}
              title={`${m.name} — ${formatPrice(m.amount)}`}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 transition-all duration-300"
              style={{
                left: `${Math.min(100, (m.amount / maxAmount) * 100)}%`,
                width: m.reached ? '13px' : '10px',
                height: m.reached ? '13px' : '10px',
                background: m.reached ? 'var(--hpg-tick-border-reached)' : 'var(--hpg-tick-bg)',
                borderColor: m.reached ? 'var(--hpg-tick-border-reached)' : 'var(--hpg-tick-border)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Ícono propio (sin emoji) — caja de regalo simple en trazo. */
function GiftIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--hpg-fill-bg)' }}>
      <rect x="3" y="8" width="18" height="13" />
      <path d="M3 12h18" />
      <path d="M12 8v13" />
      <path d="M12 8c-1.5-3-3.5-4-5-3s-1 3.5 0 3" />
      <path d="M12 8c1.5-3 3.5-4 5-3s1 3.5 0 3" />
    </svg>
  );
}

/** Thumbnail chico del producto de regalo — placeholder neutro si no hay imagen. */
function GiftThumb({ image, muted = false }: { image?: string; muted?: boolean }) {
  const size = muted ? 'w-6 h-6' : 'w-8 h-8';
  if (image) {
    return <img src={image} alt="" className={`${size} rounded-[6px] object-cover flex-shrink-0 ${muted ? 'opacity-70' : ''}`} />;
  }
  return <span className={`${size} rounded-[6px] flex-shrink-0`} style={{ background: 'var(--hpg-track-bg)' }} />;
}

/**
 * Mensaje hacia el próximo nivel (con foto de ESE regalo). Si ya se alcanzó
 * el máximo, no hace falta mensaje aparte — el banner de "Desbloqueaste tu
 * [nivel máximo]" ya lo cubre.
 */
function buildNextMessage(data: GiftProgressResponse, nextMilestone: GiftMilestone | undefined, formatPrice: (n: number) => string): string {
  if (data.max_reached || !data.next_level) {
    return '';
  }
  const next = data.next_level;
  const template = nextMilestone?.customer_text && nextMilestone.customer_text.trim()
    ? nextMilestone.customer_text
    : 'Sumá {remaining} más y llevate {gift} de regalo.';
  return template
    .replace('{remaining}', formatPrice(next.remaining))
    .replace('{gift}', nextMilestone?.name ?? '');
}
