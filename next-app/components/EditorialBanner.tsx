'use client';

import { useReveal } from "@/hooks/useReveal";

export default function EditorialBanner() {
  const ref = useReveal();

  return (
    <section className="reveal w-full relative" ref={ref}>
      {/* La imagen ya dice "Style & Culture"; el cartelito encima repetía el
          mismo texto y quedaba pisando la foto. */}
      <img
        src="/style-culture.webp"
        alt="Style & Culture"
        className="w-full h-auto block"
      />
    </section>
  );
}
