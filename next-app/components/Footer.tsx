'use client';

import { useState } from "react";
import Link from "next/link";
import { useReveal } from "@/hooks/useReveal";
import { useLocale, LANGUAGES } from "@/context/LocaleContext";
import { CURRENCIES } from "@/lib/currency";
import { CANAL_OFICIAL } from "@/lib/cyber-whatsapp";
import { altaNewsletter, mensajeError, MENSAJES_EXITO, type MotivoAlta } from "@/lib/newsletter-cliente";
import { STORAGE } from "@/lib/newsletter-popup";

// Rediseño 2026: el Shop del footer habla la misma arquitectura que el mega
// menú (prendas directas), e "Info" se parte en POLÍTICAS (lo legal/ayuda) y
// GENERAL (la marca) — mezclados no se encontraba nada.
const shopLinks = [
  { label: "New In",      href: "/new-in" },
  { label: "Remeras",     href: "/tees" },
  { label: "Hoodies",     href: "/hoodies" },
  { label: "Longsleeves", href: "/longsleeves" },
  { label: "Pantalones",  href: "/pants" },
  { label: "Jorts",       href: "/jorts" },
  { label: "Conjuntos",   href: "/sets" },
  { label: "Accesorios",  href: "/accesorios" },
  { label: "Gift Card",   href: "/gift-cards" },
  { label: "SALE",        href: "/special-prices" },
  // Arriba y Abajo salieron del menú con el rediseño (#558) pero tienen
  // tráfico orgánico propio: el footer las mantiene enlazadas sin sumar al menú.
  { label: "Prendas de arriba", href: "/arriba" },
  { label: "Prendas de abajo",  href: "/abajo" },
  { label: "Ver todo",    href: "/productos" },
];

const generalLinks = [
  { label: "Colecciones", href: "/colecciones" },
  { label: "Colaboraciones", href: "/colaboraciones" },
  { label: "Reseñas", href: "/reviews" },
  { label: "Quiénes Somos", href: "/nosotros" },
  { label: "Contacto", href: "/contacto" },
];

const politicasLinks = [
  { label: "Envíos internacionales", href: "/worldwide" },
  { label: "Cambios y devoluciones", href: "/politicas-de-devolucion" },
  { label: "Privacidad", href: "/politica-de-privacidad" },
  { label: "FAQs", href: "/faqs" },
];

// Las dos puertas de entrada para trabajar con la marca. Van juntas y en su
// propia columna: no son links de tienda ni de ayuda, son propuestas.
const trabajaLinks = [
  { label: "Crea contenido con Hype", href: "/creadores" },
  { label: "Sumá Hype a tu local", href: "/mayoristas/como-funciona" },
];

// Las dos entradas de WhatsApp son cosas distintas y por eso están separadas:
// "Canal" es la difusión — drops y avisos, sin que nadie vea el número de
// nadie — y "WhatsApp" es el chat de atención de siempre. El canal nació con
// CYBER HYPE (28/10/2026) pero es de la marca: queda en el footer después del
// evento, cuando los bloques de campaña ya no se rendericen. La URL sale de
// lib/cyber-whatsapp para no tener dos copias del mismo enlace.
const rrssLinks = [
  { label: "Instagram", href: "https://instagram.com/hypestylearg" },
  { label: "Canal de WhatsApp", href: CANAL_OFICIAL },
  { label: "TikTok", href: "https://tiktok.com/@hypestyle" },
  { label: "YouTube", href: "https://www.youtube.com/@hypestylearg" },
  { label: "Facebook", href: "https://facebook.com/hypestylearg" },
  { label: "WhatsApp", href: "https://wa.me/5491178292430" },
];

// Sale de LocaleContext: antes era una lista propia con DE/FR/IT, idiomas que
// el sitio no traduce — se mostraban en el selector y clickearlos no hacía nada.
const languages = LANGUAGES;

// Un link del footer: externo abre en pestaña nueva, interno va por <Link>.
// Lo usan el acordeón mobile y la grilla desktop, así el estilo es uno solo.
function FooterLink({ link, t }: { link: { label: string; href: string }; t: (s: string) => string }) {
  const cls = "block text-[12px] text-primary-foreground/55 hover:text-primary-foreground transition-colors mb-2.5";
  return link.href.startsWith("http") ? (
    <a href={link.href} target="_blank" rel="noopener noreferrer" className={cls}>{t(link.label)}</a>
  ) : (
    <Link href={link.href} className={cls}>{t(link.label)}</Link>
  );
}

export default function Footer() {
  const [email, setEmail] = useState("");
  // Antes era `submitted` y se ponía en true sin llamar a la API (#625): el
  // footer decía "listo" y el mail nunca llegaba a Brevo. Ahora "listo" sale
  // solo de una respuesta confirmada del servidor.
  const [estado, setEstado] = useState<'idle' | 'enviando' | MotivoAlta>('idle');
  const { language, setLanguage, currency, setCurrency, t } = useLocale();
  const ref = useReveal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (estado === 'enviando' || !email.trim()) return;
    setEstado('enviando');
    const { ok, motivo } = await altaNewsletter({ email, origen: 'footer' });
    // Igual que el popup: con el alta confirmada, el popup no vuelve a pedirle el mail.
    if (ok) { try { localStorage.setItem(STORAGE.subscribed, '1'); } catch {} }
    setEstado(motivo);
  };

  const exito = estado === 'alta' || estado === 'ya-suscripto';
  const error = estado === 'idle' || estado === 'enviando' ? null : mensajeError(estado);

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
              {t('Suscribite y obtené un 10% de descuento')}
            </h3>
            <p className="text-[11px] text-primary-foreground/35 mb-6">
              {t('*No es acumulable con otras promociones')}
            </p>

            {exito ? (
              <p aria-live="polite" data-testid="footer-newsletter-ok" className="text-[13px] text-primary-foreground/70">
                {t(MENSAJES_EXITO[estado as keyof typeof MENSAJES_EXITO])}
              </p>
            ) : (
              <>
                <form onSubmit={handleSubmit} aria-label="Newsletter" className="flex border-b border-primary-foreground/30 focus-within:border-primary-foreground transition-colors max-w-sm">
                  <input
                    type="email"
                    value={email}
                    // Al corregir el mail, el error de antes ya no aplica.
                    onChange={(e) => { setEmail(e.target.value); if (error) setEstado('idle'); }}
                    placeholder="tu@email.com"
                    aria-label={t('Tu email')}
                    aria-invalid={estado === 'email-invalido'}
                    aria-describedby={error ? 'footer-newsletter-error' : undefined}
                    autoComplete="email"
                    className="flex-1 min-w-0 bg-transparent py-3 text-[16px] md:text-[13px] text-primary-foreground placeholder:text-primary-foreground/25 focus:outline-none"
                    required
                  />
                  <button
                    type="submit"
                    disabled={estado === 'enviando'}
                    aria-label={estado === 'enviando' ? t('Enviando') : t('Suscribirme')}
                    className="min-w-[44px] text-[12px] font-semibold uppercase tracking-wider text-primary-foreground/60 hover:text-primary-foreground transition-colors px-2 py-3 disabled:opacity-50 disabled:cursor-wait"
                  >
                    {estado === 'enviando' ? '…' : '→'}
                  </button>
                </form>
                {error && (
                  <p id="footer-newsletter-error" role="alert" className="mt-2.5 max-w-sm text-[12px] text-primary-foreground/80">
                    {t(error)}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Brand */}
          <div>
            <img src="/STYLE&CULTURE WHITE.png" alt="STYLE&CULTURE" className="h-6 w-auto object-contain object-left mb-3" />
            <p className="text-[12px] text-primary-foreground/50 leading-relaxed">
              {t('Streetwear desde Buenos Aires. Drops limitados.')}<br />{t('Envíos a todo el mundo.')}
            </p>
          </div>
        </div>

        {/* Columnas — en mobile las 3 columnas no entran en 360px (se apilan
            palabras cortadas), así que van como acordeón cerrado por defecto:
            un renglón por sección, se abre al tocar. Desde md, grilla de 3. */}
        <div className="md:hidden -mt-2 border-y border-primary-foreground/10 divide-y divide-primary-foreground/10">
          {[
            { title: 'Shop', links: shopLinks },
            { title: 'General', links: generalLinks },
            { title: 'Políticas', links: politicasLinks },
            { title: 'Trabajá con Hype', links: trabajaLinks },
            { title: 'RRSS', links: rrssLinks },
          ].map((col) => (
            <details key={col.title} className="group">
              <summary className="flex items-center justify-between py-4 text-[11px] font-bold uppercase tracking-[0.15em] text-primary-foreground/60 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
                {t(col.title)}
                <span aria-hidden className="text-primary-foreground/40 text-[18px] leading-none transition-transform duration-200 group-open:rotate-45">+</span>
              </summary>
              <div className="pb-3">
                {col.links.map((l) => <FooterLink key={l.href} link={l} t={t} />)}
              </div>
            </details>
          ))}
        </div>

        {/* Columnas — desktop. Jerarquía 2026: Shop (comprar) → General (la
            marca) → Políticas (ayuda/legal) → Trabajá + RRSS. */}
        <div className="hidden md:grid grid-cols-4 gap-8">
          {/* Shop */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary-foreground/30 mb-4">Shop</p>
            {shopLinks.map((l) => (
              <Link key={l.label} href={l.href}
                className="block text-[12px] text-primary-foreground/55 hover:text-primary-foreground transition-colors mb-2.5">
                {t(l.label)}
              </Link>
            ))}
          </div>

          {/* General */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary-foreground/30 mb-4">General</p>
            {generalLinks.map((l) => (
              <Link key={l.label} href={l.href}
                className="block text-[12px] text-primary-foreground/55 hover:text-primary-foreground transition-colors mb-2.5">
                {t(l.label)}
              </Link>
            ))}
          </div>

          {/* Políticas */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary-foreground/30 mb-4">{t('Políticas')}</p>
            {politicasLinks.map((l) => (
              <Link key={l.label} href={l.href}
                className="block text-[12px] text-primary-foreground/55 hover:text-primary-foreground transition-colors mb-2.5">
                {t(l.label)}
              </Link>
            ))}
          </div>

          {/* Trabajá + RRSS — única aparición */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary-foreground/30 mb-4">Trabajá con Hype</p>
            <ul className="space-y-2 mb-8">
              {trabajaLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[13px] text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>

            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary-foreground/30 mb-4">{t('RRSS')}</p>
            {rrssLinks.map((l) => (
              <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                className="block text-[12px] text-primary-foreground/55 hover:text-primary-foreground transition-colors mb-2.5">
                {t(l.label)}
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
                onClick={() => setLanguage(lang)}
                className={`text-[11px] uppercase tracking-[0.12em] transition-colors ${
                  language === lang
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

        {/* Selector de moneda: misma lista que el navbar (lib/currency.ts). En
            mobile van sin el punto separador, que con ocho códigos no entra. */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-4 gap-y-2" aria-label={t('Moneda')} role="group">
          {CURRENCIES.map((cur, i) => (
            <span key={cur.code} className="flex items-center gap-x-3 sm:gap-x-4">
              <button
                onClick={() => setCurrency(cur.code)}
                title={t(cur.label)}
                aria-pressed={currency === cur.code}
                className={`text-[11px] uppercase tracking-[0.12em] transition-colors ${
                  currency === cur.code
                    ? "text-primary-foreground font-semibold"
                    : "text-primary-foreground/30 hover:text-primary-foreground/60"
                }`}
              >
                {cur.code}
              </button>
              {i < CURRENCIES.length - 1 && (
                <span className="hidden sm:inline text-primary-foreground/15 text-[10px]">·</span>
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
