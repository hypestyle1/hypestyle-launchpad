import Image from 'next/image';
import Link from 'next/link';
import { PREVENTA_ZIP_CAMO } from '@/lib/cyber-cartelera';

/* PREVENTA — ZIP HOODIE CAMO (banner editorial).

   Candado: mientras `PREVENTA_ZIP_CAMO.publicado` sea false, en producción
   esta sección NO se monta (el mismo patrón que tuvo Mystery). Encenderla
   exige dos cosas que no pasan por el código: el OK comercial de Valentín y
   el stock de preventa cargado en Woo. Hasta entonces se ve solo en local.

   El banner nunca dice "disponible": dice PREVENTA, la fecha estimada de
   entrega y cuántas unidades entran. La compra es un link a la ficha SOLO
   cuando está publicado. */

export default function CyberPreventa() {
  const p = PREVENTA_ZIP_CAMO;
  if (!p.publicado && process.env.NODE_ENV === 'production') return null;

  return (
    <section className="bg-background px-4 pb-10 text-foreground md:px-10 md:pb-14">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 overflow-hidden md:grid-cols-2 md:items-stretch">
        {/* Recorte a los dos hoodies (mitad superior de la composición): el
            drop de arriba ya muestra el conjunto entero y repetir la misma
            foto dos veces seguidas aplanaba las dos secciones. */}
        <div className="relative aspect-[4/3] overflow-hidden bg-[#e9e5dc] md:aspect-auto md:min-h-[520px]">
          <Image
            src={p.img}
            alt={`${p.nombre} — ${p.colorways}`}
            fill
            sizes="(max-width: 768px) 100vw, 700px"
            className="object-cover"
            style={{ objectPosition: '50% 14%' }}
          />
          <span className="cyber-glass-light absolute left-3 top-3 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a] md:left-4 md:top-4 md:text-[10px]">
            Preventa
          </span>
        </div>

        <div className="flex flex-col justify-center bg-[#e9e5dc] px-5 py-7 md:px-12 md:py-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-foreground/50 md:text-[11px]">
            Unidades limitadas
          </p>
          <h2 className="mt-2 text-[30px] font-black uppercase leading-[0.9] tracking-[-0.01em] md:text-[48px]">
            {p.nombre}
          </h2>
          <p className="mt-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground/70 md:text-[14px]">
            {p.colorways}
          </p>
          <p className="mt-3 max-w-[46ch] text-[13px] leading-[1.5] text-foreground/65 md:text-[14.5px]">
            Son unidades de preventa: se reservan ahora y se entregan cuando llegan.{' '}
            {p.eta}.
          </p>
          {p.publicado && (
            <Link
              href={p.href}
              className="mt-5 inline-flex h-[48px] w-full items-center justify-center rounded-full bg-[#0a0a0a] px-8 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-85 md:mt-7 md:w-auto md:self-start md:px-10"
            >
              Reservar en preventa
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
