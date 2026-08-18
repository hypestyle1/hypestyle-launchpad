'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Segundo paso de la recuperación: el cliente llega acá desde el mail. Mismo
// vestido de vidrio que /mayoristas/login para que se note que es la misma casa.

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

const MIN_LEN = 8;

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') || '';

  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [pass, setPass] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // Se valida el link antes de mostrar el formulario: sin esto el cliente tipea
  // una contraseña entera para recién ahí enterarse de que el link venció.
  useEffect(() => {
    if (!token) { setChecking(false); return; }
    fetch(`/api/mayorista/reset?token=${encodeURIComponent(token)}`)
      .then(res => res.ok ? res.json() : { valid: false })
      .then(data => setValid(!!data.valid))
      .catch(() => setValid(false))
      .finally(() => setChecking(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (pass.length < MIN_LEN) { setError(`La contraseña necesita al menos ${MIN_LEN} caracteres`); return; }
    if (pass !== repeat) { setError('Las dos contraseñas tienen que coincidir'); return; }

    setSaving(true);
    const res = await fetch('/api/mayorista/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: pass }),
    });
    setSaving(false);

    if (res.ok) {
      setDone(true);
      setTimeout(() => router.push('/mayoristas/login'), 2600);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || 'No pudimos guardar la contraseña');
    }
  }

  if (checking) {
    return <p className="text-center text-[13px] text-foreground/50 py-6">Verificando el link...</p>;
  }

  if (!valid) {
    return (
      <div className="text-center py-2">
        <p className="text-[14px] font-semibold mb-2">Este link ya no sirve</p>
        <p className="text-[13px] text-foreground/60 leading-relaxed mb-6">
          Los links de recuperación valen 2 horas y se usan una sola vez. Pedí uno nuevo desde el ingreso.
        </p>
        <Link
          href="/mayoristas/login"
          className="inline-block bg-bg-dark text-primary-foreground py-3 px-7 text-[12px] font-bold uppercase tracking-[0.1em] rounded-full hover:bg-bg-dark/85 transition-colors"
        >
          Volver al ingreso
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center py-2">
        <p className="text-[14px] font-semibold mb-2">Listo</p>
        <p className="text-[13px] text-foreground/60 leading-relaxed">
          Tu contraseña quedó actualizada. Te llevamos al ingreso.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      <input
        type="password"
        value={pass}
        onChange={(e) => setPass(e.target.value)}
        placeholder="Contraseña nueva"
        autoFocus
        required
        minLength={MIN_LEN}
        className="w-full px-4 py-3 text-[13px] rounded-[12px] placeholder:text-foreground/40 focus:outline-none transition-shadow"
        style={glassInput}
      />
      <input
        type="password"
        value={repeat}
        onChange={(e) => setRepeat(e.target.value)}
        placeholder="Repetila"
        required
        minLength={MIN_LEN}
        className="w-full px-4 py-3 text-[13px] rounded-[12px] placeholder:text-foreground/40 focus:outline-none transition-shadow"
        style={glassInput}
      />
      <p className="text-[11px] text-foreground/40 pt-1">Al menos {MIN_LEN} caracteres.</p>

      {error && <p className="text-[12px] text-destructive text-center pt-1">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-bg-dark text-primary-foreground py-3 text-[12px] font-bold uppercase tracking-[0.1em] rounded-full hover:bg-bg-dark/85 transition-colors disabled:opacity-60 !mt-6"
      >
        {saving ? '...' : 'Guardar contraseña'}
      </button>
    </form>
  );
}

export default function MayoristaResetPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden">
      <div
        className="absolute -inset-6 bg-cover bg-center"
        style={{
          backgroundImage: "url('/fw26-camo-editorial.webp')",
          filter: 'blur(18px) brightness(0.5) saturate(1.1)',
          transform: 'scale(1.08)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(160deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,.10) 40%, rgba(0,0,0,.10) 60%, rgba(0,0,0,.5) 100%)' }}
      />

      <div className="relative z-10 w-full max-w-[380px] rounded-[24px] overflow-hidden" style={glassCard}>
        <div className="px-8 pt-9 pb-8">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-6 w-auto mx-auto" />
          <p className="text-center text-[10px] uppercase tracking-[0.3em] text-foreground/45 mt-4 mb-8">
            Elegí tu contraseña
          </p>
          <Suspense fallback={<p className="text-center text-[13px] text-foreground/50 py-6">Cargando...</p>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
