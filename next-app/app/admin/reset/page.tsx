'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const MIN = 8;

function Formulario() {
  const router = useRouter();
  const token = useSearchParams().get('token') || '';

  const [verificando, setVerificando] = useState(true);
  const [valido, setValido] = useState(false);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [repetir, setRepetir] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);

  // Se valida el link antes de mostrar el formulario: sin esto se tipea una
  // contraseña entera para recién ahí enterarse de que venció.
  useEffect(() => {
    if (!token) { setVerificando(false); return; }
    fetch(`/api/admin/auth/reset?token=${encodeURIComponent(token)}`)
      .then(r => (r.ok ? r.json() : { valid: false }))
      .then(d => { setValido(!!d.valid); setEmail(d.email || ''); })
      .catch(() => setValido(false))
      .finally(() => setVerificando(false));
  }, [token]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (pass.length < MIN) { setError(`La contraseña necesita al menos ${MIN} caracteres`); return; }
    if (pass !== repetir) { setError('Las dos contraseñas tienen que coincidir'); return; }

    setGuardando(true);
    const res = await fetch('/api/admin/auth/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: pass }),
    });
    setGuardando(false);

    if (res.ok) {
      setListo(true);
      setTimeout(() => router.push('/admin/login'), 2400);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.message || 'No pudimos guardar la contraseña');
    }
  }

  const input = 'w-full border border-border-mid rounded-md px-3 py-2.5 text-[13px] focus:outline-none focus:border-ring';

  if (verificando) return <p className="text-[13px] text-muted-foreground text-center py-6">Verificando el link...</p>;

  if (!valido) {
    return (
      <div className="text-center py-2">
        <p className="text-[14px] font-semibold text-foreground mb-2">Este link ya no sirve</p>
        <p className="text-[13px] text-muted-foreground leading-relaxed mb-6">
          Los links de recuperación valen 2 horas y se usan una sola vez. Pedí uno nuevo desde el ingreso.
        </p>
        <Link href="/admin/login" className="inline-block bg-primary text-primary-foreground rounded-md py-2.5 px-6 text-[12px] font-bold uppercase tracking-[0.1em] hover:opacity-90">
          Volver al ingreso
        </Link>
      </div>
    );
  }

  if (listo) {
    return (
      <div className="text-center py-2">
        <p className="text-[14px] font-semibold text-foreground mb-2">Listo</p>
        <p className="text-[13px] text-muted-foreground">Tu contraseña quedó actualizada. Te llevamos al ingreso.</p>
      </div>
    );
  }

  return (
    <form onSubmit={guardar} className="space-y-2.5">
      {email && <p className="text-[12px] text-muted-foreground text-center mb-4">{email}</p>}
      <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Contraseña nueva" autoFocus required minLength={MIN} autoComplete="new-password" className={input} />
      <input type="password" value={repetir} onChange={e => setRepetir(e.target.value)} placeholder="Repetila" required minLength={MIN} autoComplete="new-password" className={input} />
      <p className="text-[11px] text-muted-foreground/70">Al menos {MIN} caracteres.</p>
      {error && <p className="text-[12px] text-red-600">{error}</p>}
      <button type="submit" disabled={guardando} className="w-full bg-primary text-primary-foreground rounded-md py-2.5 text-[12px] font-bold uppercase tracking-[0.1em] hover:opacity-90 disabled:opacity-50 !mt-5">
        {guardando ? '...' : 'Guardar contraseña'}
      </button>
    </form>
  );
}

export default function ResetAdminPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="bg-card rounded-lg shadow-sm border border-border p-8 w-full max-w-sm">
        <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto mx-auto mb-2" />
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70 text-center mb-7">Elegí tu contraseña</p>
        <Suspense fallback={<p className="text-[13px] text-muted-foreground text-center py-6">Cargando...</p>}>
          <Formulario />
        </Suspense>
      </div>
    </div>
  );
}
