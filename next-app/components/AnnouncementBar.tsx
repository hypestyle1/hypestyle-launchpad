'use client';

const items = [
  "Hasta 3 y 6 cuotas sin interés",
  "Worldwide Shipping vía DHL",
  "© Style&Culture — Est. 2018",
  "30 días para cambios y devoluciones",
];

export default function AnnouncementBar() {
  const repeated = [...items, ...items, ...items, ...items];

  return (
    <div
      className="fixed top-2.5 left-4 right-4 z-50 h-[28px] flex items-center overflow-hidden"
      style={{
        borderRadius: "999px",
        background: "rgba(10, 10, 10, 0.55)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 2px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <div className="animate-marquee-fast flex whitespace-nowrap">
        {repeated.map((item, i) => (
          <span key={i} className="flex items-center gap-5 mx-5">
            <span className="text-[10px] font-normal tracking-[0.12em] text-white/80">
              {item}
            </span>
            <span
              className="inline-block w-1 h-1 rounded-full flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.25)" }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
