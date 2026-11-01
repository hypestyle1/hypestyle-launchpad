'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CyberWordmark from '@/components/cyber/CyberWordmark';
import { PUBLIC_OPEN } from '@/lib/cyber-gate';

/* Puerta de CYBER HYPE.
 *
 * Reemplaza la pantalla del drop de junio, que tenía la fecha escrita a mano y
 * se bajaba diez fotos de fondo (~65 MB en originales) para un cartel que se
 * mira treinta segundos. Acá no hay imágenes: el fondo es negro, la identidad
 * la pone el wordmark y lo único que pesa es la tipografía que el sitio ya
 * carga.
 *
 * Durante todo el cierre se puede entrar con la contraseña. Las 19:00 son
 * solamente la hora de difusión; el countdown apunta a las 20:00.
 *
 * El `maxAge` de la cookie lo pone /api/acceso. Acá no se guarda nada.
 */

function pad(n: number) { return String(n).padStart(2, '0'); }

export default function AccesoPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [montado, setMontado] = useState(false);
  const [restante, setRestante] = useState(0);
  const [ahora, setAhora] = useState(0);
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  // El reloj arranca después de montar: en el server no hay hora del visitante
  // y pintar un countdown en SSR da desajuste de hidratación.
  useEffect(() => {
    setMontado(true);
    const tick = () => {
      const t = Date.now();
      setAhora(t);
      setRestante(Math.max(0, PUBLIC_OPEN - t));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Si el reloj cruza la apertura con la pestaña abierta, la tienda abre sola.
  useEffect(() => {
    if (montado && ahora >= PUBLIC_OPEN) router.replace('/');
  }, [montado, ahora, router]);

  const h = Math.floor(restante / 3_600_000);
  const m = Math.floor((restante % 3_600_000) / 60_000);
  const s = Math.floor((restante % 60_000) / 1_000);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (!pw.trim() || enviando) return;
    setEnviando(true);
    setError('');
    try {
      const r = await fetch('/api/acceso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (r.ok) { window.location.replace('/'); return; }
      if (r.status === 401) {
        setError('Esa clave no es.');
        inputRef.current?.select();
      } else if (r.status === 503) {
        setError('El acceso no está configurado. Contactanos para que lo revisemos.');
      } else {
        setError('No se pudo verificar. Probá de nuevo.');
      }
    } catch {
      setError('No se pudo verificar. Probá de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center bg-[#0a0a0a] px-6 py-12 text-white">
      <div className="w-full max-w-[380px]">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.26em] text-white/40">
          2 · 3 · 4 de noviembre
        </p>

        <h1 className="text-[clamp(38px,13vw,56px)] leading-[0.86]">
          <CyberWordmark animate tone="dark" />
        </h1>

        <p className="mt-4 text-[13.5px] leading-[1.5] text-white/60">
          La clave se comparte a las 19:00 por Close Friends y WhatsApp. Si ya la tenés, podés entrar.
        </p>

        {/* Countdown: la hora es lo único que se publica mientras está cerrado,
            y es lo que da el motivo para volver. */}
        <div className="mt-7 border-y border-white/12 py-5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
            Abre para todos en
          </p>
          <p suppressHydrationWarning className="text-[34px] font-black tabular-nums tracking-[0.02em]">
            {montado ? `${pad(h)}:${pad(m)}:${pad(s)}` : '--:--:--'}
          </p>
        </div>

        <form onSubmit={entrar} className="mt-7">
          <label htmlFor="clave" className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
            Acceso anticipado
          </label>
          <input
            id="clave"
            ref={inputRef}
            value={pw}
            onChange={(e) => { setPw(e.target.value); setError(''); }}
            type="password"
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="Tu clave"
            className="h-[52px] w-full rounded-[10px] border border-white/20 bg-white/[0.06] px-4 text-[15px] text-white outline-none placeholder:text-white/30 focus:border-white/45"
          />
          {error && <p className="mt-2 text-[12.5px] text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={enviando || !pw.trim()}
            className="mt-3 h-[52px] w-full rounded-full bg-white text-[12.5px] font-bold uppercase tracking-[0.14em] text-[#0a0a0a] transition-opacity disabled:opacity-35"
          >
            {enviando ? 'Verificando…' : 'Entrar'}
          </button>
        </form>

        <p className="mt-8 text-[11px] leading-[1.5] text-white/30">
          HYPE® STYLE&amp;CULTURE
        </p>
      </div>
    </main>
  );
}
