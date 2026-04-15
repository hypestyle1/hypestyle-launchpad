import { useEffect, useState } from "react";

export default function Hero() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  const show = (delay: string) =>
    `transition-all duration-700 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${delay}`;

  return (
    <section
      className="relative w-full bg-bg-dark overflow-hidden"
      style={{ height: "calc(100dvh - var(--offset))" }}
    >
      {/* Background placeholder */}
      <div className="absolute inset-0 bg-gradient-to-bl from-muted-foreground/20 to-bg-dark/90" />

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-bg-dark/40 to-bg-dark/85" />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-end p-6 md:p-12 max-w-[1400px] mx-auto">
        <div className="mb-12 md:mb-16 max-w-xl">
          <p className={`text-primary-foreground/60 text-[11px] uppercase tracking-[0.2em] mb-4 ${show("delay-[0ms]")}`}>
            Drop disponible · Buenos Aires 2026
          </p>
          <h1 className={`text-primary-foreground text-4xl md:text-6xl lg:text-7xl font-bold leading-[0.95] mb-4 ${show("delay-[70ms]")}`}>
            Camo <em className="font-bold italic">Drop.</em>
          </h1>
          <p className={`text-primary-foreground/70 text-sm md:text-base mb-8 ${show("delay-[140ms]")}`}>
            Set completo: zip, pantalón y cap. Stock limitado.
          </p>
          <div className={`flex flex-wrap gap-3 ${show("delay-[210ms]")}`}>
            <a
              href="/productos/"
              className="inline-flex items-center px-7 py-3 bg-primary-foreground text-primary text-[13px] font-semibold uppercase tracking-[0.08em] hover:bg-primary-foreground/90 transition-colors"
            >
              Shop Now
            </a>
            <a
              href="#best-sellers"
              className="inline-flex items-center px-7 py-3 border border-primary-foreground/30 text-primary-foreground text-[13px] font-semibold uppercase tracking-[0.08em] hover:border-primary-foreground/60 transition-colors"
            >
              Ver Drop
            </a>
          </div>
        </div>

        {/* Scroll indicator - desktop only */}
        <div className="hidden md:flex absolute right-12 bottom-16 flex-col items-center gap-3">
          <span className="text-primary-foreground/40 text-[10px] uppercase tracking-[0.2em]" style={{ writingMode: "vertical-rl" }}>
            Scroll
          </span>
          <div className="w-px h-12 bg-primary-foreground/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-primary-foreground/60 animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  );
}
