'use client';

import { useState } from "react";
import AnnouncementBar from "@/components/AnnouncementBar";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useReveal } from "@/hooks/useReveal";
import { useLocale } from "@/context/LocaleContext";
import { FAQS } from "@/lib/pages/faqs";
import { ChevronDown } from "lucide-react";

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
  const { language } = useLocale();
  // Las preguntas viven en lib/pages/faqs.ts, un objeto por idioma.
  const c = FAQS[language];

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">

        {/* Hero */}
        <section className="bg-bg-dark text-primary-foreground text-center py-28 px-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/40 mb-4">{c.heroLabel}</p>
          <h1 className="text-[36px] md:text-[52px] font-bold uppercase leading-none">{c.heroTitle}</h1>
        </section>

        {/* Preguntas */}
        <section className="max-w-[720px] mx-auto px-4 py-16 md:py-20" ref={ref}>
          {c.categories.map((cat, i) => (
            <div key={i} className={`reveal rd${i + 1} mb-12`}>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">{cat.category}</p>
              {cat.items.map((item, j) => (
                // La clave lleva el idioma para que el acordeón se cierre al cambiarlo.
                <FaqItem key={`${language}-${i}-${j}`} {...item} />
              ))}
            </div>
          ))}
        </section>

        {/* CTA */}
        <section className="text-center pb-16 px-6">
          <p className="text-[14px] text-muted-foreground mb-6">{c.ctaQuestion}</p>
          <Button asChild variant="hype" size="ctaLg">
            <a href="/contacto/">{c.ctaButton}</a>
          </Button>
        </section>

      </main>
      <Footer />
    </>
  );
}
