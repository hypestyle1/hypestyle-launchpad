'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useProducts } from '@/hooks/useProducts';

/* EXPLORÁ POR CATEGORÍA — navegación editorial, tipográfica.

   ── Por qué cambió ──────────────────────────────────────────────────────────
   La primera versión eran siete tiles con foto, borde y texto. Se veía
   genérica y pesaba más que lo que resolvía: siete cajas negras repetidas
   antes de que apareciera un solo producto comprable. Esta versión es una
   franja: la tipografía manda, las líneas divisorias son apenas una insinuación
   y la foto aparece solo al pasar el mouse, chica y al costado del nombre —
   ahí sí suma, porque confirma a dónde vas sin ocupar lugar cuando no la
   mirás.

   Cinco categorías. Mystery Archive y los 3 drops tienen su propia sección
   más abajo: repetirlos acá era decir dos veces lo mismo.

   ── Adónde va ───────────────────────────────────────────────────────────────
   Cada una lleva a **su página de catálogo** (`/tees`, `/hoodies`,
   `/longsleeves`, `/pants`, `/colecciones/regular-tees`), que es el sistema de
   filtros que el sitio ya tiene: no se construye una segunda lógica, se usa la
   que existe y que ya está probada.

   ── Mobile ──────────────────────────────────────────────────────────────────
   Tira deslizable, con cada nombre como objetivo táctil cómodo (56 px de alto)
   y los gutters negativos para que el scroll llegue al borde de la pantalla,
   que es lo que avisa que hay más a la derecha. */

export interface AccesoCategoria {
  id: string;
  label: string;
  href: string;
  /** Producto que presta la miniatura del hover. */
  slugFoto: string | null;
}

export default function CyberNavCategorias({ accesos }: { accesos: AccesoCategoria[] }) {
  const { data } = useProducts();
  const [activo, setActivo] = useState<string | null>(null);

  const fotos = useMemo(() => {
    const bySlug = new Map((data ?? []).map((p) => [p.slug, p]));
    const out: Record<string, string | undefined> = {};
    for (const a of accesos) if (a.slugFoto) out[a.id] = bySlug.get(a.slugFoto)?.images?.[0];
    return out;
  }, [data, accesos]);

  return (
    <nav
      aria-label="Explorá por categoría"
      className="border-y border-white/10 bg-[#0a0a0a] text-white"
    >
      <div className="mx-auto max-w-[1400px] px-4 py-7 md:px-10 md:py-9">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.26em] text-white/40 md:mb-5 md:text-[11px]">
          Explorá por categoría
        </p>

        <ul className="-mx-4 flex items-stretch gap-0 overflow-x-auto px-4 md:mx-0 md:px-0">
          {accesos.map((a, i) => (
            <li
              key={a.id}
              className={`shrink-0 md:flex-1 ${i > 0 ? 'border-l border-white/10 pl-5 md:pl-6' : ''} ${
                i < accesos.length - 1 ? 'pr-5 md:pr-6' : 'pr-4 md:pr-0'
              }`}
            >
              <Link
                href={a.href}
                onMouseEnter={() => setActivo(a.id)}
                onMouseLeave={() => setActivo(null)}
                className="group flex h-[56px] items-center gap-3 focus-visible:outline-white md:h-[64px]"
              >
                {/* Miniatura: solo en desktop y solo al pasar por encima.
                    Ocupa un hueco reservado, así nada se mueve al aparecer. */}
                <span className="relative hidden h-10 w-10 shrink-0 overflow-hidden rounded-[6px] md:block">
                  {fotos[a.id] && (
                    <Image
                      src={fotos[a.id]!}
                      alt=""
                      fill
                      sizes="40px"
                      className={`object-cover transition-opacity duration-300 ${
                        activo === a.id ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  )}
                </span>

                <span className="whitespace-nowrap text-[17px] font-black uppercase leading-none tracking-[-0.01em] text-white/80 transition-colors group-hover:text-white md:text-[21px]">
                  {a.label}
                </span>

                <svg
                  width="13"
                  height="9"
                  viewBox="0 0 15 10"
                  fill="none"
                  aria-hidden="true"
                  className="shrink-0 text-white/25 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-white/70"
                >
                  <path
                    d="M9.6.7 13.9 5 9.6 9.3M13.3 5H.8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
