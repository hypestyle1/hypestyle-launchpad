'use client';

import { useEffect, useRef, useState } from 'react';
import { normalizeHandle, isValidHandle } from '@/lib/private-access/config';

interface Props {
  /** Se llama con el nombre que escribió (o null) cuando el acceso fue aprobado. */
  onGranted: (name: string | null) => void;
  autoFocus?: boolean;
  /** Tamaño compacto para el modal; el gate a pantalla completa usa el normal. */
  compact?: boolean;
}

type Status = 'idle' | 'busy' | 'denied' | 'invalid' | 'error';

const DENIED_COPY = 'Este acceso es para nuestra lista de Mejores Amigos. Si entraste hace poco, probá de nuevo en un rato, o escribinos por DM y te sumamos.';

/**
 * Formulario de desbloqueo: usuario de Instagram (obligatorio) y nombre
 * (opcional). Lo comparten el modal del home y el gate de /private-access.
 * Un solo paso: campo, botón, listo.
 */
export default function UnlockForm({ onGranted, autoFocus, compact }: Props) {
  const [handle, setHandle] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [shake, setShake] = useState(false);
  const handleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) setTimeout(() => handleRef.current?.focus(), 250);
  }, [autoFocus]);

  const normalized = normalizeHandle(handle);
  const canSubmit = status !== 'busy' && normalized.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    if (!isValidHandle(normalized)) {
      setStatus('invalid');
      setShake(true); setTimeout(() => setShake(false), 400);
      return;
    }
    setStatus('busy');
    try {
      const res = await fetch('/api/private-access/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: normalized, name: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        onGranted(name.trim() || null);
        return;
      }
      setStatus(res.ok ? 'denied' : 'error');
      setShake(true); setTimeout(() => setShake(false), 400);
    } catch {
      setStatus('error');
    }
  }

  const gap = compact ? 'gap-4' : 'gap-5';

  return (
    <form onSubmit={submit} className={`flex flex-col ${gap} w-full`} noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor="pa-handle" className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
          Instagram
        </label>
        <div className={`pa-input flex items-center rounded-[12px] h-[52px] md:h-[54px] ${status === 'denied' || status === 'invalid' ? 'is-error' : ''} ${shake ? 'pa-shake' : ''}`}>
          <span className="pl-4 pr-1 text-[16px] text-white/45 select-none" aria-hidden>@</span>
          <input
            ref={handleRef}
            id="pa-handle"
            type="text"
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            spellCheck={false}
            enterKeyHint="go"
            maxLength={40}
            placeholder="tu.usuario"
            value={handle}
            // El @ ya está fijo adelante: si lo escriben (o lo pegan con el
            // usuario) se descarta, así no queda "@ @usuario".
            onChange={e => { setHandle(e.target.value.replace(/\s/g, '').replace(/^@+/, '')); if (status !== 'busy') setStatus('idle'); }}
            className="flex-1 h-full bg-transparent pr-4 text-[16px] text-white placeholder:text-white/28 outline-none"
            aria-invalid={status === 'denied' || status === 'invalid'}
            aria-describedby="pa-help"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="pa-name" className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
          Nombre <span className="text-white/30 normal-case tracking-normal font-normal">(opcional)</span>
        </label>
        <input
          id="pa-name"
          type="text"
          autoComplete="given-name"
          autoCapitalize="words"
          enterKeyHint="go"
          maxLength={80}
          placeholder="¿Cómo te llamás?"
          value={name}
          onChange={e => setName(e.target.value)}
          className="pa-input rounded-[12px] h-[52px] md:h-[54px] px-4 text-[16px]"
        />
      </div>

      <div id="pa-help" aria-live="polite" className="min-h-[18px] -mt-1">
        {status === 'denied' && (
          <p className="text-[12.5px] leading-snug text-white/75">{DENIED_COPY}</p>
        )}
        {status === 'invalid' && (
          <p className="text-[12.5px] leading-snug text-white/75">Revisá el usuario: solo letras, números, puntos y guiones bajos.</p>
        )}
        {status === 'error' && (
          <p className="text-[12.5px] leading-snug text-white/75">No pudimos validar tu acceso. Probá de nuevo en unos segundos.</p>
        )}
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="h-[54px] rounded-[14px] bg-white text-[#0a0a0a] text-[12px] font-bold uppercase tracking-[0.24em] transition-colors hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {status === 'busy' ? 'Verificando…' : 'Desbloquear'}
      </button>

      <p className="text-[11px] leading-relaxed text-white/38 text-center">
        Solo usamos tu usuario para confirmar que estás en Mejores Amigos.
      </p>
    </form>
  );
}
