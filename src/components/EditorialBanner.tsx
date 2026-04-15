import { useReveal } from "@/hooks/useReveal";

export default function EditorialBanner() {
  const ref = useReveal();

  return (
    <section className="reveal w-full max-h-[520px] overflow-hidden relative" ref={ref}>
      <img
        src="/STYLE&CULTURE.webp"
        alt="Style & Culture"
        className="w-full h-[400px] md:h-[520px] object-cover"
      />
      <div className="absolute bottom-0 left-0 p-6 md:p-10">
        <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground bg-background/80 px-3 py-1.5">
          Style & Culture · Buenos Aires
        </span>
      </div>
    </section>
  );
}
