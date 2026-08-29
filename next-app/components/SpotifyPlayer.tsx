'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';

// La playlist oficial de la tienda. Cambiarla = cambiar solo este ID.
const PLAYLIST_ID = '7DOlr3syXZhNlzxV9SuuKl';

export default function SpotifyPlayer() {
  const { t } = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // El iframe recién se monta la primera vez que la persona abre el player:
  // así la home no carga nada de Spotify de arranque. Y una vez montado no se
  // desmonta más — desmontarlo cortaría la música al cerrar el panel.
  const [loaded, setLoaded] = useState(false);

  // Sin player en checkout/admin, y tampoco en el canal mayorista: es otro
  // contexto de compra y la experiencia "musica de local" es del minorista.
  if (
    pathname?.startsWith('/checkout') ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/mayoristas')
  ) return null;

  function toggle() {
    if (!loaded) setLoaded(true);
    setOpen((v) => !v);
  }

  return (
    <div className="fixed bottom-6 left-5 z-[90]">
      {/* Panel — oculto con CSS (no desmontado) para que siga sonando cerrado */}
      {loaded && (
        <div
          className={`absolute bottom-[68px] left-0 w-[min(calc(100vw-2.5rem),340px)] transition-all duration-300 ${
            open
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
          aria-hidden={!open}
        >
          <div
            className="rounded-[14px] overflow-hidden"
            style={{
              background: 'rgba(26, 26, 26, 0.96)',
              backdropFilter: 'blur(32px) saturate(200%)',
              WebkitBackdropFilter: 'blur(32px) saturate(200%)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
            }}
          >
            <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white">
                {t('Sonando en Hype')}
              </p>
              <button
                onClick={() => setOpen(false)}
                className="text-white/30 hover:text-white/70 transition-colors flex-shrink-0"
                aria-label={t('Cerrar')}
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
            <div className="px-2 pb-2">
              <iframe
                title={t('Sonando en Hype')}
                src={`https://open.spotify.com/embed/playlist/${PLAYLIST_ID}?utm_source=generator&theme=0`}
                width="100%"
                height="352"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="rounded-[12px] block"
              />
            </div>
          </div>
        </div>
      )}

      {/* Botón flotante — ecualizador animado, espejo del botón de WhatsApp */}
      <button
        onClick={toggle}
        aria-label={t('Sonando en Hype')}
        aria-expanded={open}
        className="w-[52px] h-[52px] rounded-full flex items-center justify-center gap-[3px] shadow-xl hover:scale-110 active:scale-95 transition-transform duration-200 bg-black border border-white/10"
      >
        <span className="hs-eq-bar" style={{ animationDelay: '0ms' }} />
        <span className="hs-eq-bar" style={{ animationDelay: '180ms' }} />
        <span className="hs-eq-bar" style={{ animationDelay: '360ms' }} />
        <span className="hs-eq-bar" style={{ animationDelay: '540ms' }} />
      </button>
    </div>
  );
}
