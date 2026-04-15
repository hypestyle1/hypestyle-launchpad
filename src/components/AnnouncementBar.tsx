const items = [
  "Hasta 3 y 6 cuotas sin interés",
  "Worldwide Shipping vía DHL",
  "© Style&Culture — Est. 2018",
  "30 días para cambios y devoluciones",
];

export default function AnnouncementBar() {
  const repeated = [...items, ...items, ...items, ...items];

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[var(--announce-h)] bg-bg-dark overflow-hidden flex items-center">
      <div className="animate-marquee-fast flex whitespace-nowrap">
        {repeated.map((item, i) => (
          <span
            key={i}
            className="mx-6 text-[10px] font-normal tracking-[0.1em] text-primary-foreground"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
