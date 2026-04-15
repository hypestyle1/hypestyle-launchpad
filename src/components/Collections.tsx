import { useReveal } from "@/hooks/useReveal";

const collections = [
  { name: "Tees", href: "/us/tees/", image: "cat-tees.webp" },
  { name: "Hoodies", href: "/us/hoodies/", image: "cat-hoodies.webp" },
  { name: "Sets", href: "/us/sets/", image: "cat-sets.webp" },
  { name: "Accesorios", href: "/us/accesorios/", image: "cat-accesorios.webp" },
];

export default function Collections() {
  const ref = useReveal();

  return (
    <section id="categorias" className="max-w-[1400px] mx-auto px-4 py-16 md:py-24" ref={ref}>
      <h2 className="reveal rd1 text-xl md:text-2xl font-bold uppercase tracking-tight mb-6">Colecciones</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[2px]">
        {collections.map((c, i) => (
          <a
            key={c.name}
            href={c.href}
            className={`reveal rd${i + 2} group relative h-[320px] md:h-[420px] overflow-hidden bg-bg-alt`}
          >
            {/* Placeholder bg */}
            <div className="absolute inset-0 bg-gradient-to-br from-muted-foreground/30 to-bg-dark/40 group-hover:scale-105 transition-transform duration-700" />
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-bg-dark/80 via-transparent to-transparent group-hover:from-bg-dark/90 transition-colors duration-500" />
            {/* Text */}
            <div className="absolute bottom-0 left-0 p-5">
              <p className="text-primary-foreground text-lg font-bold uppercase tracking-tight">{c.name}</p>
              <p className="text-primary-foreground/60 text-[12px] font-medium uppercase tracking-wider mt-1">
                Shop →
              </p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
