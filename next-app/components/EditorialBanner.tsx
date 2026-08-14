'use client';

import { useReveal } from "@/hooks/useReveal";

export default function EditorialBanner() {
  const ref = useReveal();

  return (
    <section className="reveal w-full relative" ref={ref}>
      {/* La imagen ya dice "Style & Culture"; el cartelito encima repetía el
          mismo texto y quedaba pisando la foto. */}
      {/* width/height reservan el alto antes de que baje la foto: sin eso el
          banner ocupa 0px y todo lo de abajo salta al cargar (CLS). */}
      <img
        src="/style-culture.webp"
        alt="Style & Culture"
        width={1400}
        height={620}
        loading="lazy"
        decoding="async"
        className="w-full h-auto block"
      />
    </section>
  );
}
