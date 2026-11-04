'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ScrambleText } from '@/components/ui/scramble-text';
import { isExcludedPage } from '@/lib/newsletter-popup';
import {
  REF_AMIGO, REF_MIN_COMPRA, REF_MODAL_SHOWN, REF_VIGENCIA_DIAS,
  formatRefMonto, getReferralCode, mirrorReferralCode,
} from '@/lib/referidos';

// El modal que ve el amigo al entrar por /r/<CODE>. Mismo lenguaje que el
// popup de newsletter (vidrio sobre el sitio desenfocado, pills, salida en
// texto). Valida el código contra el backend ANTES de mostrarse: un link roto
// o un programa pausado no muestran nada. Una vez por sesión.

const glassPill = {
  background: 'rgba(255,255,255,0.12)',
  border: '1px solid rgba(255,255,255,0.16)',
} as const;

export default function ReferralWelcomeModal() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [datos, setDatos] = useState<{ amigo: number; nombre?: string } | null>(null);

  useEffect(() => {
    if (isExcludedPage(pathname)) return;
    const code = getReferralCode();
    if (!code) return;
    try { if (sessionStorage.getItem(REF_MODAL_SHOWN)) return; } catch { /* sigue */ }
    mirrorReferralCode(code);

    let vivo = true;
    (async () => {
      try {
        const r = await fetch('/api/referral-claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const d = await r.json();
        if (vivo && d?.ok) {
          setDatos({ amigo: Number(d.amigo) || REF_AMIGO, nombre: d.nombre || undefined });
          try { sessionStorage.setItem(REF_MODAL_SHOWN, '1'); } catch { /* ok */ }
        }
      } catch { /* sin modal; la reserva queda igual */ }
    })();
    return () => { vivo = false; };
    // Solo al montar: el código no cambia dentro de la sesión.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!datos) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDatos(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [datos]);

  if (!datos) return null;

  const cerrar = () => setDatos(null);
  const verLoNuevo = () => { cerrar(); router.push('/new-in'); };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.30)', backdropFilter: 'blur(9px)', WebkitBackdropFilter: 'blur(9px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`De parte de tu amigo: ${formatRefMonto(datos.amigo)} para tu primera compra`}
    >
      <div
        className="relative w-full max-w-[380px] md:max-w-[460px] text-white text-center rounded-[28px] md:rounded-[34px] px-7 pt-9 pb-6 md:px-11 md:pt-11 md:pb-7 flex flex-col items-center gap-[14px] animate-in fade-in slide-in-from-bottom-4 duration-300"
        style={{
          background: 'rgba(255,255,255,0.13)',
          backdropFilter: 'blur(34px) saturate(160%)',
          WebkitBackdropFilter: 'blur(34px) saturate(160%)',
          border: '1px solid rgba(255,255,255,0.38)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 30px 90px rgba(0,0,0,0.4)',
        }}
      >
        <img src="/hero/hype-white.png" alt="Hype" className="h-[20px] md:h-[24px] w-auto" />

        <span className="text-[10px] uppercase tracking-[0.2em] text-white/85 rounded-full px-[14px] py-[7px] mt-1" style={glassPill}>
          {datos.nombre ? `De parte de ${datos.nombre}` : 'De parte de tu amigo'}
        </span>

        <ScrambleText numeric intervalMs={48} className="text-[56px] md:text-[64px] font-bold leading-none tracking-[-0.03em] tabular-nums">
          {formatRefMonto(datos.amigo)}
        </ScrambleText>
        <p className="text-[16px] md:text-[17px] font-medium tracking-[-0.015em] m-0">para tu primera compra en Hype</p>
        <p className="text-[13px] leading-[1.6] text-white/80 max-w-[300px] m-0">
          Es para tu primera compra: ponés tu mail en el checkout y el descuento se aplica solo. Sin códigos, sin registrarte.
        </p>

        <div className="flex flex-wrap justify-center gap-2">
          <span className="inline-flex items-center gap-[7px] text-[11.5px] md:text-[12px] px-[13px] py-[7px] rounded-full" style={glassPill}>
            <i className="w-[5px] h-[5px] rounded-full bg-white" aria-hidden />Tenés {REF_VIGENCIA_DIAS} días
          </span>
          <span className="inline-flex items-center gap-[7px] text-[11.5px] md:text-[12px] px-[13px] py-[7px] rounded-full" style={glassPill}>
            <i className="w-[5px] h-[5px] rounded-full bg-white" aria-hidden />Compras desde {formatRefMonto(REF_MIN_COMPRA)}
          </span>
        </div>

        <button
          type="button"
          onClick={verLoNuevo}
          className="w-full rounded-full bg-white text-[#0a0a0a] px-6 py-4 text-[13px] md:text-[14px] font-semibold mt-2 transition-transform active:scale-[0.97] motion-reduce:transition-none"
        >
          Ver lo nuevo
        </button>

        <p className="text-[10.5px] md:text-[11px] leading-[1.6] text-white/75 max-w-[320px] m-0">
          La invitación dura {REF_VIGENCIA_DIAS} días. Se suma al 10% por transferencia; no a otros descuentos ni promociones.
        </p>

        <button
          type="button"
          onClick={cerrar}
          className="text-[12px] text-white/75 underline underline-offset-[3px] transition-colors hover:text-white px-2 py-1"
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}
