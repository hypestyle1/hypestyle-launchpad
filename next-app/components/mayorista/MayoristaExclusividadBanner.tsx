'use client';

import { useEffect, useState } from 'react';
import { WHATSAPP_URL } from '@/lib/mayorista-copy';

/** Aviso para la cuenta de una ciudad donde otro local tiene la exclusividad
 *  (lib/mayorista-exclusividad.ts). Si viene `mensaje` lo usa; si no, lo pide
 *  a /api/mayorista/perfil. Sin bloqueo no renderiza nada. */
export default function MayoristaExclusividadBanner({ mensaje: inicial }: { mensaje?: string | null }) {
  const [mensaje, setMensaje] = useState<string | null>(inicial ?? null);

  useEffect(() => {
    if (inicial !== undefined) { setMensaje(inicial); return; }
    let vivo = true;
    fetch('/api/mayorista/perfil')
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (vivo && data?.bloqueoExclusividad?.mensaje) setMensaje(data.bloqueoExclusividad.mensaje); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [inicial]);

  if (!mensaje) return null;
  return (
    <div role="status" className="max-w-6xl mx-auto px-5 sm:px-8 mt-6">
      <div className="rounded-[12px] border border-foreground px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <p className="text-[13px] leading-relaxed">{mensaje}</p>
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
          className="shrink-0 px-4 py-2 rounded-full bg-bg-dark text-primary-foreground text-[11px] font-semibold uppercase tracking-wide text-center hover:bg-bg-dark/85 transition-colors">
          Escribinos por WhatsApp
        </a>
      </div>
    </div>
  );
}
