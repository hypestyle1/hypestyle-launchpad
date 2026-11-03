'use client';

import { useEffect, useRef, useState } from 'react';
import { DynamicButton } from '@/components/ui/dynamic-button';
import { ScrambleText } from '@/components/ui/scramble-text';
import { cn } from '@/lib/utils';
import {
  REF_HOLD_DIAS, REF_MIN_COMPRA, REF_VIGENCIA_DIAS,
  formatRefMonto, refWhatsAppUrl,
} from '@/lib/referidos';

// El widget de la página de confirmación: el link personal para regalar
// $8.000 y ganarse $12.000. Vidrio cálido (misma receta que la barra del
// newsletter), pills rounded-full, WhatsApp como canal principal.

type LinkData = { activo: boolean; code: string; url: string; amigo: number; premio: number };

export function ReferralShareCard({ orderId, orderKey, className }: {
  orderId: number;
  orderKey: string;
  className?: string;
}) {
  const [data, setData] = useState<LinkData | null>(null);
  const [copiado, setCopiado] = useState(false);
  const copiadoTimer = useRef(0);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await fetch(`/api/referral-link?order=${orderId}&key=${encodeURIComponent(orderKey)}`);
        const d = await r.json();
        if (vivo && r.ok && d?.activo && d?.code) setData(d);
      } catch { /* sin widget: la confirmación sigue intacta */ }
    })();
    return () => { vivo = false; window.clearTimeout(copiadoTimer.current); };
  }, [orderId, orderKey]);

  if (!data) return null;

  const linkCorto = data.url.replace(/^https?:\/\//, '');
  const copiar = async () => {
    try { await navigator.clipboard.writeText(data.url); } catch { return; }
    setCopiado(true);
    window.clearTimeout(copiadoTimer.current);
    copiadoTimer.current = window.setTimeout(() => setCopiado(false), 1800);
  };

  return (
    <div className={cn('relative w-full max-w-[374px] md:max-w-[880px] p-2 md:p-[10px] animate-in fade-in slide-in-from-bottom-4 duration-500', className)}>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'radial-gradient(420px 260px at 14% 0%, rgba(206,196,178,0.55), transparent 62%), radial-gradient(420px 260px at 92% 100%, rgba(0,0,0,0.07), transparent 60%)' }}
      />
      <div
        className="relative rounded-[22px] md:rounded-[28px] md:flex overflow-hidden text-left"
        style={{
          background: 'rgba(245,243,237,0.78)',
          backdropFilter: 'blur(32px) saturate(180%)',
          WebkitBackdropFilter: 'blur(32px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.75)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 18px 60px rgba(0,0,0,0.14)',
        }}
      >
        <div className="flex-[1.1] px-5 pt-7 pb-1 md:px-11 md:py-11 flex flex-col justify-center gap-[14px]">
          <span className="self-start text-[10px] uppercase tracking-[0.18em] text-[#6b6355] rounded-full px-3 py-[6px]" style={{ background: 'rgba(10,10,10,0.05)', border: '1px solid rgba(10,10,10,0.07)' }}>
            Hype Rewards
          </span>
          <h2 className="m-0 text-[24px] md:text-[30px] font-semibold leading-[1.2] tracking-[-0.025em]">Gracias por confiar en Hype.</h2>
          <p className="m-0 text-[13px] md:text-[14px] leading-[1.65] text-[#595347] md:max-w-[400px]">
            Ahora queremos que tus amigos también vivan la experiencia. Regalale{' '}
            <strong className="font-semibold text-foreground">{formatRefMonto(data.amigo)}</strong> a esa persona que sabés
            que le va a gustar Hype. Cuando haga su primera compra, vos te llevás{' '}
            <strong className="font-semibold text-foreground">{formatRefMonto(data.premio)}</strong> para la próxima.
          </p>
          <div className="flex gap-2 md:gap-[10px] md:max-w-[400px]">
            {([['Para tu amigo/a', data.amigo], ['Para vos', data.premio]] as const).map(([label, monto]) => (
              <div key={label} className="flex-1 rounded-[16px] px-4 py-3 flex flex-col gap-[2px]" style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.8)' }}>
                <span className="text-[10px] uppercase tracking-[0.14em] text-[#8a8375]">{label}</span>
                <ScrambleText numeric intervalMs={40} className="text-[20px] md:text-[22px] font-bold tracking-[-0.02em] tabular-nums">
                  {formatRefMonto(monto)}
                </ScrambleText>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 px-5 pt-4 pb-6 md:px-11 md:py-11 flex flex-col justify-center gap-[15px] md:border-l" style={{ borderColor: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.22)' }}>
          <p className="m-0 hidden md:block text-[11px] uppercase tracking-[0.15em] text-[#6b6355]">Tu link personal</p>
          <div className="flex items-center gap-2 rounded-full p-[6px] pl-[18px]" style={{ background: 'rgba(255,255,255,0.62)', border: '1px solid rgba(255,255,255,0.85)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)' }}>
            <span className="flex-1 min-w-0 truncate font-mono text-[12px] md:text-[13px] text-foreground">{linkCorto}</span>
            <DynamicButton
              onClick={copiar}
              className="rounded-full bg-[#0a0a0a] text-white px-4 py-[10px] text-[10px] font-bold uppercase tracking-[0.1em]"
            >
              {copiado ? 'Copiado' : 'Copiar'}
            </DynamicButton>
          </div>
          <a
            href={refWhatsAppUrl(data.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-[10px] rounded-full bg-[#0a0a0a] text-white px-5 py-4 text-[12px] font-bold uppercase tracking-[0.08em] transition-colors hover:bg-[#262626] active:scale-[0.97] motion-reduce:transition-none"
          >
            <svg role="img" aria-label="WhatsApp" viewBox="0 0 24 24" className="w-4 h-4 fill-white shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.074-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Regalale {formatRefMonto(data.amigo)} por WhatsApp
          </a>
          <p className="m-0 text-[10.5px] md:text-[11px] leading-[1.6] text-[#8a8375]">
            El crédito de tu amigo se descuenta directo en su primera compra. El tuyo se acredita {REF_HOLD_DIAS} días
            después de esa compra y dura {REF_VIGENCIA_DIAS} días. Compra mínima {formatRefMonto(REF_MIN_COMPRA)}. No
            acumulable con otros descuentos.
          </p>
        </div>
      </div>
    </div>
  );
}
