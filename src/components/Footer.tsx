import { useState } from "react";
import { Instagram } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";

const shopLinks = [
  { label: "Tees", href: "/us/tees/" },
  { label: "Hoodies", href: "/us/hoodies/" },
  { label: "Sets", href: "/us/sets/" },
  { label: "Accesorios", href: "/us/accesorios/" },
  { label: "Ver todo", href: "/productos/" },
];

const infoLinks = [
  { label: "Envíos internacionales", href: "/worldwide/" },
  { label: "Devoluciones", href: "/politicas-de-devolucion/" },
  { label: "FAQs", href: "/faqs/" },
  { label: "Contacto", href: "/contacto/" },
];

const payMethods = ["VISA", "MASTERCARD", "AMEX", "MERCADOPAGO", "DÉBITO"];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const ref = useReveal();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubmitted(true);
  };

  return (
    <footer className="bg-bg-dark text-primary-foreground" ref={ref}>
      {/* Newsletter */}
      <div className="reveal rd1 max-w-[1400px] mx-auto px-4 py-14 md:py-20 border-b border-primary-foreground/10">
        <div className="max-w-md">
          <h3 className="text-2xl md:text-3xl font-bold mb-2">Enterate primero.</h3>
          <p className="text-primary-foreground/50 text-sm mb-6">
            Drops, restocks y acceso anticipado. Sin spam.
          </p>
          <form onSubmit={handleSubmit} className="flex">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="flex-1 bg-transparent border border-primary-foreground/20 px-4 py-3 text-[13px] text-primary-foreground placeholder:text-primary-foreground/30 focus:outline-none focus:border-primary-foreground/50 transition-colors"
              required
            />
            <button
              type="submit"
              className={`px-6 py-3 text-[12px] font-semibold uppercase tracking-wider transition-colors ${
                submitted
                  ? "bg-primary-foreground/20 text-primary-foreground/60"
                  : "bg-primary-foreground text-bg-dark hover:bg-primary-foreground/90"
              }`}
              disabled={submitted}
            >
              {submitted ? "✓ Suscripto" : "Suscribirse"}
            </button>
          </form>
        </div>
      </div>

      {/* Columns */}
      <div className="reveal rd2 max-w-[1400px] mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <img src="/STYLE&CULTURE WHITE.png" alt="Style&Culture" className="h-6 w-auto object-contain mb-3" />
          <p className="text-[12px] text-primary-foreground/50 leading-relaxed mb-4">
            Streetwear desde Buenos Aires. Drops limitados. Envíos a todo el mundo.
          </p>
          <div className="flex gap-3">
            <a href="https://instagram.com/hypestylearg" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <Instagram className="w-5 h-5 text-primary-foreground/50 hover:text-primary-foreground transition-colors" />
            </a>
            <a href="#" aria-label="TikTok" className="text-primary-foreground/50 hover:text-primary-foreground transition-colors text-[13px] font-medium">
              TikTok
            </a>
            <a href="#" aria-label="Facebook" className="text-primary-foreground/50 hover:text-primary-foreground transition-colors text-[13px] font-medium">
              FB
            </a>
          </div>
        </div>

        {/* Shop */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary-foreground/40 mb-4">Shop</p>
          {shopLinks.map((l) => (
            <a key={l.label} href={l.href} className="block text-[13px] text-primary-foreground/60 hover:text-primary-foreground transition-colors mb-2">
              {l.label}
            </a>
          ))}
        </div>

        {/* Info */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary-foreground/40 mb-4">Info</p>
          {infoLinks.map((l) => (
            <a key={l.label} href={l.href} className="block text-[13px] text-primary-foreground/60 hover:text-primary-foreground transition-colors mb-2">
              {l.label}
            </a>
          ))}
        </div>

        {/* Seguinos */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary-foreground/40 mb-4">Seguinos</p>
          <a href="https://instagram.com/hypestylearg" target="_blank" rel="noopener noreferrer" className="block text-[13px] text-primary-foreground/60 hover:text-primary-foreground transition-colors mb-2">
            @hypestylearg
          </a>
          <a href="#" className="block text-[13px] text-primary-foreground/60 hover:text-primary-foreground transition-colors mb-2">
            TikTok
          </a>
          <a href="#" className="block text-[13px] text-primary-foreground/60 hover:text-primary-foreground transition-colors mb-2">
            Facebook
          </a>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-[1400px] mx-auto px-4 py-6 border-t border-primary-foreground/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-[11px] text-primary-foreground/30">
          © 2026 Hypestyle. Buenos Aires, Argentina.
        </p>
        <div className="flex flex-wrap gap-2">
          {payMethods.map((m) => (
            <span key={m} className="text-[10px] font-medium uppercase tracking-wider text-primary-foreground/30 border border-primary-foreground/10 px-2.5 py-1">
              {m}
            </span>
          ))}
        </div>
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
