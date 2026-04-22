export default function VideoSection() {
  return (
    <section className="w-full relative overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
      <iframe
        src="https://www.youtube.com/embed/WKox7VQJKYM?autoplay=1&mute=1&loop=1&playlist=WKox7VQJKYM&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1"
        title="Hypestyle"
        allow="autoplay; encrypted-media"
        allowFullScreen
        className="absolute inset-0 w-full h-full border-0 pointer-events-none"
        style={{ transform: "scale(1.05)" }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

      {/* CTA */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-8 md:pb-14">
        <a
          href="/producto/jersey-fileteado-x-alfredo-genovese/"
          className="px-8 py-3 border border-white text-white text-[11px] md:text-[12px] uppercase tracking-[0.18em] hover:bg-white hover:text-black transition-colors duration-300"
        >
          Ver Colección
        </a>
      </div>
    </section>
  );
}
