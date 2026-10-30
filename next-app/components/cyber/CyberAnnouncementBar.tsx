'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale } from '@/context/LocaleContext';
import './cyber.css';

/* Announcement bar del takeover — la barra giratoria, en versión Cyber.

   Misma geometría exacta que la del sitio (28 px, rounded-full, inset 16 px,
   vidrio oscuro) para que conviva con el navbar sin tocar `--announce-h`: la
   altura es fija, así que rotar mensajes no mueve nada de la página.

   ── Los mensajes están VERIFICADOS, uno por uno ─────────────────────────────
   Ninguno se escribió de memoria:
   - **Envío gratis desde $180.000**: es el umbral vigente del sitio, leído de
     `components/AnnouncementBar`. NO es el $120.000 que aparece en las
     propuestas del evento — eso es una recomendación sin aprobar. Y se
     muestra solo en Argentina, igual que en la barra original: a quien entra
     desde afuera no se le promete un envío que no aplica.
   - **Regalo desde $100.000**: verificado contra `POST /api/gift-progress`
     del sitio publicado (`active: true`, primer nivel $100.000).
   - **3 cuotas sin interés** y **envíos a todo el país**: vigentes, salen de
     la misma barra del sitio.
   - **Descuento por transferencia**: vigente, sin monto — el porcentaje no se
     publica.
   Lo que NO está acá: ningún porcentaje de descuento del evento (no hay nada
   aprobado) y ninguna promesa sobre los drops.

   ── Desktop vs mobile ───────────────────────────────────────────────────────
   Desktop: marquee continuo, el mismo `animate-marquee-fast` del sitio.
   Mobile: un mensaje por vez, centrado, con un fundido cada 4,5 s — un
   marquee en 390 px corta las frases o va demasiado rápido para leerlas.

   Con `prefers-reduced-motion` no hay marquee ni rotación: queda fijo el
   primer mensaje, que es el del evento. */

type Mensaje = { texto: string; href: string };

const EVENTO: Mensaje = { texto: 'CYBER HYPE® · 2, 3 Y 4 DE NOVIEMBRE', href: '/cyberhype' };

/** Solo Argentina: afuera no aplica y prometerlo sería mentir. */
const ENVIO_GRATIS: Mensaje = {
  texto: 'Envío gratis a sucursal desde $180.000',
  href: '/faqs',
};

const RESTO: Mensaje[] = [
  { texto: 'Regalo por compra desde $100.000', href: '/#regalos' },
  { texto: 'Hasta 3 cuotas sin interés', href: '/faqs' },
  { texto: 'Descuento por transferencia', href: '/faqs' },
  { texto: 'Envíos a todo el país', href: '/faqs' },
];

const ROTACION_MS = 4500;

export default function CyberAnnouncementBar({ ultimasHoras }: { ultimasHoras: boolean }) {
  const { country } = useLocale();
  const desdeAfuera = country !== null && country !== 'AR';

  const evento: Mensaje = ultimasHoras
    ? { texto: 'ÚLTIMAS HORAS · TERMINA HOY 23:59', href: '/cyberhype' }
    : EVENTO;
  const mensajes = [evento, ...(desdeAfuera ? [] : [ENVIO_GRATIS]), ...RESTO];

  const [i, setI] = useState(0);
  const [quieto, setQuieto] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setQuieto(true);
      return;
    }
    const id = setInterval(() => setI((n) => (n + 1) % mensajes.length), ROTACION_MS);
    return () => clearInterval(id);
  }, [mensajes.length]);

  const repetidos = [...mensajes, ...mensajes, ...mensajes, ...mensajes];

  return (
    <div
      className="fixed left-4 right-4 top-2.5 z-50 flex h-[28px] items-center overflow-hidden"
      style={{
        borderRadius: '999px',
        background: 'rgba(10, 10, 10, 0.78)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 2px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      {/* ── Mobile: uno por vez ─────────────────────────────────────────── */}
      <div className="relative flex h-full w-full items-center justify-center px-8 md:hidden">
        {(quieto ? [mensajes[0]] : mensajes).map((m, n) => (
          <Link
            key={m.texto}
            href={m.href}
            aria-hidden={!quieto && n !== i}
            tabIndex={!quieto && n !== i ? -1 : 0}
            className={`absolute inset-0 flex items-center justify-center gap-2 px-6 transition-opacity duration-500 ${
              quieto || n === i ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            {n === 0 && (
              <span className="cyber-live-dot h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
            )}
            <span className="truncate text-[10px] font-semibold tracking-[0.14em] text-white/90">
              {m.texto}
            </span>
          </Link>
        ))}
      </div>

      {/* ── Desktop: marquee continuo ───────────────────────────────────── */}
      <div
        className={`hidden whitespace-nowrap md:flex ${quieto ? '' : 'animate-marquee-fast'}`}
      >
        {repetidos.map((m, n) => (
          <span key={n} className="mx-5 flex items-center gap-5">
            <Link
              href={m.href}
              className="text-[10px] font-normal tracking-[0.12em] text-white/80 transition-colors hover:text-white"
            >
              {m.texto}
            </Link>
            <span
              className="inline-block h-1 w-1 shrink-0 rounded-full"
              style={{ background: 'rgba(255,255,255,0.25)' }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
