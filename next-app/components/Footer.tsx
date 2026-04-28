'use client';

import { useState } from "react";
import Link from "next/link";
import { useReveal } from "@/hooks/useReveal";

const shopLinks = [
  { label: "Arriba",     href: "/arriba/" },
  { label: "Abajo",      href: "/abajo/" },
  { label: "Accesorios", href: "/accesorios/" },
  { label: "Sets",       href: "/sets/" },
  { label: "Ver todo",   href: "/productos/" },
];

const infoLinks = [
  { label: "Envíos internacionales", href: "/worldwide/" },
  { label: "Devoluciones", href: "/politicas-de-devolucion/" },
  { label: "FAQs", href: "/faqs/" },
  { label: "Contacto", href: "/contacto/" },
];

const rrssLinks = [
  { label: "Instagram", href: "https://instagram.com/hypestylearg" },
  { label: "TikTok", href: "https://tiktok.com/@hypestyle" },
  { label: "YouTube", href: "https://youtube.com/@hypestyle" },
  { label: "Facebook", href: "https://facebook.com/hypestylearg" },
  { label: "WhatsApp", href: "https://wa.me/" },
];

const languages = ["ES", "EN", "PT", "DE", "FR", "IT"];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [activeLang, setActiveLang] = useState("ES");
  const ref = useReveal();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubmitted(true);
  };

  return (
    <footer className="bg-bg-dark text-primary-foreground" ref={ref}>

      {/* Newsletter + columnas — mismo nivel como EME */}
      <div className="reveal rd1 max-w-[1400px] mx-auto px-4 pt-16 pb-12 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-12 border-b border-primary-foreground/10">

        {/* Newsletter + Brand */}
        <div className="flex flex-col justify-between gap-10">
          {/* Newsletter */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/40 mb-3">Newsletter</p>
            <h3 className="text-[18px] md:text-[22px] font-bold uppercase leading-snug mb-1">
              Suscribite y obtené un 10% de descuento
            </h3>
            <p className="text-[11px] text-primary-foreground/35 mb-6">
              *No es acumulable con otras promociones
            </p>

            {submitted ? (
              <p className="text-[13px] text-primary-foreground/50">✓ ¡Listo! Ya sos parte del círculo.</p>
            ) : (
              <form onSubmit={handleSubmit} className="flex border-b border-primary-foreground/30 focus-within:border-primary-foreground transition-colors max-w-sm">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="flex-1 bg-transparent py-3 text-[13px] text-primary-foreground placeholder:text-primary-foreground/25 focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  className="text-[12px] font-semibold uppercase tracking-wider text-primary-foreground/60 hover:text-primary-foreground transition-colors px-2 py-3"
                >
                  →
                </button>
              </form>
            )}
          </div>

          {/* Brand */}
          <div>
            <img src="/STYLE&CULTURE WHITE.png" alt="Style&Culture" className="h-6 w-auto object-contain object-left mb-3" />
            <p className="text-[12px] text-primary-foreground/50 leading-relaxed">
              Streetwear desde Buenos Aires. Drops limitados.<br />Envíos a todo el mundo.
            </p>
          </div>
        </div>

        {/* Columnas */}
        <div className="grid grid-cols-3 gap-8">
          {/* Shop */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary-foreground/30 mb-4">Shop</p>
            {shopLinks.map((l) => (
              <Link key={l.label} href={l.href}
                className="block text-[12px] text-primary-foreground/55 hover:text-primary-foreground transition-colors mb-2.5">
                {l.label}
              </Link>
            ))}
          </div>

          {/* Info */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary-foreground/30 mb-4">Info</p>
            {infoLinks.map((l) => (
              <Link key={l.label} href={l.href}
                className="block text-[12px] text-primary-foreground/55 hover:text-primary-foreground transition-colors mb-2.5">
                {l.label}
              </Link>
            ))}
          </div>

          {/* RRSS — única aparición */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary-foreground/30 mb-4">RRSS</p>
            {rrssLinks.map((l) => (
              <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                className="block text-[12px] text-primary-foreground/55 hover:text-primary-foreground transition-colors mb-2.5">
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-[1400px] mx-auto px-4 py-6 flex flex-col items-center gap-3">
        {/* Selector de idioma */}
        <div className="flex items-center gap-4">
          {languages.map((lang, i) => (
            <span key={lang} className="flex items-center gap-4">
              <button
                onClick={() => setActiveLang(lang)}
                className={`text-[11px] uppercase tracking-[0.12em] transition-colors ${
                  activeLang === lang
                    ? "text-primary-foreground font-semibold"
                    : "text-primary-foreground/30 hover:text-primary-foreground/60"
                }`}
              >
                {lang}
              </button>
              {i < languages.length - 1 && (
                <span className="text-primary-foreground/15 text-[10px]">·</span>
              )}
            </span>
          ))}
        </div>

        <p className="text-[11px] text-primary-foreground/25">
          © 2026 Hypestyle. Buenos Aires, Argentina.
        </p>
      </div>


      {/* Easter egg */}
      <div className="relative overflow-hidden pb-4">
        <p className="text-[120px] md:text-[200px] lg:text-[280px] font-bold uppercase tracking-tighter text-primary-foreground/[0.03] leading-none text-center select-none whitespace-nowrap">
          HYPESTYLE
        </p>
      </div>

    </footer>
  );
}
