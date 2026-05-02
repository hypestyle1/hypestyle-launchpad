'use client';

import { useState, useEffect } from "react";

const SESSION_KEY = "hype_popup_shown";
const WP_URL = process.env.NEXT_PUBLIC_WP_URL || "https://lightpink-rook-704850.hostingersite.com";

export default function NewsletterPopup() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    const show = () => setTimeout(() => setVisible(true), 1000);
    if (document.readyState === 'complete') {
      show();
    } else {
      window.addEventListener('load', show, { once: true });
    }
  }, []);

  const close = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;
    setLoading(true);
    try {
      await fetch(`${WP_URL}/wp-json/hypestyle/v1/newsletter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {}
    setLoading(false);
    setSubmitted(true);
    setTimeout(close, 2000);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className="relative flex w-full max-w-[780px] overflow-hidden shadow-2xl"
        style={{ maxHeight: "90vh" }}
      >
        {/* Botón cerrar */}
        <button
          onClick={close}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors bg-white/80 rounded-sm"
          aria-label="Cerrar"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>

        {/* Izquierda — foto editorial */}
        <div className="hidden md:block w-[45%] flex-shrink-0">
          <img
            src="/HYPE - POP UP (2).gif"
            alt="Hypestyle"
            className="w-full h-full object-cover"
            style={{ minHeight: "520px" }}
          />
        </div>

        {/* Derecha — cupón + form */}
        <div
          className="flex-1 flex flex-col"
          style={{ backgroundColor: "#F5F5F5" }}
        >
          {/* Imagen cupón — con margen */}
          <div className="flex-1 flex items-center justify-center px-6 pt-6 pb-3">
            <img
              src="/CUPON.jpg.jpeg"
              alt="10% Off Solo para miembros"
              className="w-full object-contain"
              style={{ maxHeight: "300px" }}
            />
          </div>

          {/* Form */}
          <div className="px-6 pb-5 pt-1" style={{ backgroundColor: "#F5F5F5" }}>
            {submitted ? (
              <p className="text-center text-[13px] font-semibold uppercase tracking-wider py-4">
                ¡Listo! Revisá tu email.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Tu email"
                  required
                  className="w-full border border-foreground/20 bg-white px-4 py-3 text-[13px] placeholder:text-foreground/35 focus:outline-none focus:border-foreground/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-bg-dark text-primary-foreground py-3 text-[12px] font-bold uppercase tracking-[0.1em] hover:bg-bg-dark/85 transition-colors disabled:opacity-60"
                >
                  {loading ? "..." : "Unirme"}
                </button>
              </form>
            )}

            <button
              onClick={close}
              className="w-full text-center text-[12px] text-foreground/40 hover:text-foreground/70 transition-colors mt-3"
            >
              Paso
            </button>

            {/* Logo negro — white invertido con CSS */}
            <div className="flex justify-center mt-4 mb-1">
              <img
                src="/STYLE&CULTURE WHITE.png"
                alt="Style&Culture"
                className="h-4 w-auto object-contain"
                style={{ filter: "invert(1)" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
