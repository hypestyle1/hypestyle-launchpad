import { useState } from "react";
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useReveal } from "@/hooks/useReveal";

const sections = [
  {
    title: "¿Cómo solicitar un cambio?",
    content: (
      <ol className="list-decimal list-inside space-y-2 text-[15px] leading-relaxed">
        <li>Ingresá tu número de orden y email en el formulario de cambios.</li>
        <li>Seleccioná el o los productos que querés cambiar.</li>
        <li>Elegí el método de envío: podés acercarlo a nuestras oficinas, coordinar un retiro, u optar por otra modalidad disponible.</li>
        <li>Recibís una hoja de ruta de Correo Argentino para imprimir y adjuntar al paquete.</li>
      </ol>
    ),
  },
  {
    title: "Producto con falla",
    content: (
      <div className="space-y-3 text-[15px] leading-relaxed">
        <p>Si el producto presenta una falla de fabricación, el cambio se realiza sin costo para vos.</p>
        <p>Para gestionar el cambio, contactanos preferentemente por Instagram con fotos o videos que muestren claramente el defecto. Nosotros nos encargamos del retiro y del envío del producto de reemplazo.</p>
      </div>
    ),
  },
  {
    title: "Cambios por talle",
    content: (
      <div className="space-y-3 text-[15px] leading-relaxed">
        <p>Los cambios por talle aplican únicamente para el mismo producto y están sujetos a disponibilidad de stock.</p>
        <p>El artículo debe ser devuelto en perfectas condiciones: sin uso, sin manchas, sin olores, con todas sus etiquetas y en su empaque original.</p>
        <p className="font-medium">Los costos de envío — tanto el envío hacia nosotros como el reenvío hacia vos — corren por cuenta del comprador (doble movimiento).</p>
      </div>
    ),
  },
  {
    title: "Productos en Sale / Outlet / Promociones",
    content: (
      <div className="space-y-3 text-[15px] leading-relaxed">
        <p>Los productos adquiridos en SALE, OUTLET o con descuentos especiales <strong>no tienen cambio ni devolución</strong>, salvo por falla de fabricación comprobable.</p>
      </div>
    ),
  },
  {
    title: "Drops limitados y ediciones especiales",
    content: (
      <div className="space-y-3 text-[15px] leading-relaxed">
        <p>Los drops limitados y ediciones especiales no tienen garantía de reposición.</p>
        <p>No aplica cambio ni devolución, excepto en caso de defectos de fabricación.</p>
      </div>
    ),
  },
  {
    title: "Variaciones de medidas",
    content: (
      <p className="text-[15px] leading-relaxed">
        Las prendas pueden presentar variaciones de 1 a 2 cm respecto a la tabla de talles, propias del proceso de confección. Estas variaciones no son consideradas falla de fabricación.
      </p>
    ),
  },
  {
    title: "Condiciones del producto",
    content: (
      <div className="space-y-2 text-[15px] leading-relaxed">
        <p>Para que un cambio sea aceptado, el producto debe cumplir todas estas condiciones:</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Sin uso ni desgaste visible</li>
          <li>Sin manchas ni olores</li>
          <li>Con todas sus etiquetas originales</li>
          <li>En su empaque original</li>
        </ul>
      </div>
    ),
  },
  {
    title: "Plazos",
    content: (
      <p className="text-[15px] leading-relaxed">
        Tenés hasta <strong>30 días corridos</strong> desde la fecha de compra para solicitar un cambio. Pasado ese plazo no se aceptarán solicitudes.
      </p>
    ),
  },
  {
    title: "Entregas no concretadas / Reenvíos",
    content: (
      <p className="text-[15px] leading-relaxed">
        Si el envío no pudo concretarse por dirección incorrecta o ausencia del destinatario, el costo del segundo intento de envío corre por cuenta del cliente.
      </p>
    ),
  },
  {
    title: "Costos no reembolsables",
    content: (
      <p className="text-[15px] leading-relaxed">
        Los gastos de envío originales no se devuelven bajo ningún concepto, independientemente del motivo del cambio.
      </p>
    ),
  },
  {
    title: "Canales oficiales de atención",
    content: (
      <div className="space-y-3 text-[15px] leading-relaxed">
        <p>Toda consulta o gestión debe realizarse exclusivamente a través de nuestros canales oficiales. Las cuentas personales de los integrantes del equipo no son canales válidos de atención.</p>
        <p>Canal oficial: <a href="https://instagram.com/hypestylearg" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground/70 transition-colors">@hypestylearg</a> en Instagram.</p>
      </div>
    ),
  },
  {
    title: "Sobre devoluciones de dinero",
    content: (
      <p className="text-[15px] leading-relaxed">
        Actualmente no realizamos devoluciones de dinero. Todos los casos se resuelven mediante cambio de producto.
      </p>
    ),
  },
];

function AccordionItem({ title, content, isOpen, onToggle }: {
  title: string;
  content: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-border">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-[15px] font-semibold uppercase tracking-wide pr-4 group-hover:text-foreground/70 transition-colors">
          {title}
        </span>
        <span
          className="text-xl font-light text-foreground/40 flex-shrink-0 transition-transform duration-300"
          style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
        >
          +
        </span>
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isOpen ? "600px" : "0px" }}
      >
        <div className="pb-6 text-foreground/70">
          {content}
        </div>
      </div>
    </div>
  );
}

export default function Politicas() {
  const heroRef = useReveal();
  const contentRef = useReveal();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">

        {/* Hero */}
        <section
          ref={heroRef}
          className="bg-bg-dark text-primary-foreground flex items-center justify-center text-center"
          style={{ padding: "100px 24px" }}
        >
          <div className="max-w-[680px]">
            <p className="reveal rd1 text-[11px] uppercase tracking-[0.15em] text-primary-foreground/40 mb-4">
              HYPESTYLE®
            </p>
            <h1 className="reveal rd2 text-[24px] md:text-[36px] font-semibold leading-[1.2] text-primary-foreground uppercase tracking-tight">
              Políticas de cambios,<br />devoluciones y envíos
            </h1>
            <p className="reveal rd3 text-[14px] text-primary-foreground/55 mt-6 leading-[1.8] max-w-[560px] mx-auto">
              En HYPESTYLE® trabajamos para que cada pedido llegue correctamente desde el primer envío. A continuación detallamos nuestras políticas de cambios, devoluciones y envíos. Te pedimos que las leas atentamente antes de realizar tu compra.
            </p>
          </div>
        </section>

        {/* Accordion */}
        <section ref={contentRef} className="max-w-[760px] mx-auto px-4 py-16 md:py-24">
          <div className="reveal rd1 border-t border-border">
            {sections.map((s, i) => (
              <AccordionItem
                key={s.title}
                title={s.title}
                content={s.content}
                isOpen={openIndex === i}
                onToggle={() => toggle(i)}
              />
            ))}
          </div>

          {/* Aceptación de políticas */}
          <div className="reveal rd2 mt-16 border border-border p-6 md:p-8">
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-3">
              Aceptación de políticas
            </p>
            <p className="text-[14px] leading-[1.8] text-foreground/70">
              Al realizar una compra en HYPESTYLE®, el cliente declara haber leído y aceptado todas las políticas de cambios, devoluciones y envíos aquí detalladas.
            </p>
          </div>

          {/* CTA contacto */}
          <div className="reveal rd3 mt-8 text-center">
            <p className="text-[13px] text-muted-foreground mb-4">
              ¿Tenés una consulta puntual?
            </p>
            <a
              href="https://instagram.com/hypestylearg"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-foreground text-foreground px-6 py-3 text-[12px] font-semibold uppercase tracking-wider hover:bg-foreground hover:text-background transition-all duration-200"
            >
              Contactarnos por Instagram
            </a>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
