import { Globe, CreditCard, RotateCcw, Lock } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";

const benefits = [
  { icon: Globe, title: "Envío Internacional", desc: "DHL Express. Tracking en tiempo real." },
  { icon: CreditCard, title: "Cuotas Sin Interés", desc: "3 y 6 cuotas con Visa y Mastercard." },
  { icon: RotateCcw, title: "Cambios Gratis", desc: "30 días para cambios y devoluciones." },
  { icon: Lock, title: "Drops Exclusivos", desc: "Producción limitada. Stock que no se repite." },
];

export default function BenefitsStrip() {
  const ref = useReveal();

  return (
    <section className="bg-bg-alt overflow-hidden" ref={ref}>
      {/* Mobile: swipeable row */}
      <div className="flex md:hidden overflow-x-auto scrollbar-none py-6 px-6 gap-8 snap-x snap-mandatory">
        {benefits.map((b) => (
          <div key={b.title} className="flex-none flex items-center gap-3 snap-start">
            <b.icon className="w-5 h-5 shrink-0 text-foreground" strokeWidth={1.5} />
            <div>
              <p className="text-[12px] font-bold uppercase tracking-tight whitespace-nowrap">{b.title}</p>
              <p className="text-[11px] text-muted-foreground whitespace-nowrap">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: grid */}
      <div className="hidden md:grid max-w-[1400px] mx-auto px-4 py-12 grid-cols-2 lg:grid-cols-4 gap-8">
        {benefits.map((b, i) => (
          <div key={b.title} className={`reveal rd${i + 1} text-center`}>
            <b.icon className="w-6 h-6 mx-auto mb-3 text-foreground" strokeWidth={1.5} />
            <p className="text-[13px] font-bold uppercase tracking-tight mb-1">{b.title}</p>
            <p className="text-[12px] text-muted-foreground">{b.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
