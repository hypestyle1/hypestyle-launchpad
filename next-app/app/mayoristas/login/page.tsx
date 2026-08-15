'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Mismas fotos y misma técnica (blur + oscurecido + scrim) que usamos en el
// gate de early access (/acceso) — le da branding sin competir con la tarjeta.
const SLIDES = [
  '/polo-gate-1.webp',
  '/polo-gate-2.webp',
  '/fw26-camo-editorial.webp',
];

const glassCard = {
  background: 'rgba(245, 243, 237, 0.72)',
  backdropFilter: 'blur(40px) saturate(180%)',
  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.45)',
  boxShadow: '0 24px 80px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.55)',
} as React.CSSProperties;

const glassInput = {
  background: 'rgba(255,255,255,0.5)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.65)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
} as React.CSSProperties;

export default function MayoristaLoginPage() {
  const router = useRouter();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSlideIdx(i => (i + 1) % SLIDES.length), 6000);
    return () => clearInterval(id);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/mayorista/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, pass }),
    });
    setLoading(false);
    if (res.ok) {
      router.push('/mayoristas');
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || 'Usuario o contraseña incorrectos');
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden">
      {/* Fondo — slideshow blureado */}
      {SLIDES.map((src, i) => (
        <div
          key={src}
          className="absolute -inset-6 bg-cover bg-center transition-opacity duration-[1400ms] ease-in-out"
          style={{
            backgroundImage: `url('${src}')`,
            filter: 'blur(18px) brightness(0.5) saturate(1.1)',
            transform: 'scale(1.08)',
            opacity: i === slideIdx ? 1 : 0,
          }}
        />
      ))}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(160deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,.10) 40%, rgba(0,0,0,.10) 60%, rgba(0,0,0,.5) 100%)' }}
      />

      <div className="relative z-10 w-full max-w-[380px] rounded-[24px] overflow-hidden" style={glassCard}>
        <div className="px-8 pt-9 pb-8">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-6 w-auto mx-auto" />
          <p className="text-center text-[10px] uppercase tracking-[0.3em] text-foreground/45 mt-4">
            Catálogo mayorista
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-2.5">
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="Tu usuario"
              autoFocus
              required
              className="w-full px-4 py-3 text-[13px] rounded-[12px] placeholder:text-foreground/40 focus:outline-none transition-shadow"
              style={glassInput}
            />
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Tu contraseña"
              required
              className="w-full px-4 py-3 text-[13px] rounded-[12px] placeholder:text-foreground/40 focus:outline-none transition-shadow"
              style={glassInput}
            />

            {error && <p className="text-[12px] text-destructive text-center pt-1">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-bg-dark text-primary-foreground py-3 text-[12px] font-bold uppercase tracking-[0.1em] rounded-full hover:bg-bg-dark/85 transition-colors disabled:opacity-60 !mt-6"
            >
              {loading ? '...' : 'Ingresar'}
            </button>
          </form>

          <div className="flex justify-center mt-6">
            <img src="/STYLE&CULTURE BLACK.png" alt="Style&Culture" className="h-4 w-auto object-contain opacity-70" />
          </div>
        </div>
      </div>
    </div>
  );
}
