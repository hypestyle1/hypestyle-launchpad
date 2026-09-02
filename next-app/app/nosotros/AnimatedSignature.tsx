'use client';

import { useEffect, useState } from 'react';
import styles from './nosotros.module.css';
import type { SignaturePath } from './signatures';

type Props = {
  signature: SignaturePath;
  /** Texto accesible, ej. "Firma de Valentín Pozzi". */
  label: string;
  /** Demora antes de empezar a trazar, en segundos. */
  delay?: number;
  /** Cuando pasa a true, arranca el trazo. */
  visible: boolean;
  /** Cambiar el valor vuelve a dibujar la firma desde cero. */
  run?: number;
};

/**
 * Firma que se dibuja sola al entrar en pantalla (stroke-dashoffset sobre un
 * path normalizado con pathLength="1"). La visibilidad la decide el padre, así
 * las dos firmas de la carta arrancan con un único observer y se encadenan
 * con `delay`.
 */
export default function AnimatedSignature({ signature, label, delay = 0, visible, run = 0 }: Props) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!visible) return;
    // Reset y re-arranque en el frame siguiente para que la transición se
    // dispare también cuando se pide "volver a firmar".
    setOn(false);
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setOn(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [visible, run]);

  return (
    <span
      className={`${styles.sig} ${on ? styles.on : ''}`}
      style={{ ['--sig-delay' as string]: `${delay}s` }}
    >
      <svg viewBox={signature.viewBox} role="img" aria-label={label}>
        <path pathLength={1} d={signature.d} />
      </svg>
    </span>
  );
}
