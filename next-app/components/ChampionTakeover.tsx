'use client';

import { useEffect, useState } from 'react';
import { useFinalStatus } from '@/hooks/useFinalStatus';

const GOLD = '#D4AF37';
const SESSION_KEY = 'hy-champion-takeover-seen';

function Star({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={GOLD}>
      <path d="M12 0l3.09 6.26L22 7.27l-5 4.87 1.18 6.88L12 15.9l-6.18 3.25L7 12.14 2 7.27l6.91-1.01L12 0z" />
    </svg>
  );
}

// Toma de pantalla completa si Argentina sale campeón del mundo — el equivalente,
// para la final, del MatchWinTakeover que se usó para "A la final" (semifinal vs
// Inglaterra). Mismo patrón: una vez por sesión, sin CTA ni link a producto, se ve
// cualquiera que entre mientras dure el estado "won" de la final.
export default function ChampionTakeover() {
  const { phase } = useFinalStatus();
  const [stage, setStage] = useState<'idle' | 'visible' | 'exit' | 'done'>('idle');

  useEffect(() => {
    if (phase !== 'won') return;
    if (sessionStorage.getItem(SESSION_KEY)) { setStage('done'); return; }

    const t1 = setTimeout(() => setStage('visible'), 3800);
    const t2 = setTimeout(() => setStage('exit'), 3800 + 5200);
    const t3 = setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, '1');
      setStage('done');
    }, 3800 + 5200 + 700);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [phase]);

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setStage('exit');
    setTimeout(() => setStage('done'), 700);
  };

  if (phase !== 'won' || stage === 'idle' || stage === 'done') return null;

  const exiting = stage === 'exit';

  return (
    <div
      onClick={dismiss}
      className="fixed inset-0 z-[350] flex items-center justify-center cursor-pointer"
      style={{ opacity: exiting ? 0 : 1, transition: 'opacity 0.7s ease' }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/final/messi-final.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center 15%',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(160deg, rgba(13,27,61,0.96) 0%, rgba(27,59,111,0.94) 55%, rgba(117,170,219,0.82) 130%)`,
        }}
      />

      <div className="relative flex flex-col items-center gap-4 px-6 text-center">
        <div className="flex items-center gap-2">
          <Star /><Star /><Star /><Star />
        </div>
        <p className="font-bold uppercase tracking-[0.14em]" style={{ fontSize: 'clamp(13px, 2.2vw, 18px)', color: GOLD }}>
          Argentina campeón del mundo
        </p>
        <h1
          className="font-black uppercase text-white leading-none tracking-[-0.03em]"
          style={{ fontSize: 'clamp(44px, 12vw, 128px)', textShadow: '0 4px 30px rgba(0,0,0,0.35)' }}
        >
          Cuarta estrella
        </h1>
        <p className="font-black uppercase text-white/85" style={{ fontSize: 'clamp(14px, 2.6vw, 26px)', letterSpacing: '0.06em' }}>
          Mundial 26&apos;
        </p>
        <p className="text-white/40 text-[11px] uppercase tracking-[0.2em] mt-6">
          Tocá para continuar
        </p>
      </div>
    </div>
  );
}
