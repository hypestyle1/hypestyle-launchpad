import { Archivo_Black } from 'next/font/google';
import './cyber.css';

/* Lockup CYBER HYPE.

   Identidad aprobada el 27/10: CYBER en Archivo Black + el wordmark oficial
   Hype. como imagen — jamás re-tipografiado — y distorsión por FRANJAS
   monocromas, la técnica del footer de rotten-future.com.

   Lo que cambió el 28/10 (pedido de Valentín): el glitch es **continuo** y
   toma el **lockup entero**. Antes corría una sola vez al montar y solo sobre
   la palabra CYBER, así que el logo quedaba quieto y el efecto se perdía en el
   primer segundo. Ahora el ciclo no para mientras la página esté abierta.

   Cómo está hecho: el lockup se dibuja tres veces. El de abajo es el real, está
   en el flujo, reserva el tamaño y no se toca nunca — por eso el logo se lee
   siempre y no hay salto de layout. Los otros dos son copias `absolute`,
   `aria-hidden`, con fondo opaco, que aparecen en franjas horizontales
   recortadas y corridas unos pocos `em`. Toda la animación vive en cyber.css:
   clip-path y transform, sin JS.

   Es un componente de servidor: no hay estado, ni efectos, ni hidratación.

   `animate={false}` lo deja quieto, para tamaños chicos donde el movimiento es
   ruido. `tone="dark"` invierte el wordmark a blanco para fondo oscuro.

   OJO: esto no es la intro de entrada de la campaña (CyberIntro, que se ve una
   vez por sesión y después se va). Son dos cosas distintas. */

const archivoBlack = Archivo_Black({ weight: '400', subsets: ['latin'] });

export default function CyberWordmark({
  className = '',
  animate = false,
  tone = 'dark',
}: {
  className?: string;
  animate?: boolean;
  /** 'dark' = fondo oscuro (wordmark blanco). 'light' = fondo claro. */
  tone?: 'dark' | 'light';
}) {
  // Una sola definición del lockup: las copias tienen que ser idénticas al
  // original o las franjas se ven desalineadas.
  const fila = (
    <span className="cyber-lockup__row">
      <span className={`${archivoBlack.className} uppercase tracking-[-0.01em] leading-none`}>
        CYBER
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element -- el SVG oficial se
          repite tres veces; el optimizador no aporta nada sobre 6 KB de vectores
          y next/image no deja replicar el mismo nodo sin pedir la imagen de más. */}
      <img
        src="/hype-wordmark.svg"
        alt=""
        className="cyber-lockup__mark h-[0.76em] w-auto self-center translate-y-[0.02em]"
      />
    </span>
  );

  return (
    <span
      role="img"
      aria-label="CYBER HYPE"
      className={[
        'cyber-lockup',
        animate ? 'cyber-lockup--animate' : '',
        tone === 'dark' ? 'cyber-lockup--dark' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {fila}
      {animate && (
        <>
          <span className="cyber-lockup__slice cyber-lockup__slice--a" aria-hidden="true">{fila}</span>
          <span className="cyber-lockup__slice cyber-lockup__slice--b" aria-hidden="true">{fila}</span>
        </>
      )}
    </span>
  );
}
