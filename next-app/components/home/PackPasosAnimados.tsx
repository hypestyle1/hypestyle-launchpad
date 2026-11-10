'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import type { NormalizedProduct } from '@/hooks/useProducts';

/**
 * Los tres pasos del pack x3, animados — "las dos en una" (9/11, Valentín):
 * los pasos de siempre + el carrito que se arma, en un solo panel.
 *
 *   01 Elegí 3 Regular Tees   → entran las tres remeras (fotos del catálogo)
 *   02 Tu talle en cada una   → aparecen los talles M · L · S
 *   03 Pagás $66.300 las 3    → $86.700 se tacha y queda el precio del pack
 *
 * El resaltado blanco (la "card" de vidrio) viaja de un paso al siguiente
 * (layoutId). Cuando termina, queda todo a la vista unos segundos y vuelve a
 * empezar. Solo anima en pantalla; con prefers-reduced-motion queda el estado
 * final, quieto. Precios y fotos llegan por props (salen del catálogo).
 */

const TALLES = ['M', 'L', 'S'];
const PASO_MS = 1700;
const PAUSA_MS = 3200;
const ars = (n: number) => '$ ' + n.toLocaleString('es-AR');

const pop = {
  initial: { opacity: 0, scale: 0.6, y: 6 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } },
};
const spring = { type: 'spring' as const, stiffness: 380, damping: 26 };

export default function PackPasosAnimados({
  ejemplo,
  precioPack,
  unidades,
  totalColores,
}: {
  ejemplo: NormalizedProduct[];
  precioPack: number | null;
  unidades: number;
  totalColores: number;
}) {
  const reducir = useReducedMotion();
  const ref = useRef<HTMLOListElement>(null);
  const enVista = useInView(ref, { margin: '-20% 0px' });
  // -1 = vacío (respiro antes de arrancar); 0..2 = paso activo; 3 = completo.
  const [paso, setPaso] = useState(0);

  useEffect(() => {
    if (reducir || !enVista) return;
    const espera = paso >= 3 ? PAUSA_MS : paso < 0 ? 450 : PASO_MS;
    const t = setTimeout(() => setPaso((p) => (p >= 3 ? -1 : p + 1)), espera);
    return () => clearTimeout(t);
  }, [paso, enVista, reducir]);

  const estado = reducir ? 3 : paso;
  const activo = Math.max(0, Math.min(estado, 2));
  const visto = (i: number) => estado >= i; // el paso i ya mostró su contenido

  const suma = ejemplo.reduce((t, p) => t + p.price, 0);
  const hayAhorro = !!precioPack && ejemplo.length === unidades && suma > precioPack;
  // "La tercera te sale $X": lo que cuesta la última remera dentro del pack
  // (pack − dos sueltas al precio de hoy). Se pidió "3 al precio de 2", pero
  // NO es cierto: 2 × $28.900 = $57.800 < $66.300. Esta frase dice lo mismo y
  // es exacta. Solo se muestra si la cuenta da positiva y menor a una suelta.
  const unitario = ejemplo.length ? Math.max(...ejemplo.map((p) => p.price)) : 0;
  const ultima = precioPack && unitario ? precioPack - unitario * (unidades - 1) : 0;
  const fraseUltima = ultima > 0 && ultima < unitario ? `La ${unidades === 3 ? 'tercera' : 'última'} te sale ${ars(ultima)}` : null;

  const pasos = [
    { t: `Elegí ${unidades} Regular Tees`, d: `Cualquier combinación de los ${totalColores} colores.` },
    { t: 'Tu talle en cada una', d: 'Podés mezclar talles en el mismo pack.' },
    {
      t: precioPack ? `Pagás ${ars(precioPack)} las ${unidades}` : 'Pagás el precio del pack',
      d: 'Se aplica solo en el carrito, sin código.',
    },
  ];

  return (
    <ol ref={ref} className="flex flex-col rounded-[10px] bg-[#f4f4f2] p-2 lg:h-full lg:p-3">
      {pasos.map((p, i) => (
        <li key={i} className="relative lg:flex lg:flex-1 lg:flex-col lg:justify-center">
          {activo === i && (
            <motion.span
              layoutId="pack-paso-activo"
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              className="absolute inset-0 rounded-[8px] bg-white/85 shadow-[0_10px_30px_-18px_rgba(10,10,10,0.35)] ring-1 ring-black/[0.04] backdrop-blur-md"
            />
          )}
          <div className="relative flex items-start gap-4 px-3 py-4 md:gap-6 md:px-6 md:py-6">
            <span
              className={`pt-[4px] text-[11px] tabular-nums tracking-[0.12em] transition-colors duration-300 md:text-[12px] ${
                activo === i ? 'text-foreground' : 'text-text-light'
              }`}
            >
              0{i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-medium leading-tight tracking-[-0.01em] md:text-[22px]">{p.t}</p>
              <p className="mt-1 text-[12.5px] leading-[1.45] text-text-light md:text-[14px]">{p.d}</p>

              {/* Lo que "pasa" en cada paso. Alto fijo: nada salta. */}
              <div className="mt-3 h-11 md:h-12">
                <AnimatePresence>
                  {i === 0 && visto(0) && (
                    <motion.div key="remeras" className="flex gap-2" exit={{ opacity: 0 }}>
                      {ejemplo.map((r, k) => (
                        <motion.span
                          key={r.slug}
                          {...pop}
                          transition={{ ...spring, delay: reducir ? 0 : 0.15 + k * 0.28 }}
                          className="relative h-11 w-11 overflow-hidden rounded-[8px] bg-white ring-1 ring-black/[0.06] md:h-12 md:w-12"
                        >
                          {r.images[0] && <Image src={r.images[0]} alt={r.name} fill sizes="48px" className="object-cover" />}
                        </motion.span>
                      ))}
                    </motion.div>
                  )}
                  {i === 1 && visto(1) && (
                    <motion.div key="talles" className="flex h-full items-center gap-2" exit={{ opacity: 0 }}>
                      {TALLES.slice(0, unidades).map((t, k) => (
                        <motion.span
                          key={t}
                          {...pop}
                          transition={{ ...spring, delay: reducir ? 0 : 0.15 + k * 0.25 }}
                          className="flex h-9 min-w-9 items-center justify-center rounded-full bg-[#0a0a0a] px-3 text-[12.5px] font-medium text-white md:h-10 md:min-w-10"
                        >
                          {t}
                        </motion.span>
                      ))}
                    </motion.div>
                  )}
                  {i === 2 && visto(2) && precioPack && (
                    <motion.div key="precio" className="flex h-full items-center gap-3" exit={{ opacity: 0 }}>
                      {hayAhorro && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                          className="relative whitespace-nowrap text-[14px] tabular-nums text-text-light md:text-[15px]"
                        >
                          {ars(suma)}
                          <motion.span
                            initial={{ scaleX: reducir ? 1 : 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: 0.4, delay: reducir ? 0 : 0.45 }}
                            className="absolute left-0 right-0 top-1/2 h-px origin-left bg-current"
                          />
                        </motion.span>
                      )}
                      <motion.span
                        {...pop}
                        transition={{ ...spring, delay: reducir ? 0 : 0.85 }}
                        className="whitespace-nowrap rounded-full bg-[#0a0a0a] px-3.5 py-1.5 text-[15px] font-semibold tabular-nums text-white md:text-[17px]"
                      >
                        {ars(precioPack)}
                      </motion.span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Debajo del precio, en su propio renglón (pedido de Valentín).
                  Alto reservado en el paso 3 para que no salte al aparecer. */}
              {i === 2 && fraseUltima && (
                <div className="mt-2 h-5 md:h-6">
                  <AnimatePresence>
                    {visto(2) && (
                      <motion.p
                        key="ultima"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35, delay: reducir ? 0 : 1.25 }}
                        className="text-[13px] font-medium md:text-[15px]"
                      >
                        {fraseUltima}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
