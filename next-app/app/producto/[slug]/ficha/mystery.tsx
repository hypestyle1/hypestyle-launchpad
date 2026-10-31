'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from '@/context/LocaleContext';
import {
  ahorroMinimo,
  ahorroPromedio,
  descuentoPromedio,
  mockupPool,
  pisoSuelto,
  precioPorPrenda,
  promedioPool,
  type MysteryCaja,
} from '@/lib/mystery';

/**
 * Capa visual de MYSTERY ARCHIVE sobre la ficha de producto normal.
 *
 * Mismo patrón que `privateAccess`: la ficha es la de siempre —galería al
 * centro, talle y carrito a la derecha, desplegables a la izquierda— y esto
 * solo agrega lo que una caja sorpresa necesita para no ser ambigua:
 *
 *  1. `MysteryGarantia`  — qué recibís, pegado al título y antes del precio.
 *  2. `MysteryAhorro`    — cuánto sale cada prenda y contra qué se compara.
 *  3. `MysteryComoFunciona` — los tres pasos, debajo del botón.
 *  4. `MysteryPool`      — las prendas que pueden tocar, con foto.
 *  5. `MysteryCondiciones` — qué se cambia y qué no.
 *
 * La regla de honestidad que ordena todo esto: **la portada muestra el
 * conjunto, no el envío**. En ningún lugar se dice ni se sugiere que lleguen
 * todas las prendas de la foto, y el número de prendas aparece tres veces
 * (garantía, pasos y condiciones) porque es lo único que no se puede
 * malentender.
 */

const fmt = (n: number) => '$' + n.toLocaleString('es-AR');

/** Migas que vuelven al evento. La caja no existe fuera de Cyber Hype. */
export function MysteryMigas() {
  return (
    <p className="text-[12px] text-muted-foreground">
      <Link href="/cyberhype/" className="hover:text-foreground transition-colors">Cyber Hype</Link>
      <span className="mx-1.5 opacity-40">/</span>
      <Link href="/cyberhype/#mystery" className="hover:text-foreground transition-colors">Mystery Archive</Link>
    </p>
  );
}

export function MysteryBadge() {
  return (
    <span className="inline-flex w-fit items-center rounded-[5px] bg-foreground px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.14em] text-background">
      Mystery Archive
    </span>
  );
}

/**
 * La promesa, en una línea, arriba del precio.
 *
 * Va antes que el precio a propósito: en una caja sorpresa la primera duda no
 * es cuánto sale, es qué llega. Si eso no se responde en el primer vistazo, el
 * precio no significa nada.
 */
export function MysteryGarantia({ caja }: { caja: MysteryCaja }) {
  return (
    <p className="text-[14px] leading-[1.45] font-medium text-foreground lg:text-[15px]">
      {caja.garantia}
    </p>
  );
}

/**
 * Precio por prenda y la comparación.
 *
 * **Con una prenda por caja la comparación es contra el PROMEDIO del pool**, no
 * contra su extremo más barato. El cliente no compra un modelo: compra una
 * prenda cualquiera del conjunto, así que lo que recibe en promedio es lo que
 * el conjunto vale en promedio. Comparar contra el mínimo subestimaba el
 * beneficio —en LONGSLEEVES daba $1.100 cuando el descuento real sobre el pool
 * es del 19,8%— y describía un caso que es uno de diez, no el típico.
 *
 * Con dos o más prendas se mantiene la comparación contra el piso: ahí el
 * cliente recibe varias y el peor caso es una combinación concreta y posible.
 *
 * Con una prenda por caja el "por prenda" desaparece: sería repetir el precio.
 */
export function MysteryAhorro({ caja }: { caja: MysteryCaja }) {
  if (caja.prendas === 1) {
    return (
      <p className="text-[12px] leading-[1.45] text-muted-foreground">
        Las prendas del conjunto salen{' '}
        <strong className="font-medium text-foreground">{fmt(promedioPool(caja))} en promedio</strong>.
        Ahorrás {fmt(ahorroPromedio(caja))} — un {Math.round(descuentoPromedio(caja) * 100)}% menos.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[13px] font-semibold text-foreground">
        {fmt(precioPorPrenda(caja))} por prenda
      </p>
      <p className="text-[12px] leading-[1.45] text-muted-foreground">
        Las {caja.prendas} prendas sueltas salen <strong className="font-medium text-foreground">desde {fmt(pisoSuelto(caja))}</strong>.
        Ahorrás {fmt(ahorroMinimo(caja))} como mínimo.
      </p>
    </div>
  );
}

/** Los tres pasos. Cortos y en ese orden: elegís, elegimos, recibís. */
export function MysteryComoFunciona({ caja }: { caja: MysteryCaja }) {
  const pasos = [
    'Elegís tu talle y comprás.',
    `Elegimos ${caja.prendas === 1 ? 'la prenda' : `las ${caja.prendas} prendas`} dentro del conjunto de abajo.`,
    'Te llega tu Mystery con el resto del pedido.',
  ];
  return (
    <div className="rounded-[10px] bg-bg-alt px-4 py-3.5">
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        Cómo funciona
      </p>
      <ol className="flex flex-col gap-2">
        {pasos.map((paso, i) => (
          <li key={paso} className="flex gap-2.5 text-[13px] leading-[1.4]">
            <span className="mt-[1px] flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
              {i + 1}
            </span>
            <span>{paso}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * El conjunto completo, con foto y nombre.
 *
 * Es la pieza que hace honesta la sorpresa: lo que se elige al comprar es el
 * **conjunto**, no la prenda, y para que esa elección sea informada hay que
 * poder verlo entero. Por eso están los N modelos, no una muestra.
 */
export function MysteryPool({ caja }: { caja: MysteryCaja }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] leading-[1.5] text-muted-foreground">
        Tu Mystery trae <strong className="font-medium text-foreground">{caja.prendas} de estos {caja.modelos.length} modelos</strong>, en tu talle.
        No llegan todos: la foto de portada muestra el conjunto del que elegimos.
      </p>
      <ul className="grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-4">
        {caja.modelos.map(m => (
          <li key={m.id} className="flex flex-col gap-1">
            <div className="relative aspect-square overflow-hidden rounded-[8px] bg-bg-alt">
              <Image
                src={mockupPool(m.id)}
                alt={m.nombre}
                fill
                sizes="(max-width: 1024px) 30vw, 120px"
                className="object-contain p-1"
              />
            </div>
            <p className="text-[10.5px] leading-[1.25] text-muted-foreground">{m.nombre}</p>
          </li>
        ))}
      </ul>
      <p className="text-[11px] leading-[1.45] text-muted-foreground/80">
        La disponibilidad de cada modelo cambia por talle: no todos los {caja.modelos.length} están en los cuatro talles.
      </p>
    </div>
  );
}

/**
 * Condiciones. Cortas y sin letra chica: lo único realmente distinto de una
 * ficha normal es que el contenido no se elige ni se cambia, y eso se dice
 * tal cual. El arrepentimiento de 10 días de la ley 24.240 corre igual que en
 * cualquier compra online: una caja sorpresa no lo suspende.
 */
export function MysteryCondiciones({ caja }: { caja: MysteryCaja }) {
  return (
    <ul className="flex flex-col gap-1.5">
      <li><strong className="font-medium text-foreground">Cambio de talle:</strong> sí, por el mismo talle de otra Mystery o por otra prenda, sujeto a stock.</li>
      <li><strong className="font-medium text-foreground">Cambio de modelo:</strong> no. Qué prenda toca es parte de lo que estás comprando y lo elegimos nosotros.</li>
      <li><strong className="font-medium text-foreground">Arrepentimiento:</strong> 10 días corridos desde que la recibís, con devolución a cargo nuestro (ley 24.240, art. 34).</li>
      <li><strong className="font-medium text-foreground">Prendas falladas:</strong> se cambian o se devuelve el dinero, como cualquier otra compra.</li>
      <li>
        {caja.prendas === 1
          ? 'Tu Mystery trae una sola prenda, en el talle que elegís. No es un pack ni un combo.'
          : `Las ${caja.prendas} prendas vienen en el mismo talle y son siempre de diseños distintos entre sí.`}
      </li>
    </ul>
  );
}

/**
 * Qué incluye, en texto plano para el desplegable de la izquierda.
 * Repite el número de prendas porque es el dato que no puede quedar en duda.
 */
export function MysteryQueIncluye({ caja }: { caja: MysteryCaja }) {
  return (
    <div className="flex flex-col gap-2">
      <p>{caja.garantia}</p>
      <p>{caja.queEs}</p>
      <p className="text-foreground font-medium">
        Contenido garantizado: {caja.prendas} {caja.prendas === 1 ? 'prenda' : 'prendas'} · 1 talle a tu elección · {caja.modelos.length} modelos posibles.
      </p>
      <p>
        Llega en el packaging habitual de Hype, con el resto de tu pedido.
      </p>
    </div>
  );
}

/** Vuelta al evento, al pie de la columna de compra. */
export function MysteryVolver() {
  const { t } = useLocale();
  return (
    <Link
      href="/cyberhype/#mystery"
      className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M10 3L5 8l5 5" />
      </svg>
      {t('Ver las tres Mystery')}
    </Link>
  );
}
