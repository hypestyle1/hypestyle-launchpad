const items = [
  "Style & Culture",
  "Buenos Aires",
  "Worldwide Shipping",
  "Drops limitados",
  "@hypestylearg",
  "DHL International",
  "Cuotas sin interés",
  "Est. 2018",
];

export default function Marquee() {
  const repeated = [...items, ...items, ...items, ...items];

  return (
    <div className="bg-background border-y border-border py-4 overflow-hidden">
      <div className="animate-marquee flex whitespace-nowrap">
        {repeated.map((item, i) => (
          <span key={i} className="mx-6 text-[13px] font-medium text-muted-foreground uppercase tracking-[0.1em]">
            {item}
            <span className="ml-6 text-border-mid">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
