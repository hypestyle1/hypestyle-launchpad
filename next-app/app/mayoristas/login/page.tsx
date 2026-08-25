'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  // Recuperación: se resuelve en la misma tarjeta, sin mandar al cliente a otra
  // pantalla. El que llega acá ya está trabado — cuantos menos pasos, mejor.
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

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
      // El fallback NO puede ser "usuario o contraseña incorrectos": un 500 con
      // cuerpo vacío caía siempre en ese mensaje, así que una caída del
      // servidor se le mostraba al cliente como si hubiera tipeado mal la
      // clave. Un mayorista pasó una semana reintentando por culpa de esto.
      // Solo el 401 habla de credenciales; el resto dice que el problema es
      // nuestro.
      if (data.message) {
        setError(data.message);
      } else if (res.status === 401) {
        setError('Usuario o contraseña incorrectos');
      } else {
        setError('No pudimos abrir tu sesión — es un problema nuestro, no de tus datos. Escribinos y lo resolvemos.');
      }
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/mayorista/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail }),
    });
    setLoading(false);
    if (res.ok) {
      // Confirmación igual exista o no la cuenta: si dijéramos "ese mail no es
      // mayorista" estaríamos regalando la lista de clientes a cualquiera.
      setForgotSent(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || 'No pudimos enviarte el mail');
    }
  }

  function backToLogin() {
    setMode('login');
    setForgotSent(false);
    setError('');
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
            {mode === 'login' ? 'Tu catálogo' : 'Recuperar acceso'}
          </p>

          {mode === 'forgot' ? (
            forgotSent ? (
              <div className="mt-8 text-center">
                <p className="text-[14px] font-semibold mb-2">Revisá tu casilla</p>
                <p className="text-[13px] text-foreground/60 leading-relaxed">
                  Si ese mail tiene acceso, le mandamos un link para elegir una contraseña nueva. Vale por 2 horas.
                </p>
                <button
                  onClick={backToLogin}
                  className="text-[11px] uppercase tracking-wide text-foreground/50 hover:text-foreground transition-colors mt-7"
                >
                  Volver al ingreso
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="mt-8 space-y-2.5">
                <p className="text-[12px] text-foreground/55 leading-relaxed pb-1">
                  Escribí el mail con el que entrás y te mandamos un link para elegir una contraseña nueva.
                </p>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Tu mail"
                  autoFocus
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
                  {loading ? '...' : 'Enviar link'}
                </button>

                <div className="text-center !mt-5">
                  <button
                    type="button"
                    onClick={backToLogin}
                    className="text-[11px] uppercase tracking-wide text-foreground/50 hover:text-foreground transition-colors"
                  >
                    Volver al ingreso
                  </button>
                </div>
              </form>
            )
          ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-2.5">
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="Tu mail"
              autoComplete="username"
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
              autoComplete="current-password"
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

            <div className="text-center !mt-5">
              <button
                type="button"
                onClick={() => { setMode('forgot'); setError(''); setForgotEmail(user.includes('@') ? user : ''); }}
                className="text-[11px] uppercase tracking-wide text-foreground/50 hover:text-foreground transition-colors"
              >
                Olvidé mi contraseña
              </button>
            </div>

            <div className="text-center !mt-4 pt-4 border-t border-foreground/10">
              <p className="text-[12px] text-foreground/50">
                ¿Todavía no trabajás con nosotros?{' '}
                <Link href="/mayoristas/solicitud" className="text-foreground font-medium underline underline-offset-2">
                  Pedí tu acceso
                </Link>
              </p>
            </div>
          </form>
          )}

          <div className="flex justify-center mt-6">
            <img src="/STYLE&CULTURE BLACK.png" alt="Style&Culture" className="h-4 w-auto object-contain opacity-70" />
          </div>
        </div>
      </div>
    </div>
  );
}
