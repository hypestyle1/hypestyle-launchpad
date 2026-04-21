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
    </section>
  );
}
