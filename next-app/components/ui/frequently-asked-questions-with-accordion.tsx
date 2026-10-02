'use client';

import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

export interface FAQItem {
  question: string;
  // Admite texto plano o bloques ya pintados (párrafos, listas, links).
  answer: ReactNode;
}

interface FrequentlyAskedQuestionsProps {
  title: string;
  description?: string;
  data: FAQItem[];
  className?: string;
  /** Texto o links que van pegados al final de la descripción (ej. canales de contacto). */
  contact?: ReactNode;
  /** Cambia la clave para que el acordeón se cierre y la animación corra de nuevo (ej. al cambiar de idioma). */
  resetKey?: string;
}

// Título con las palabras entrando una por una, descripción y acordeón con
// stagger. Adaptado a la estética de Hype: mayúsculas, tracking apretado,
// sin radios, bordes de 1px.
export default function FrequentlyAskedQuestions({
  title,
  description,
  data,
  className,
  contact,
  resetKey = '',
}: FrequentlyAskedQuestionsProps) {
  const words = title.split(' ');

  return (
    <section className={cn('relative w-full overflow-hidden py-20 md:py-28', className)}>
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <h1
          key={`title-${resetKey}`}
          className="relative z-10 mx-auto max-w-4xl text-center text-[28px] font-semibold uppercase leading-[1.1] tracking-tight text-foreground md:text-[44px] lg:text-[52px]"
        >
          {words.map((word, index) => (
            <motion.span
              key={`${word}-${index}`}
              initial={{ opacity: 0, filter: 'blur(6px)', y: 12 }}
              whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeInOut' }}
              className="mr-[0.28em] inline-block"
            >
              {word}
            </motion.span>
          ))}
        </h1>

        {(description || contact) && (
          <motion.p
            key={`desc-${resetKey}`}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="relative z-10 mx-auto mt-6 max-w-2xl text-center text-[14px] leading-[1.8] text-muted-foreground md:text-[15px]"
          >
            {description}
            {contact && <> {contact}</>}
          </motion.p>
        )}

        <motion.div
          key={`list-${resetKey}`}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-12 md:mt-14"
        >
          <Accordion type="single" collapsible className="w-full border-t border-border">
            {data.map((item, index) => (
              <motion.div
                key={`faq-${index}`}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: 0.5 + index * 0.07, ease: 'easeOut' }}
              >
                <AccordionItem value={`item-${index}`} className="border-border">
                  {/* El chevron del trigger de shadcn se oculta y se usa un "+" que gira a "x" al abrir. */}
                  <AccordionTrigger className="gap-4 py-5 text-left text-[15px] font-semibold uppercase tracking-wide hover:no-underline hover:text-foreground/70 [&>.lucide-chevron-down]:hidden [&[data-state=open]>.faq-plus]:rotate-45 [&[data-state=open]]:underline [&[data-state=open]]:underline-offset-4">
                    {item.question}
                    <Plus className="faq-plus h-4 w-4 shrink-0 text-foreground/40 transition-transform duration-300" strokeWidth={1.5} />
                  </AccordionTrigger>
                  <AccordionContent className="pb-5">
                    <div className="border border-border bg-bg-alt px-5 py-4 text-foreground/70 md:px-6 md:py-5">
                      {item.answer}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
