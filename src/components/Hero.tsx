import { useEffect, useState, useCallback } from "react";

const slides = [
  {
    image: "stl-look-camo-outdoor.png",
    objectPosition: "center 40%",
    showContent: true,
  },
  {
    image: "banner web 1.webp",
    objectPosition: "center center",
    showContent: false,
  },
  {
    image: "banner web 2.webp",
    objectPosition: "center center",
    showContent: false,
  },
];

export default function Hero() {
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), []);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + slides.length) % slides.length), []);

  useEffect(() => {
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next]);

  const show = (delay: string) =>
    `transition-all duration-700 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${delay}`;

  const slide = slides[current];

  return (
    <section
      className="relative w-full overflow-hidden bg-bg-dark"
      style={{ height: "calc(100dvh - var(--offset))" }}
    >
      {/* Slides */}
      {slides.map((s, i) => (
        <img
          key={s.image}
          src={`/${s.image}`}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{
            objectPosition: s.objectPosition,
            opacity: i === current ? 1 : 0,
          }}
        />
      ))}

      {/* Overlay — solo en slide 1 */}
      {slide.showContent && (
        <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-bg-dark/40 to-bg-dark/85" />
      )}

      {/* Contenido slide 1 */}
      {slide.showContent && (
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

          {/* Scroll indicator - desktop */}
          <div className="hidden md:flex absolute right-12 bottom-16 flex-col items-center gap-3">
            <span className="text-primary-foreground/40 text-[10px] uppercase tracking-[0.2em]" style={{ writingMode: "vertical-rl" }}>
              Scroll
            </span>
            <div className="w-px h-12 bg-primary-foreground/20 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-primary-foreground/60 animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {/* Flechas */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-white/60 hover:text-white transition-colors"
        aria-label="Anterior"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M13 4L7 10L13 16" />
        </svg>
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-white/60 hover:text-white transition-colors"
        aria-label="Siguiente"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M7 4L13 10L7 16" />
        </svg>
      </button>

      {/* Dots */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="transition-all duration-300"
            aria-label={`Slide ${i + 1}`}
          >
            <span
              className="block rounded-full bg-white transition-all duration-300"
              style={{
                width: i === current ? "20px" : "6px",
                height: "6px",
                opacity: i === current ? 1 : 0.4,
              }}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
