'use client';

import { useState } from "react";
import AnnouncementBar from "@/components/AnnouncementBar";
import { buttonVariants } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useReveal } from "@/hooks/useReveal";

const sections = [
  {
    title: "¿Qué información recolectamos?",
    content: (
      <div className="space-y-3 text-[15px] leading-relaxed">
        <p>Cuando comprás en HYPESTYLE® o interactuás con nuestros canales de atención, podemos recolectar:</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Datos de contacto: nombre, email, teléfono, dirección de envío y facturación.</li>
          <li>Datos de la compra: productos, talles, montos, método de pago (no almacenamos números de tarjeta; eso lo procesa directamente la pasarela de pago).</li>
          <li>Mensajes que nos enviás por WhatsApp, Instagram o el formulario de contacto, incluyendo imágenes, audios o documentos que compartas para resolver tu consulta.</li>
          <li>Datos de navegación en el sitio (páginas visitadas, dispositivo, cookies) a través de Meta Pixel y herramientas de analítica.</li>
        </ul>
      </div>
    ),
  },
  {
    title: "¿Para qué usamos tu información?",
    content: (
      <div className="space-y-3 text-[15px] leading-relaxed">
        <p>Usamos tus datos exclusivamente para:</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Procesar, preparar y despachar tu pedido.</li>
          <li>Responder tus consultas de atención al cliente, incluyendo a través de nuestro asistente automatizado de WhatsApp/Instagram.</li>
          <li>Enviarte notificaciones sobre el estado de tu compra (confirmación, envío, entrega).</li>
          <li>Mejorar nuestras campañas publicitarias en Meta (Facebook/Instagram) mediante datos agregados y anónimos de navegación.</li>
          <li>Enviarte comunicaciones de marketing por email, solo si diste tu consentimiento (podés darte de baja en cualquier momento).</li>
        </ul>
        <p>No vendemos tu información personal a terceros.</p>
      </div>
    ),
  },
  {
    title: "Asistente automatizado (WhatsApp / Instagram)",
    content: (
      <div className="space-y-3 text-[15px] leading-relaxed">
        <p>Parte de nuestra atención al cliente por WhatsApp e Instagram es gestionada por un asistente automatizado que utiliza inteligencia artificial (Anthropic Claude) para responder consultas frecuentes: estado de pedidos, stock, talles y productos.</p>
        <p>Si nos escribís una imagen, audio o documento (por ejemplo, para reportar una falla o un comprobante), esos archivos se procesan automáticamente para poder darte una respuesta, mediante servicios de terceros (Anthropic y OpenAI para transcripción de audio). No los usamos con ningún otro fin ni los compartimos fuera de ese proceso.</p>
        <p>Si tu consulta requiere intervención humana, el asistente deriva la conversación a una persona del equipo.</p>
      </div>
    ),
  },
  {
    title: "¿Con quién compartimos tus datos?",
    content: (
      <div className="space-y-3 text-[15px] leading-relaxed">
        <p>Para poder operar la tienda, compartimos información puntual con proveedores que nos prestan servicio, únicamente en la medida necesaria para cumplir su función:</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Pasarelas de pago (Mercado Pago, PayPal, Getnet, Talo Pay) para procesar tu compra.</li>
          <li>Correo Argentino / Andreani para la logística de envío.</li>
          <li>Meta (Facebook/Instagram/WhatsApp) para publicidad y para el funcionamiento de nuestros canales de atención.</li>
          <li>Proveedores de email transaccional (Brevo) para mandarte confirmaciones y novedades de tu pedido.</li>
          <li>Proveedores de inteligencia artificial (Anthropic, OpenAI) para el funcionamiento del asistente de atención automatizado.</li>
        </ul>
        <p>Todos estos proveedores tienen sus propias políticas de privacidad y solo acceden a los datos estrictamente necesarios para prestar su servicio.</p>
      </div>
    ),
  },
  {
    title: "Cookies y Meta Pixel",
    content: (
      <p className="text-[15px] leading-relaxed">
        Nuestro sitio usa cookies propias y de terceros, incluyendo Meta Pixel, para entender cómo se navega el sitio y medir el rendimiento de nuestras campañas publicitarias. Podés gestionar tus preferencias de cookies desde el banner que aparece al ingresar al sitio, o desde la configuración de tu navegador.
      </p>
    ),
  },
  {
    title: "¿Cuánto tiempo conservamos tus datos?",
    content: (
      <p className="text-[15px] leading-relaxed">
        Conservamos los datos de tus compras mientras sea necesario para cumplir obligaciones legales, impositivas y de garantía. Las conversaciones de atención al cliente se conservan por un tiempo razonable para poder darte seguimiento a futuras consultas relacionadas con tu compra.
      </p>
    ),
  },
  {
    title: "Tus derechos",
    content: (
      <div className="space-y-3 text-[15px] leading-relaxed">
        <p>De acuerdo con la Ley 25.326 de Protección de Datos Personales de Argentina, tenés derecho a acceder, rectificar, actualizar o solicitar la eliminación de tus datos personales.</p>
        <p>La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que se interpongan con relación al incumplimiento de las normas sobre protección de datos personales.</p>
        <p>Para ejercer estos derechos, escribinos por nuestro canal oficial: <a href="https://instagram.com/hypestylearg" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground/70 transition-colors">@hypestylearg</a> en Instagram.</p>
      </div>
    ),
  },
  {
    title: "Menores de edad",
    content: (
      <p className="text-[15px] leading-relaxed">
        Nuestros productos y servicios están dirigidos a personas mayores de 18 años. No recolectamos intencionalmente datos de menores de edad sin el consentimiento de sus padres o tutores.
      </p>
    ),
  },
  {
    title: "Cambios en esta política",
    content: (
      <p className="text-[15px] leading-relaxed">
        Podemos actualizar esta política de privacidad ocasionalmente para reflejar cambios en nuestras prácticas o por motivos legales u operativos. La fecha de última actualización figura al pie de esta página.
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

export default function PoliticaDePrivacidad() {
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
              Política de privacidad
            </h1>
            <p className="reveal rd3 text-[14px] text-primary-foreground/55 mt-6 leading-[1.8] max-w-[560px] mx-auto">
              En HYPESTYLE® respetamos tu privacidad. Acá te contamos qué información recolectamos, cómo la usamos y qué derechos tenés sobre ella.
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

          {/* Fecha de actualización */}
          <div className="reveal rd2 mt-16 border border-border p-6 md:p-8">
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-3">
              Última actualización
            </p>
            <p className="text-[14px] leading-[1.8] text-foreground/70">
              Julio de 2026.
            </p>
          </div>

          {/* CTA contacto */}
          <div className="reveal rd3 mt-8 text-center">
            <p className="text-[13px] text-muted-foreground mb-4">
              ¿Tenés una consulta sobre tus datos personales?
            </p>
            <a
              href="https://instagram.com/hypestylearg"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'hypeOutline', size: 'cta' })}
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
