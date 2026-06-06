'use client';

import { useState, useEffect } from "react";

const SESSION_KEY = "hype_popup_shown";

export default function NewsletterPopup() {
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const show = () => {
      let imagesReady = false;
      let timerDone = false;

      const tryShow = () => { if (imagesReady && timerDone) setVisible(true); };

      setTimeout(() => { timerDone = true; tryShow(); }, 7000);

      let loaded = 0;
      const onDone = () => { loaded++; if (loaded >= 2) { imagesReady = true; tryShow(); } };
      const i1 = new window.Image();
      const i2 = new window.Image();
      i1.onload = i1.onerror = onDone;
      i2.onload = i2.onerror = onDone;
      i1.src = '/HYPE - POP UP (2).gif';
      i2.src = '/cupon-popup.png';
    };

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
      await fetch('/api/newsletter-subscribe', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
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
        className="relative flex w-full max-w-[820px] overflow-hidden rounded-[24px]"
        style={{
          maxHeight: "90vh",
          border: "1px solid rgba(255,255,255,0.28)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
        }}
      >
        {/* Fondo: gif a todo el popup (el panel glass lo difumina) */}
        <img
          src="/HYPE - POP UP (2).gif"
          alt="Hypestyle"
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden
        />

        {/* Botón cerrar — glass */}
        <button
          onClick={close}
          aria-label="Cerrar"
          className="absolute top-3.5 right-3.5 z-20 w-8 h-8 flex items-center justify-center text-foreground rounded-full transition-transform hover:scale-105"
          style={{
            background: "rgba(245,243,237,0.55)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.5)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>

        {/* Columna izquierda — gif bien encuadrado (solo desktop) */}
        <div className="hidden md:block relative w-[45%] flex-shrink-0" style={{ minHeight: "520px" }}>
          <img
            src="/HYPE - POP UP (2).gif"
            alt="Hypestyle"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>

        {/* Panel derecho — liquid glass sobre el gif */}
        <div
          className="relative z-10 flex-1 flex flex-col justify-center"
          style={{
            background: "rgba(245, 243, 237, 0.72)",
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
            borderLeft: "1px solid rgba(255,255,255,0.45)",
            boxShadow: "inset 1px 0 0 rgba(255,255,255,0.55)",
            minHeight: "520px",
          }}
        >
          {/* Cupón (PNG transparente) */}
          <div className="flex items-center justify-center px-7 pt-8 pb-2">
            <img
              src="/cupon-popup.png"
              alt="10% Off — Solo para miembros"
              className="w-full object-contain"
              style={{ maxHeight: "300px" }}
            />
          </div>

          {/* Form */}
          <div className="px-7 pb-8 pt-1">
            {submitted ? (
              <p className="text-center text-[13px] font-semibold uppercase tracking-wider py-4">
                ¡Listo! Revisá tu email.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-2.5">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  required
                  className="w-full px-4 py-3 text-[13px] rounded-[12px] placeholder:text-foreground/40 focus:outline-none transition-shadow"
                  style={{
                    background: "rgba(255,255,255,0.5)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.65)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
                  }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Tu email"
                  required
                  className="w-full px-4 py-3 text-[13px] rounded-[12px] placeholder:text-foreground/40 focus:outline-none transition-shadow"
                  style={{
                    background: "rgba(255,255,255,0.5)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.65)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
                  }}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-bg-dark text-primary-foreground py-3 text-[12px] font-bold uppercase tracking-[0.1em] rounded-full hover:bg-bg-dark/85 transition-colors disabled:opacity-60"
                >
                  {loading ? "..." : "Unirme"}
                </button>
              </form>
            )}

            <button
              onClick={close}
              className="w-full text-center text-[12px] text-foreground/45 hover:text-foreground/75 transition-colors mt-3"
            >
              Paso
            </button>

            {/* Logo Style&Culture (negro via invert) */}
            <div className="flex justify-center mt-4 mb-1">
              <img
                src="/STYLE&CULTURE WHITE.png"
                alt="Style&Culture"
                className="h-4 w-auto object-contain opacity-80"
                style={{ filter: "invert(1)" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
