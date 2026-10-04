'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CountUp } from '@/components/ui/count-up';
import { BorderBeam } from '@/components/ui/border-beam';
import { COMMUNITY_COUNT } from '@/lib/close-friends-config';

/** Usuario de Instagram: letras, números, punto y guion bajo; hasta 30; sin
 *  punto al principio, al final ni dos seguidos. */
export function instagramValido(u: string): boolean {
  return /^(?!.*\.\.)(?!\.)(?!.*\.$)[a-z0-9._]{1,30}$/i.test(u);
}

/**
 * Invitación a Close Friends dentro del checkout. Es opcional y tiene que
 * sentirse como un beneficio por comprar, no como un paso más: compacta, gris
 * (se integra con las tarjetas del checkout) y el verde solo como acento: el
 * haz que recorre el borde, el punto, el contador y el foco del campo.
 *
 * Escribir el usuario no confirma nada: recién al tocar "Sumarme" se valida y
 * se muestra "Solicitud enviada". `onChange` recibe el usuario con @ (o '' si
 * lo cambia), que es lo que viaja en el pedido. `onBorrador` avisa lo que está
 * escrito aunque no haya tocado "Sumarme", para no perderlo si paga directo.
 */
export function CloseFriendsCard({
  value,
  onChange,
  onBorrador,
  en = false,
}: {
  value: string;
  onChange: (instagram: string) => void;
  onBorrador?: (usuario: string) => void;
  en?: boolean;
}) {
  const [borrador, setBorrador] = useState(value.replace(/^@+/, ''));
  const [enviado, setEnviado] = useState(!!value);
  const [error, setError] = useState<string | null>(null);

  const sumarme = () => {
    const u = borrador.trim().replace(/^@+/, '');
    if (!instagramValido(u)) {
      setError(en ? 'Check your username: letters, numbers, dots and _' : 'Revisá el usuario: solo letras, números, puntos y _');
      return;
    }
    setError(null);
    setEnviado(true);
    onChange(`@${u}`);
  };

  const cambiar = () => {
    setEnviado(false);
    onChange('');
  };

  return (
    <BorderBeam className="bg-black/[0.08]" innerClassName="bg-[#e2e2e2]" grosor={2} duracion={6}>
      <section className="px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/55">
            <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-600 shadow-[0_0_6px_rgba(22,163,74,0.7)]" />
            {en ? 'Close friends' : 'Mejores amigos'}
          </span>
          <span className="text-[11px] font-semibold text-green-700">
            <CountUp to={COMMUNITY_COUNT} suffix="+" />{' '}
            <span className="font-normal text-foreground/55">{en ? 'in the community' : 'en la comunidad'}</span>
          </span>
        </div>

        <h2 className="mt-2.5 text-[15px] font-bold leading-snug">
          {en ? 'Get into our Close Friends' : 'Entrá a nuestro Close Friends'}
        </h2>
        <p className="mt-0.5 text-[12px] leading-relaxed text-foreground/65">
          {en ? 'Early access to drops, perks and exclusive content.' : 'Acceso anticipado a drops, beneficios y contenido exclusivo.'}
        </p>
        <p className="mt-1 hidden text-[11px] text-foreground/50 sm:block">
          {en ? 'Drops before anyone · Exclusive perks · Vote on upcoming designs' : 'Drops antes que nadie · Beneficios exclusivos · Votá próximos diseños'}
        </p>

        {enviado ? (
          <div className="mt-3.5" role="status">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-green-700">
              {en ? 'Request sent' : 'Solicitud enviada'}
              <Check aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
            </p>
            <p className="mt-0.5 text-[12px] text-foreground/65">
              {en ? `We'll review ${value} after your purchase.` : `Vamos a revisar ${value} después de tu compra.`}
            </p>
            <button type="button" onClick={cambiar} className="mt-1.5 text-[11px] text-foreground/55 underline underline-offset-2 transition-colors hover:text-foreground">
              {en ? 'Change username' : 'Cambiar usuario'}
            </button>
          </div>
        ) : (
          <>
            <div className="mt-3.5 flex gap-2">
              <div className="relative min-w-0 flex-1">
                <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-foreground/45">@</span>
                <input
                  type="text"
                  id="instagram-checkout"
                  aria-label={en ? 'Your Instagram username' : 'Tu usuario de Instagram'}
                  aria-invalid={error ? true : undefined}
                  placeholder="tu.usuario"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={borrador}
                  onChange={e => {
                    const v = e.target.value.replace(/^@+/, '').trim();
                    setBorrador(v);
                    setError(null);
                    onBorrador?.(v);
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sumarme(); } }}
                  className={cn(
                    'h-11 w-full rounded-[8px] border border-black/10 bg-white pl-[27px] pr-3 text-[13px] text-foreground transition-colors placeholder:text-foreground/30 focus:border-green-600 focus:outline-none focus:shadow-[0_0_0_3px_rgba(22,163,74,0.12)]',
                    error && 'border-destructive focus:border-destructive focus:shadow-none',
                  )}
                />
              </div>
              <button
                type="button"
                onClick={sumarme}
                className="h-11 flex-shrink-0 rounded-[8px] bg-bg-dark px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-bg-dark/85"
              >
                {en ? 'Join' : 'Sumarme'}
              </button>
            </div>
            <p className={cn('mt-2 text-[11px]', error ? 'text-destructive' : 'text-foreground/50')}>
              {error ?? (en ? "Leave your Instagram and we'll review it after your purchase." : 'Dejanos tu Instagram y lo revisamos después de tu compra.')}
            </p>
          </>
        )}
      </section>
    </BorderBeam>
  );
}
