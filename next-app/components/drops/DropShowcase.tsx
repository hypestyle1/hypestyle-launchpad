import Image from 'next/image';
import Link from 'next/link';

/* DropShowcase — un drop presentado como editorial: título, pocos datos y las
   prendas en mockups individuales sobre el fondo de la página (sin tarjetas,
   sin marcos). Pensado para reutilizarse en la home y en futuros drops.

   Reglas que el componente garantiza:
   - Una prenda es link SOLO si llega con `href`. Sin href se muestra igual,
     pero no es clickeable: nunca un link a una ficha inexistente. Quien arma
     las piezas decide el href (en Cyber: `piezaPublica` en lib/cyber-cartelera).
   - El CTA con `href: null` se renderiza deshabilitado, no como link.
   - Hereda el color de texto del contenedor: sirve sobre claro u oscuro.
   - Componente de servidor: sin estado ni JS de cliente. */

export interface DropShowcasePieza {
  nombre: string;
  color: string;
  img: string;
  href: string | null;
}

export interface DropShowcaseProps {
  /** Línea chica sobre el título: "Drop 02 · Preventa". */
  eyebrow: string;
  titulo: string;
  /** Datos de una línea (colores, entrega…). Mantenerlo en 2 o menos. */
  datos?: { label: string; valor: string }[];
  piezas: DropShowcasePieza[];
  /** `href: null` = CTA deshabilitado (p. ej. colección sin publicar). */
  cta?: { label: string; href: string | null };
  /** principal = protagonista a todo el ancho; secundaria = más compacta. */
  jerarquia?: 'principal' | 'secundaria';
}

function Pieza({ p, sizes, principal }: { p: DropShowcasePieza; sizes: string; principal: boolean }) {
  const contenido = (
    <>
      <div className="relative aspect-square">
        <Image
          src={p.img}
          alt={`${p.nombre} ${p.color}`}
          fill
          sizes={sizes}
          className="object-contain transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
      </div>
      <p
        className={`mt-1 text-center font-bold uppercase leading-tight tracking-[0.06em] ${
          principal ? 'text-[11px] md:text-[12.5px]' : 'text-[10.5px] md:text-[11.5px]'
        }`}
      >
        {p.nombre} <span className="font-semibold opacity-50">· {p.color}</span>
      </p>
    </>
  );

  return p.href ? (
    <Link href={p.href} className="group block" aria-label={`${p.nombre} ${p.color}, ver producto`}>
      {contenido}
    </Link>
  ) : (
    <div>{contenido}</div>
  );
}

function Cta({ cta, principal }: { cta: NonNullable<DropShowcaseProps['cta']>; principal: boolean }) {
  const base = `inline-flex items-center justify-center rounded-full font-bold uppercase tracking-[0.14em] ${
    principal ? 'h-[50px] px-10 text-[12px]' : 'h-[40px] px-5 text-[10.5px] md:h-[44px] md:px-6 md:text-[11px]'
  }`;
  if (!cta.href) {
    return (
      <span
        aria-disabled="true"
        className={`${base} cursor-default select-none border border-current opacity-40`}
      >
        {cta.label}
      </span>
    );
  }
  return principal ? (
    <Link href={cta.href} className={`${base} bg-[#0a0a0a] text-white transition-opacity hover:opacity-85`}>
      {cta.label}
    </Link>
  ) : (
    <Link
      href={cta.href}
      className={`${base} border border-current transition-colors hover:bg-[#0a0a0a] hover:text-white`}
    >
      {cta.label}
    </Link>
  );
}

export default function DropShowcase({
  eyebrow,
  titulo,
  datos = [],
  piezas,
  cta,
  jerarquia = 'principal',
}: DropShowcaseProps) {
  const principal = jerarquia === 'principal';

  if (principal) {
    return (
      <article>
        {/* Cabecera: título a la izquierda; datos + CTA a la derecha en desktop. */}
        <div className="md:flex md:items-end md:justify-between md:gap-10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] opacity-55 md:text-[11px]">{eyebrow}</p>
            <h3 className="mt-2 text-[42px] font-black uppercase leading-[0.86] tracking-[-0.025em] md:text-[76px]">
              {titulo}
            </h3>
          </div>
          <div className="hidden shrink-0 items-end gap-10 md:flex">
            <Datos datos={datos} />
            {cta && <Cta cta={cta} principal />}
          </div>
        </div>

        {/* Las prendas: 2×2 a sangre en mobile, una fila de 4 en desktop. */}
        <div className="-mx-3 mt-4 grid grid-cols-2 gap-x-1 gap-y-3 md:mx-0 md:mt-8 md:grid-cols-4 md:gap-x-6">
          {piezas.map((p) => (
            <Pieza key={p.img} p={p} sizes="(max-width: 768px) 50vw, 340px" principal />
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-4 md:hidden">
          <Datos datos={datos} />
          {cta && (
            <div className="[&>*]:w-full">
              <Cta cta={cta} principal />
            </div>
          )}
        </div>
      </article>
    );
  }

  return (
    <article className="md:grid md:grid-cols-12 md:items-center md:gap-8">
      <div className="flex items-end justify-between gap-4 md:col-span-3 md:block">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] opacity-55 md:text-[11px]">{eyebrow}</p>
          <h3 className="mt-1.5 text-[26px] font-black uppercase leading-[0.88] tracking-[-0.02em] md:mt-2 md:text-[40px]">
            {titulo}
          </h3>
        </div>
        {cta && (
          <div className="shrink-0 md:mt-6">
            <Cta cta={cta} principal={false} />
          </div>
        )}
      </div>

      {/* Tira deslizable en mobile (se ven 2 y media: invita a pasar);
          4 columnas en desktop. */}
      <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-1 overflow-x-auto px-3 pb-1 [scrollbar-width:none] md:col-span-9 md:mx-0 md:mt-0 md:grid md:grid-cols-4 md:gap-5 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
        {piezas.map((p) => (
          <div key={p.img} className="w-[42%] shrink-0 snap-start md:w-auto">
            <Pieza p={p} sizes="(max-width: 768px) 42vw, 260px" principal={false} />
          </div>
        ))}
      </div>
    </article>
  );
}

function Datos({ datos }: { datos: NonNullable<DropShowcaseProps['datos']> }) {
  if (datos.length === 0) return null;
  return (
    <dl className="flex gap-8">
      {datos.map((d) => (
        <div key={d.label}>
          <dt className="text-[9.5px] font-semibold uppercase tracking-[0.2em] opacity-50">{d.label}</dt>
          <dd className="mt-1 text-[13px] font-bold uppercase tracking-[0.04em] md:text-[14px]">{d.valor}</dd>
        </div>
      ))}
    </dl>
  );
}
