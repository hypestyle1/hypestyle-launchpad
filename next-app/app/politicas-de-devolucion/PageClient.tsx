'use client';

import AnnouncementBar from "@/components/AnnouncementBar";
import { buttonVariants } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Blocks } from "@/components/RichText";
import FrequentlyAskedQuestions from "@/components/ui/frequently-asked-questions-with-accordion";
import { useReveal } from "@/hooks/useReveal";
import { useLocale } from "@/context/LocaleContext";
import { POLITICAS } from "@/lib/pages/politicas";

export default function Politicas() {
  const contentRef = useReveal();
  const { language } = useLocale();
  // El texto de la página vive en lib/pages/politicas.ts, un objeto por idioma.
  const c = POLITICAS[language];

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">

        {/* Título animado + acordeón */}
        <FrequentlyAskedQuestions
          resetKey={language}
          title={c.heroTitle}
          description={c.heroText}
          data={c.sections.map((s) => ({
            question: s.title,
            answer: <Blocks blocks={s.blocks} />,
          }))}
          className="pb-0 md:pb-0"
        />

        <section ref={contentRef} className="max-w-3xl mx-auto px-4 md:px-6 pb-16 md:pb-24">
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
