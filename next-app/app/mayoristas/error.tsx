'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { WHATSAPP_URL } from '@/lib/mayorista-copy';

// Cuando el catálogo, la ficha o el carrito no se pudieron armar (WordPress
// caído o lento). Antes caía la pantalla genérica de Next. `reset` vuelve a
// renderizar la ruta: con WordPress de vuelta, alcanza.
export default function MayoristasError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[mayoristas]', error); }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-5 py-16">
      <div className="max-w-md text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Hype Mayoristas</p>
        <h1 className="text-2xl font-bold tracking-tight mt-2">No pudimos cargar el catálogo</h1>
        <p className="text-[13px] text-muted-foreground mt-3">
          Es un problema momentáneo de nuestro lado, no de tu cuenta ni de tu pedido. Lo que tenías en el pedido sigue guardado en este navegador.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <button onClick={reset} className="px-5 py-3 rounded-full bg-bg-dark text-primary-foreground text-[12px] font-semibold uppercase tracking-wide hover:bg-bg-dark/85 transition-colors">
            Reintentar
          </button>
          <Link href="/mayoristas/carrito" className="px-5 py-3 rounded-full border border-border text-[12px] font-semibold uppercase tracking-wide hover:border-foreground transition-colors">
            Ver mi pedido
          </Link>
        </div>
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-block mt-5 text-[11px] uppercase tracking-wide underline text-muted-foreground hover:text-foreground">
          Si sigue así, escribinos por WhatsApp
        </a>
        {error.digest && <p className="mt-4 text-[10px] text-muted-foreground/60">Ref. {error.digest}</p>}
      </div>
    </div>
  );
}
