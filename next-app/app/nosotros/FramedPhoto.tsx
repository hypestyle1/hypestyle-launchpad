'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import styles from './nosotros.module.css';

type Props = {
  src: string;
  alt: string;
  caption: string;
  tag?: string;
};

/**
 * Foto dentro de un marco con paspartú. Respeta el 3:2 original (así en
 * desktop entra completa), se "revela" con un zoom lento y un brillo al
 * entrar en pantalla, y en dispositivos con mouse se inclina levemente
 * siguiendo el cursor.
 */
export default function FramedPhoto({ src, alt, caption, tag }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const [tilt, setTilt] = useState<string | null>(null);
  const canHover = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    canHover.current =
      window.matchMedia('(hover: hover)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onMove = (e: MouseEvent<HTMLElement>) => {
    if (!canHover.current || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setTilt(`rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg)`);
  };

  return (
    <div className={styles.frameWrap}>
      <figure
        ref={ref}
        className={`${styles.frame} ${inView ? styles.frameIn : ''} m-0`}
        style={
          tilt
            ? { transform: tilt, transition: 'transform .15s ease-out' }
            : undefined
        }
        onMouseMove={onMove}
        onMouseLeave={() => setTilt(null)}
      >
        <div className={styles.print}>
          <img src={src} alt={alt} width={1920} height={1280} loading="lazy" decoding="async" />
        </div>
        <figcaption className="flex items-baseline justify-between gap-4 py-4 text-[12px] tracking-[0.04em] text-muted-foreground">
          <span>{caption}</span>
          {tag && (
            <span className="tabular-nums tracking-[0.12em] text-text-light">{tag}</span>
          )}
        </figcaption>
      </figure>
    </div>
  );
}
