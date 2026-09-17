'use client';

import { useState } from "react";
import AnnouncementBar from "@/components/AnnouncementBar";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useReveal } from "@/hooks/useReveal";
import { useLocale } from "@/context/LocaleContext";
import { CONTACTO } from "@/lib/pages/contacto";
import { MessageCircle, Mail, Sparkles } from "lucide-react";

// Ícono y destino de cada canal, en el mismo orden que `channels` del contenido.
const CHANNEL_LINKS = [
  { icon: MessageCircle, href: "https://wa.me/5491178292430" },
  { icon: Mail, href: "mailto:hypestylearg@gmail.com" },
  { icon: Sparkles, href: "/creadores/" },
];

export default function Contacto() {
  const [form, setForm] = useState({ nombre: "", email: "", mensaje: "" });
  const [sent, setSent] = useState(false);
  const ref = useReveal();
  const { language } = useLocale();
  // Los textos viven en lib/pages/contacto.ts, un objeto por idioma.
  const c = CONTACTO[language];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">

        {/* Hero */}
        <section className="bg-bg-dark text-primary-foreground text-center py-28 px-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/40 mb-4">{c.heroLabel}</p>
          <h1 className="text-[36px] md:text-[52px] font-bold uppercase leading-none mb-4">{c.heroTitle}</h1>
          <p className="text-[14px] text-primary-foreground/40">{c.heroText}</p>
        </section>

        {/* Formulario */}
        <section className="bg-secondary/30 py-16 md:py-20 px-4">
          <div className="max-w-[560px] mx-auto">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-8">{c.formLabel}</p>

            {sent ? (
              <div className="text-center py-12">
                <p className="text-[22px] font-semibold mb-2">{c.thanksTitle}</p>
                <p className="text-[14px] text-muted-foreground">{c.thanksText}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-2">{c.nameLabel}</label>
                  <input
                    type="text"
                    required
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full bg-transparent border-b border-border py-3 text-[14px] focus:outline-none focus:border-foreground transition-colors"
                    placeholder={c.namePlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-2">{c.emailLabel}</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-transparent border-b border-border py-3 text-[14px] focus:outline-none focus:border-foreground transition-colors"
                    placeholder={c.emailPlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-2">{c.messageLabel}</label>
                  <textarea
                    required
                    rows={5}
                    value={form.mensaje}
                    onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                    className="w-full bg-transparent border-b border-border py-3 text-[14px] focus:outline-none focus:border-foreground transition-colors resize-none"
                    placeholder={c.messagePlaceholder}
                  />
                </div>
                <Button type="submit" variant="hype" size="ctaFull">
                  {c.submit}
                </Button>
              </form>
            )}
          </div>
        </section>

        {/* Canales */}
        <section className="max-w-[1000px] mx-auto px-4 py-16 md:py-20" ref={ref}>
          <p className="reveal rd1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-10">{c.channelsLabel}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {c.channels.map(({ label, description, action }, i) => {
              const { icon: Icon, href } = CHANNEL_LINKS[i];
              return (
                <a
                  key={i}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className={`reveal rd${i + 2} group block bg-secondary/40 hover:bg-secondary transition-colors p-8 rounded-sm`}
                >
                  <Icon className="w-6 h-6 mb-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <p className="font-semibold text-[15px] mb-2">{label}</p>
                  <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">{description}</p>
                  <span className="text-[12px] font-semibold uppercase tracking-[0.12em] underline underline-offset-4">
                    {action}
                  </span>
                </a>
              );
            })}
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
