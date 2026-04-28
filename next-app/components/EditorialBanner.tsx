'use client';

import { useReveal } from "@/hooks/useReveal";

export default function EditorialBanner() {
  const ref = useReveal();

  return (
    <section className="reveal w-full relative" ref={ref}>
      <img
        src="/style-culture.webp"
        alt="Style & Culture"
        className="w-full h-auto block"
      />
      <div className="absolute bottom-0 left-0 p-6 md:p-10">
        <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground bg-background/80 px-3 py-1.5">
          Style & Culture · Buenos Aires
        </span>
      </div>
    </section>
  );
}
