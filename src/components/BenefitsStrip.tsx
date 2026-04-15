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
    <section className="bg-bg-alt" ref={ref}>
      <div className="max-w-[1400px] mx-auto px-4 py-12 md:py-16 grid grid-cols-2 lg:grid-cols-4 gap-8">
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
