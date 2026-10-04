'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import UnlockForm from './UnlockForm';
import AccessGranted from './AccessGranted';
import './private-access.css';

interface Props {
  active: boolean;
  collectionName: string;
  collectionSubtitle: string;
  discountPct: number;
  saleEndsLabel: string;
  publicOpenLabel: string;
  /** Ficha privada a la que volver después de desbloquear (ya validada en el servidor). */
  returnTo?: string | null;
}

const BG = '/lookbook-fw26/book/6210.webp';

/**
 * /private-access sin sesión: la misma card del modal, a pantalla completa.
 * Es la página a la que apunta el link de la story de Mejores Amigos. Si la
 * preventa no está activa, explica y manda al home.
 */
export default function PrivateGate({ active, collectionName, collectionSubtitle, discountPct, saleEndsLabel, publicOpenLabel, returnTo }: Props) {
  const router = useRouter();
  const [granted, setGranted] = useState<{ name: string | null } | null>(null);
  // Con returnTo vuelve al producto que la persona quería ver; si no, la
  // colección (refresh: el servidor ya ve la cookie y renderiza el catálogo).
  const refresh = useCallback(() => { if (returnTo) router.replace(returnTo); else router.refresh(); }, [router, returnTo]);

  if (granted) {
    return <AccessGranted name={granted.name} collectionName={collectionName} onDone={refresh} />;
  }

  return (
    <div className="relative min-h-[100dvh] bg-[#0a0a0a] text-white overflow-hidden">
      <Image src={BG} alt="" fill priority sizes="100vw" className="object-cover object-[50%_40%] scale-[1.06] blur-[4px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-black/75" aria-hidden />

      <header className="relative z-10 flex items-center justify-between px-5 md:px-10 pt-[max(20px,env(safe-area-inset-top))] pb-4">
        <Link href="/" aria-label="Hypestyle">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-[20px] md:h-[24px] w-auto brightness-0 invert opacity-90" />
        </Link>
        <div className="flex items-center gap-2.5">
          <span className="pa-dot" aria-hidden />
          <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/55">Private Access</span>
        </div>
      </header>

      <main className="relative z-10 flex items-center justify-center px-4 pb-[max(28px,env(safe-area-inset-bottom))] pt-4 md:pt-8 min-h-[calc(100dvh-80px)]">
        <div className="pa-glass-dark relative w-full max-w-[460px] rounded-[28px] px-6 py-8 md:p-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50 mb-4">
            {collectionName} · {collectionSubtitle}
          </p>

          {active ? (
            <>
              <h1 className="text-[26px] md:text-[28px] font-semibold tracking-[-0.02em] leading-[1.1] mb-2">
                Acceso exclusivo para Mejores Amigos
              </h1>
              <p className="text-[14px] leading-relaxed text-white/60 mb-7">
                Ingresá tu usuario de Instagram para desbloquear {collectionName}.{' '}
                <span className="text-white/80">{discountPct}% OFF hasta el {saleEndsLabel}.</span>
              </p>
              <UnlockForm autoFocus onGranted={(name) => setGranted({ name })} />
            </>
          ) : (
            <>
              <h1 className="text-[26px] md:text-[28px] font-semibold tracking-[-0.02em] leading-[1.1] mb-2">
                La preventa privada no está abierta
              </h1>
              <p className="text-[14px] leading-relaxed text-white/60 mb-7">
                {collectionName} sale para todo el público el {publicOpenLabel}.
              </p>
              <Link href="/" className="inline-flex h-[52px] items-center justify-center w-full rounded-[14px] bg-white text-[#0a0a0a] text-[12px] font-bold uppercase tracking-[0.24em]">
                Ir a la tienda
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
