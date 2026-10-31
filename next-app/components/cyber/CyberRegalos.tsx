import Image from 'next/image';

/* REGALO POR COMPRA — los tres niveles de un vistazo, en cualquier ancho.

   ── La regla ────────────────────────────────────────────────────────────────
   Tres columnas iguales SIEMPRE: en 320, 375, 390, 430 y en desktop. Sin
   carrusel, sin scroll lateral, sin apilar. Las tres juntas ocupan lo que
   antes ocupaba una sola, porque una escalera que obliga a scrollear para ver
   el tercer escalón no comunica la escalera.

   Lo que se paga por eso es espacio: cada card es angosta, así que adentro va
   lo mínimo —foto, "desde", monto, nombre— y los tamaños están medidos para
   que el monto, que es el dato que hace funcionar la mecánica, siga siendo lo
   más legible de la card.

   ── Las fotos ───────────────────────────────────────────────────────────────
   No son las de Woo directo: están **recortadas al producto** (`trim` sobre
   el fondo blanco) y servidas desde `public/cyber/regalos`. Los packshots
   originales traen mucho aire alrededor y a 80 px de alto la cadena se volvía
   un hilo y el Zippo una mancha. Recortadas, cada producto se reconoce en
   miniatura. Pesan 8–14 KB cada una.

   Es un componente de SERVIDOR: no hay estado ni interacción, así que no
   necesita bajar JavaScript al navegador.

   ── Los montos ──────────────────────────────────────────────────────────────
   No son precios ni porcentajes: son umbrales de una mecánica ya viva,
   verificada contra `POST /api/gift-progress` del sitio publicado
   (`active: true`, modo `highest`). Ese modo es el motivo de que la
   aclaración vaya una sola vez abajo: se lleva UN regalo, el del nivel más
   alto. */

const NIVELES = [
  { monto: '$100.000', nombre: 'Hype Chain', img: '/cyber/regalos/chain.webp' },
  { monto: '$140.000', nombre: 'Hype Socks', img: '/cyber/regalos/socks.webp' },
  { monto: '$300.000', nombre: 'Zippo Hype', img: '/cyber/regalos/zippo.webp' },
];

export default function CyberRegalos() {
  return (
    <section id="regalos" className="bg-[#0a0a0a] px-4 py-12 text-white md:px-10 md:py-14">
      <div className="mx-auto max-w-[760px]">
        <h2 className="text-[22px] font-black uppercase leading-[0.95] tracking-[-0.01em] md:text-[26px]">
          Regalo por compra
        </h2>
        <p className="mt-1.5 text-[12.5px] text-white/50 md:text-[13.5px]">
          Cuanto más sumás, mejor es tu regalo.
        </p>

        {/* Tres columnas iguales en todos los anchos. El gap chico y el ancho
            en fracciones dejan que las cards se achiquen solas en 320 px sin
            romper la fila. */}
        <ul className="mt-5 grid grid-cols-3 gap-2 md:mt-6 md:gap-3">
          {NIVELES.map((n) => (
            <li key={n.monto} className="overflow-hidden rounded-[10px] bg-white/[0.05]">
              {/* Foto: 82 px de alto en mobile, 110 en desktop. Fondo blanco
                  porque el producto viene recortado sobre blanco. */}
              <div className="relative h-[82px] bg-white md:h-[110px]">
                <Image
                  src={n.img}
                  alt={n.nombre}
                  fill
                  sizes="(max-width: 768px) 33vw, 240px"
                  className="object-contain p-2 md:p-3"
                />
              </div>

              <div className="px-2 pb-2.5 pt-2 text-center md:px-3 md:pb-3 md:pt-2.5">
                <span className="block text-[8px] font-semibold uppercase tracking-[0.18em] text-white/35 md:text-[9px]">
                  Desde
                </span>
                <span className="mt-0.5 block text-[13.5px] font-black leading-none tabular-nums text-white md:text-[17px]">
                  {n.monto}
                </span>
                <span className="mt-1 block text-[9px] font-bold uppercase leading-[1.15] tracking-[0.02em] text-white/70 md:text-[11px]">
                  {n.nombre}
                </span>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-3.5 text-[11px] text-white/40 md:mt-4 md:text-[12px]">
          Te llevás el regalo del nivel más alto que alcances. El Zippo, hasta agotar stock.
        </p>
      </div>
    </section>
  );
}
