import Image from 'next/image';
import { Archivo_Black } from 'next/font/google';
import CyberLettering from './CyberLettering';
import './cyber.css';

/* Lockup CYBER HYPE — decisión 27/10: CYBER en Archivo Black y reveal de
   FRANJAS monocromas (efecto C, técnica verificada del footer de Rotten
   Future adaptada a un reveal finito). El wordmark oficial Hype. va siempre
   como imagen — jamás re-tipografiado — y nunca se anima: el glitch vive
   solo en CYBER.

   `animate` reproduce el reveal una vez al montar (hero); sin `animate`
   queda estático (navbar, tamaños chicos, donde el movimiento es ruido).
   Escala con el font-size del contenedor. */

const archivoBlack = Archivo_Black({ weight: '400', subsets: ['latin'] });

export default function CyberWordmark({
  className = '',
  priority = false,
  animate = false,
}: {
  className?: string;
  priority?: boolean;
  animate?: boolean;
}) {
  return (
    <span className={`inline-flex items-baseline gap-[0.24em] whitespace-nowrap ${className}`}>
      <span
        className={`${archivoBlack.className} uppercase tracking-[-0.01em] text-white leading-none`}
        aria-label="Cyber"
      >
        {animate ? (
          <CyberLettering text="CYBER" effect="slices" play={1} durationMs={1100} />
        ) : (
          <span className="inline-block">CYBER</span>
        )}
      </span>
      <Image
        src="/hero/hype-white.png"
        alt="Hype."
        width={200}
        height={88}
        priority={priority}
        className="h-[0.78em] w-auto self-center translate-y-[0.02em]"
      />
    </span>
  );
}
