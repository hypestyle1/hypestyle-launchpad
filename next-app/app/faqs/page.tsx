'use client';

import { useState } from "react";
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useReveal } from "@/hooks/useReveal";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    category: "Pedidos & Pagos",
    items: [
      {
        q: "¿Cómo hago un pedido?",
        a: "Elegí tu producto, seleccioná talle y color, y agregalo al carrito. Luego completá los datos de envío y elegí tu método de pago.",
      },
      {
        q: "¿Qué métodos de pago aceptan?",
        a: "Aceptamos transferencia bancaria (con 15% de descuento), MercadoPago y tarjetas de crédito/débito.",
      },
      {
        q: "¿Cuándo se confirma mi pedido?",
        a: "Una vez acreditado el pago, te confirmamos el pedido por WhatsApp o email dentro de las 24 hs.",
      },
    ],
  },
  {
    category: "Envíos",
    items: [
      {
        q: "¿Cuánto tarda el envío dentro de Argentina?",
        a: "Entre 3 y 7 días hábiles dependiendo de la provincia. CABA y GBA suelen ser más rápidos.",
      },
      {
        q: "¿Hacen envíos internacionales?",
        a: "Sí, enviamos a todo el mundo. Consultá los tiempos y costos en nuestra página de Envíos Internacionales.",
      },
      {
        q: "¿Puedo rastrear mi pedido?",
        a: "Sí. Una vez despachado te mandamos el número de seguimiento por WhatsApp.",
      },
    ],
  },
  {
    category: "Productos & Talles",
    items: [
      {
        q: "¿Cómo sé qué talle elegir?",
        a: "Cada producto tiene una guía de talles en la página de producto. Si tenés dudas, escribinos por WhatsApp.",
      },
      {
        q: "¿Los productos son limitados?",
        a: "Sí. Lanzamos drops con stock limitado. Una vez agotado un talle, no se repone hasta el próximo drop.",
      },
      {
        q: "¿Cómo cuido mis prendas?",
        a: "Lavado a mano o máquina en frío, del revés. No usar secadora. Ver las instrucciones de cuidado específicas en cada producto.",
      },
    ],
  },
  {
    category: "Devoluciones & Cambios",
    items: [
      {
        q: "¿Puedo cambiar mi pedido?",
        a: "Aceptamos cambios dentro de los 10 días de recibido el producto, siempre que esté sin uso y con etiquetas. Consultá nuestra política de devoluciones.",
      },
      {
        q: "¿Qué hago si recibí un producto defectuoso?",
        a: "Escribinos de inmediato a nuestro WhatsApp o Instagram con fotos del problema. Lo resolvemos.",
      },
    ],
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4"
      >
        <span className="text-[14px] font-medium">{q}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <p className="text-[13px] text-muted-foreground leading-relaxed pb-5">{a}</p>
      )}
    </div>
  );
}

export default function FAQs() {
  const ref = useReveal();

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">

        {/* Hero */}
        <section className="bg-bg-dark text-primary-foreground text-center py-28 px-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/40 mb-4">Ayuda</p>
          <h1 className="text-[36px] md:text-[52px] font-bold uppercase leading-none">FAQs</h1>
        </section>

        {/* Preguntas */}
        <section className="max-w-[720px] mx-auto px-4 py-16 md:py-20" ref={ref}>
          {faqs.map((cat, i) => (
            <div key={cat.category} className={`reveal rd${i + 1} mb-12`}>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">{cat.category}</p>
              {cat.items.map((item) => (
                <FaqItem key={item.q} {...item} />
              ))}
            </div>
          ))}
        </section>

        {/* CTA */}
        <section className="text-center pb-16 px-6">
          <p className="text-[14px] text-muted-foreground mb-6">¿No encontrás lo que buscás?</p>
          <a
            href="/contacto/"
            className="inline-block bg-bg-dark text-primary-foreground text-[12px] font-semibold uppercase tracking-[0.14em] px-8 py-4 hover:opacity-80 transition-opacity"
          >
            Contactanos
          </a>
        </section>

      </main>
      <Footer />
    </>
  );
}
