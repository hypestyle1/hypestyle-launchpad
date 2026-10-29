import Link from 'next/link';
import './cyber.css';

/* Announcement bar del takeover de CYBER HYPE — la misma geometría exacta que
   la píldora del sitio (AnnouncementBar.tsx: 28px, rounded-full, inset 16px)
   pero en vidrio OSCURO: la campaña se siente una evolución del sitio, no
   otro sitio. Mensaje estático y clickeable, un estado por momento del
   evento; nada de carrusel y nada de montos. Recuperada del preview del
   27/10 (rama identidad), monocroma: el punto EN VIVO es blanco, sin cian.

   Solo se monta durante el EVENTO (la decide el servidor en app/page.tsx);
   en previa y en post la announcement bar habitual de SS27 sigue intacta. */

export default function CyberAnnouncementBar({ ultimasHoras }: { ultimasHoras: boolean }) {
  const texto = ultimasHoras
    ? 'ÚLTIMAS HORAS · TERMINA HOY 23:59'
    : 'CYBER HYPE® · EN VIVO · 2–4 NOV';
  return (
    <Link
      href="/cyberhype"
      aria-label={texto}
      className="fixed top-2.5 left-4 right-4 z-50 flex h-[28px] items-center justify-center gap-2 group"
      style={{
        borderRadius: '999px',
        background: 'rgba(10, 10, 10, 0.72)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 2px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      <span className="cyber-live-dot h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
      <span className="overflow-hidden text-ellipsis whitespace-nowrap px-2 text-[10px] font-semibold tracking-[0.18em] text-white/90 transition-colors group-hover:text-white">
        {texto}
      </span>
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-white/50 transition-colors group-hover:text-white/90" aria-hidden="true">
        <path d="M6 3l5 5-5 5" />
      </svg>
    </Link>
  );
}
