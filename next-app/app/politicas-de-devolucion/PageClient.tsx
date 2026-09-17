'use client';

import { useState } from "react";
import AnnouncementBar from "@/components/AnnouncementBar";
import { buttonVariants } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Blocks } from "@/components/RichText";
import { useReveal } from "@/hooks/useReveal";
import { useLocale } from "@/context/LocaleContext";
import { POLITICAS } from "@/lib/pages/politicas";

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
  const { language } = useLocale();
  // El texto de la página vive en lib/pages/politicas.ts, un objeto por idioma.
  const c = POLITICAS[language];

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
              {c.heroTitle}
            </h1>
            <p className="reveal rd3 text-[14px] text-primary-foreground/55 mt-6 leading-[1.8] max-w-[560px] mx-auto">
              {c.heroText}
            </p>
          </div>
        </section>

        {/* Accordion */}
        <section ref={contentRef} className="max-w-[760px] mx-auto px-4 py-16 md:py-24">
          <div className="reveal rd1 border-t border-border">
            {c.sections.map((s, i) => (
              <AccordionItem
                key={i}
                title={s.title}
                content={<Blocks blocks={s.blocks} />}
                isOpen={openIndex === i}
                onToggle={() => toggle(i)}
              />
            ))}
          </div>

          {/* Aceptación de políticas */}
          <div className="reveal rd2 mt-16 border border-border p-6 md:p-8">
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-3">
              {c.acceptanceLabel}
            </p>
            <p className="text-[14px] leading-[1.8] text-foreground/70">
              {c.acceptanceText}
            </p>
          </div>

          {/* CTA contacto */}
          <div className="reveal rd3 mt-8 text-center">
            <p className="text-[13px] text-muted-foreground mb-4">
              {c.ctaQuestion}
            </p>
            <a
              href="https://instagram.com/hypestylearg"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'hypeOutline', size: 'cta' })}
            >
              {c.ctaButton}
            </a>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
