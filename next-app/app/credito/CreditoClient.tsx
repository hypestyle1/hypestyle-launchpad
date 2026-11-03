'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { GiftCard } from '@/components/GiftCard';
import { ScrambleText } from '@/components/ui/scramble-text';
import { CreditTimeline, type TimelineItem } from '@/components/referidos/CreditTimeline';
import { REF_HOLD_DIAS, REF_MIN_COMPRA, REF_PREMIO, REF_VIGENCIA_DIAS, formatRefMonto, refWhatsAppUrl, setPendingCredit } from '@/lib/referidos';

// /credito?t=<token>: el estado del crédito de referidos, sin cuenta. El token
// HMAC viaja solo en los mails del destinatario; el backend lo verifica.
//
// Estados: pendiente (timeline con los días de seguridad), disponible (la
// GiftCard real con el código), usado y vencido.

type Status = {
  estado: 'pendiente' | 'disponible' | 'usado' | 'vencido' | 'revocado';
  tipo?: 'premio' | 'amigo';
  monto?: number; saldo?: number; coupon?: string;
  compra?: string; se_acredita?: string; vence?: string;
  /** El link propio del referidor, para volver a compartir. */
  ref_url?: string;
};

// CTA secundario "Compartir de nuevo": pill con borde, WhatsApp adelante.
function CompartirDeNuevo({ url }: { url: string }) {
  return (
    <a
      href={refWhatsAppUrl(url)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-[10px] rounded-full border border-foreground text-foreground px-5 py-[14px] text-[12px] font-bold uppercase tracking-[0.08em] transition-colors hover:bg-foreground hover:text-background active:scale-[0.97] motion-reduce:transition-none group"
    >
      <svg role="img" aria-label="WhatsApp" viewBox="0 0 24 24" className="w-[15px] h-[15px] fill-current shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.074-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      Compartir de nuevo
    </a>
  );
}

const fechaCorta = (iso?: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return y && m && d ? `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}` : '';
};

export default function CreditoClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get('t') || '';
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState(false);
  const [dorso, setDorso] = useState(false);

  useEffect(() => {
    if (!token) { setError(true); return; }
    let vivo = true;
    (async () => {
      try {
        const r = await fetch(`/api/credit-status?t=${encodeURIComponent(token)}`);
        const d = await r.json();
        if (!vivo) return;
        if (r.ok && d?.estado) setStatus(d);
        else setError(true);
      } catch { if (vivo) setError(true); }
    })();
    return () => { vivo = false; };
  }, [token]);

  const monto = status?.saldo || status?.monto || 0;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="border-b border-border py-5 px-4 text-center">
        <a href="/"><img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto object-contain mx-auto" /></a>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 py-10 md:py-14">
        {error && (
          <div className="max-w-[420px] w-full text-center">
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-2">Tu crédito Hype</p>
            <h1 className="text-[24px] font-bold leading-tight mb-3">Este link ya no funciona</h1>
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              Abrí el último mail que te mandamos y entrá desde ahí. Ante cualquier duda escribinos por{' '}
              <a href="https://wa.me/5491178292430?text=Hola%20Hype!" className="underline" target="_blank" rel="noopener noreferrer">WhatsApp</a>.
            </p>
          </div>
        )}

        {!error && !status && <p className="text-[13px] text-muted-foreground">Cargando…</p>}

        {status?.estado === 'pendiente' && (
          <div className="max-w-[420px] w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-2">Tu crédito Hype</p>
              <h1 className="text-[24px] md:text-[28px] font-bold leading-tight tracking-[-0.02em]">Tu amigo ya es de Hype</h1>
            </div>

            <div className="relative w-full mt-7 p-2">
              <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(340px 220px at 20% 0%, rgba(206,196,178,0.5), transparent 65%)' }} />
              <div
                className="relative rounded-[22px] text-center px-6 py-8"
                style={{
                  background: 'rgba(245,243,237,0.78)',
                  backdropFilter: 'blur(32px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(32px) saturate(180%)',
                  border: '1px solid rgba(255,255,255,0.75)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 18px 60px rgba(0,0,0,0.12)',
                }}
              >
                <ScrambleText numeric intervalMs={44} className="text-[48px] font-bold leading-none tracking-[-0.03em] tabular-nums text-[#aaa49a]">
                  {formatRefMonto(status.monto || 0)}
                </ScrambleText>
                {status.se_acredita && (
                  <span className="inline-block mt-[14px] text-[10px] font-bold uppercase tracking-[0.14em] rounded-full px-[14px] py-[7px]" style={{ color: '#8a5a00', background: '#faf0d8', border: '1px solid #f0e2bd' }}>
                    Se acredita el {fechaCorta(status.se_acredita)}
                  </span>
                )}
              </div>
            </div>

            <div className="w-full max-w-[348px] mt-8">
              <CreditTimeline items={timelinePendiente(status)} />
            </div>

            <div className="mt-8 border-t border-dashed border-black/25 pt-5 w-full max-w-[348px] text-center">
              <p className="mb-[14px] text-[13px] text-muted-foreground">
                Tu link sigue activo. ¿Otra persona que le pueda gustar Hype?
              </p>
              {status.ref_url && <CompartirDeNuevo url={status.ref_url} />}
            </div>
          </div>
        )}

        {status?.estado === 'disponible' && (
          <div className="max-w-[420px] w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-2">Tu crédito Hype</p>
              <h1 className="text-[24px] md:text-[28px] font-bold leading-tight tracking-[-0.02em]">
                {status.tipo === 'amigo' ? `Tus ${formatRefMonto(monto)} te esperan` : `Tus ${formatRefMonto(monto)} están acá`}
              </h1>
              <p className="mt-3 text-[14px] text-muted-foreground leading-relaxed">
                {status.tipo === 'amigo'
                  ? 'Tu crédito de bienvenida está atado a tu mail y se descuenta solo en el checkout.'
                  : 'Gracias por traer a tu amigo. El crédito está atado a tu mail y se descuenta solo en el checkout.'}
              </p>
            </div>

            <div className="w-full max-w-[340px] mt-7">
              <GiftCard
                monto={monto}
                codigo={status.coupon}
                dorso={dorso}
                onClick={() => setDorso(d => !d)}
                className="cursor-pointer"
              />
              <p className="mt-3 text-center text-[11px] text-muted-foreground">Tocá la tarjeta para ver el código</p>
            </div>

            <div className="flex justify-center gap-2 mt-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] rounded-full px-[14px] py-[7px]" style={{ color: '#2a6e46', background: '#e3f0e8', border: '1px solid #cde4d6' }}>Disponible</span>
              {status.vence && (
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] rounded-full px-[14px] py-[7px] text-muted-foreground bg-[#f2f2f2] border border-[#e8e8e8]">
                  Vence el {fechaCorta(status.vence)}
                </span>
              )}
            </div>

            <a
              href="/"
              onClick={() => { if (status.coupon) setPendingCredit(status.coupon, monto, status.vence); }}
              className="mt-6 w-full max-w-[340px] text-center rounded-full bg-[#0a0a0a] text-white px-5 py-4 text-[12px] font-bold uppercase tracking-[0.08em] transition-colors hover:bg-[#262626] active:scale-[0.97] motion-reduce:transition-none"
            >
              Usar mis {formatRefMonto(monto)}
            </a>
            <p className="mt-3 text-center text-[10.5px] leading-[1.6] text-muted-foreground max-w-[340px]">
              Compra mínima {formatRefMonto(REF_MIN_COMPRA)}. No acumulable con otros descuentos ni promociones.
              Tenés {REF_VIGENCIA_DIAS} días desde la acreditación.
            </p>

            {status.tipo === 'premio' && (
              <div className="mt-7 border-t border-dashed border-black/25 pt-5 w-full max-w-[340px] text-center">
                <p className="mb-[14px] text-[12px] leading-[1.6] text-muted-foreground">
                  Cada amigo nuevo suma otros {formatRefMonto(REF_PREMIO)} con su propio vencimiento.
                </p>
                {status.ref_url && <CompartirDeNuevo url={status.ref_url} />}
              </div>
            )}
          </div>
        )}

        {(status?.estado === 'usado' || status?.estado === 'vencido' || status?.estado === 'revocado') && (
          <div className="max-w-[420px] w-full text-center">
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-2">Tu crédito Hype</p>
            <h1 className="text-[24px] font-bold leading-tight mb-3">
              {status.estado === 'usado' ? 'Este crédito ya se usó' : status.estado === 'vencido' ? 'Este crédito venció' : 'Este crédito se canceló'}
            </h1>
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              {status.estado === 'usado'
                ? 'Que lo disfrutes. Cada amigo nuevo que traigas suma un crédito más, con su propio vencimiento.'
                : 'Ante cualquier duda escribinos por WhatsApp y lo vemos juntos.'}
            </p>
            <a href="/" className="inline-block mt-6 text-[12px] underline text-muted-foreground hover:text-foreground transition-colors">Volver al home</a>
          </div>
        )}
      </div>
    </div>
  );
}

function timelinePendiente(s: Status): TimelineItem[] {
  return [
    {
      titulo: 'Compra confirmada',
      detalle: `Tu amigo compró con tu link${s.compra ? ` el ${fechaCorta(s.compra)}` : ''}.`,
      estado: 'hecho',
    },
    {
      titulo: 'Días de seguridad',
      detalle: `Esperamos ${REF_HOLD_DIAS} días por cambios o devoluciones.`,
      estado: 'activo',
    },
    {
      titulo: `Tus ${formatRefMonto(s.monto || 0)}`,
      detalle: `${s.se_acredita ? `El ${fechaCorta(s.se_acredita)} quedan` : 'Quedan'} disponibles y te avisamos por mail. Desde ahí, ${REF_VIGENCIA_DIAS} días para usarlos.`,
      estado: 'pendiente',
    },
  ];
}
