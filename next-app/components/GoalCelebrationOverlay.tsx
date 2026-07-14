'use client';

import { useEffect, useRef, useState } from 'react';
import { useMaradonaEnglandStatus } from '@/hooks/useMaradonaEnglandStatus';

const GOLD = '#D4AF37';
const CELESTE = '#75AADB';
const CONFETTI_COLORS = [CELESTE, '#ffffff', GOLD];
const CONFETTI_COUNT = 60;
const VISIBLE_MS = 5500;

function Star({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={GOLD}>
      <path d="M12 0l3.09 6.26L22 7.27l-5 4.87 1.18 6.88L12 15.9l-6.18 3.25L7 12.14 2 7.27l6.91-1.01L12 0z" />
    </svg>
  );
}

type Piece = { left: number; delay: number; duration: number; color: string; rotate: number; size: number };

function makeConfetti(): Piece[] {
  return Array.from({ length: CONFETTI_COUNT }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    duration: 2.2 + Math.random() * 1.6,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    rotate: Math.random() * 360,
    size: 6 + Math.random() * 8,
  }));
}

// Overlay de festejo puro (sin CTA, sin link a producto) que se dispara solo cuando
// Argentina mete un gol durante el partido en vivo vs Inglaterra. Vive en el layout
// raíz para aparecer en todo el sitio, no solo en el banner de Maradona.
export default function GoalCelebrationOverlay() {
  const { data, phase } = useMaradonaEnglandStatus();
  const [visible, setVisible] = useState(false);
  const [confetti, setConfetti] = useState<Piece[]>([]);
  const prevGoals = useRef<number | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const goals = data?.match?.argGoals;
    if (goals == null) return;

    if (prevGoals.current !== null && goals > prevGoals.current) {
      setConfetti(makeConfetti());
      setVisible(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setVisible(false), VISIBLE_MS);
    }
    prevGoals.current = goals;
  }, [data?.match?.argGoals]);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  if (!visible || phase !== 'live') return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden pointer-events-none"
      style={{
        background: `linear-gradient(160deg, rgba(13,27,61,0.92) 0%, rgba(27,59,111,0.90) 55%, rgba(117,170,219,0.85) 130%)`,
        animation: 'goalFadeIn 0.3s ease-out',
      }}
    >
      {confetti.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            top: '-5%',
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.4,
            background: p.color,
            transform: `rotate(${p.rotate}deg)`,
            animation: `goalConfettiFall ${p.duration}s linear ${p.delay}s forwards`,
            borderRadius: 2,
          }}
        />
      ))}

      <div className="relative flex flex-col items-center gap-4 px-6 text-center">
        <div className="flex items-center gap-2">
          <Star size={20} /><Star size={20} /><Star size={20} />
        </div>
        <h2
          className="font-black uppercase text-white leading-none tracking-[-0.03em]"
          style={{ fontSize: 'clamp(56px, 14vw, 160px)', textShadow: '0 4px 30px rgba(0,0,0,0.35)' }}
        >
          GOL
        </h2>
        <p
          className="font-black uppercase tracking-[0.1em]"
          style={{ fontSize: 'clamp(18px, 3.5vw, 34px)', color: GOLD }}
        >
          Argentina
        </p>
        {data?.match && (
          <p className="font-bold uppercase text-white/80 tabular-nums" style={{ fontSize: 'clamp(20px, 4vw, 40px)' }}>
            {data.match.argTla} {data.match.argGoals} — {data.match.oppGoals} {data.match.oppTla}
          </p>
        )}
      </div>

      <style jsx>{`
        @keyframes goalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes goalConfettiFall {
          from { transform: translateY(0) rotate(0deg); opacity: 1; }
          to { transform: translateY(110vh) rotate(540deg); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
