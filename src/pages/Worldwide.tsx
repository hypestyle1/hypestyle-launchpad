import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useReveal } from "@/hooks/useReveal";
import { Plane, Clock, Package, Globe } from "lucide-react";

const zones = [
  {
    region: "América Latina",
    countries: "Argentina, Chile, Uruguay, Paraguay, Bolivia, Perú, Colombia, México",
    time: "7–15 días hábiles",
    carrier: "Correo Argentino / OCA",
  },
  {
    region: "Estados Unidos & Canadá",
    countries: "USA, Canada",
    time: "10–20 días hábiles",
    carrier: "DHL / FedEx",
  },
  {
    region: "Europa",
    countries: "España, Italia, Francia, Alemania, Reino Unido y más",
    time: "12–22 días hábiles",
    carrier: "DHL / Correo Internacional",
  },
  {
    region: "Resto del mundo",
    countries: "Consultar disponibilidad",
    time: "Variable",
    carrier: "A coordinar",
  },
];

const faqs = [
  {
    q: "¿Cuándo se despacha mi pedido?",
    a: "Los pedidos se despachan dentro de los 2–3 días hábiles posteriores a la confirmación del pago.",
  },
  {
    q: "¿Puedo rastrear mi envío?",
    a: "Sí. Una vez despachado, te enviamos el número de seguimiento por WhatsApp o email.",
  },
  {
    q: "¿Qué pasa si hay demoras en aduana?",
    a: "Los tiempos de aduana son ajenos a Hypestyle. En caso de demoras, te acompañamos en el seguimiento.",
  },
  {
    q: "¿Los aranceles de importación están incluidos?",
    a: "No. Los impuestos de importación son responsabilidad del comprador según la normativa de cada país.",
  },
];

export default function Worldwide() {
  const ref = useReveal();

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">

        {/* Hero */}
        <section className="bg-bg-dark text-primary-foreground text-center py-28 px-6">
          <div ref={useReveal()} className="max-w-[640px] mx-auto">
            <p className="reveal rd1 text-[11px] uppercase tracking-[0.18em] text-primary-foreground/40 mb-4">
              Envíos Internacionales
            </p>
            <h1 className="reveal rd2 text-[36px] md:text-[52px] font-bold uppercase leading-none mb-6">
              Worldwide Shipping
            </h1>
            <p className="reveal rd3 text-[14px] text-primary-foreground/50 leading-relaxed">
              Llevamos Hypestyle a todo el mundo. Drops limitados, sin importar dónde estés.
            </p>
          </div>
        </section>

        {/* Zonas */}
        <section className="max-w-[1000px] mx-auto px-4 py-16 md:py-20" ref={ref}>
          <p className="reveal rd1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-10">Zonas de envío</p>
          <div className="reveal rd2 divide-y divide-border">
            {zones.map((z) => (
              <div key={z.region} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-2 md:gap-6 py-6">
                <div>
                  <p className="font-semibold text-[15px] mb-1">{z.region}</p>
                  <p className="text-[13px] text-muted-foreground">{z.countries}</p>
                </div>
                <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                  <Clock className="w-4 h-4 shrink-0" />
                  {z.time}
                </div>
                <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                  <Package className="w-4 h-4 shrink-0" />
                  {z.carrier}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Preguntas frecuentes */}
        <section className="bg-secondary/40 py-16 md:py-20 px-4">
          <div className="max-w-[720px] mx-auto">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-8">Preguntas frecuentes</p>
            <div className="space-y-8">
              {faqs.map((f) => (
                <div key={f.q}>
                  <p className="font-semibold text-[15px] mb-2">{f.q}</p>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-16 px-6">
          <Globe className="w-8 h-8 mx-auto mb-4 text-muted-foreground/40" />
          <p className="text-[14px] text-muted-foreground mb-6">¿Dudas con tu pedido internacional?</p>
          <a
            href="https://wa.me/5491100000000"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-bg-dark text-primary-foreground text-[12px] font-semibold uppercase tracking-[0.14em] px-8 py-4 hover:opacity-80 transition-opacity"
          >
            Contactanos por WhatsApp
          </a>
        </section>

      </main>
      <Footer />
    </>
  );
}
