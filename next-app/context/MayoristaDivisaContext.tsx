'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { FX_FALLBACK, mergeRates, type FxRates } from '@/lib/fx';
import { formatDivisa, notaDivisa, parseDivisa, type MayoristaDivisa } from '@/lib/mayorista-divisa';

// En qué divisa ve los precios el mayorista. Vive aparte de LocaleContext a
// propósito: el portal es otra puerta y el mismo navegador puede estar
// mirando la tienda en pesos y el catálogo mayorista en dólares sin que una
// elección pise a la otra.
//
// La cotización sale de /api/fx-rate, la misma que publica la tienda y con la
// que cobra PayPal (ver lib/fx.ts).

const STORAGE_KEY = 'hy_mayorista_divisa';

interface Value {
  divisa: MayoristaDivisa;
  setDivisa: (d: MayoristaDivisa) => void;
  rates: FxRates;
  /** Un precio en pesos escrito en la divisa elegida. */
  fmt: (ars: number) => string;
  /** Cotización y moneda de facturación, o null si está en pesos. */
  nota: string | null;
}

const Ctx = createContext<Value | null>(null);

export function MayoristaDivisaProvider({ children }: { children: ReactNode }) {
  // Arranca en pesos para que el HTML del server y el del cliente coincidan;
  // lo guardado se aplica recién después de hidratar.
  const [divisa, setDivisaState] = useState<MayoristaDivisa>('ARS');
  // Hasta que responde /api/fx-rate se pinta con el respaldo de lib/fx: un
  // corte de dolarapi degrada a una cotización vieja, nunca a NaN.
  const [rates, setRates] = useState<FxRates>(FX_FALLBACK);

  useEffect(() => {
    // ?divisa=USD manda y queda guardada: es el link que se le pasa a un
    // mayorista de afuera para que entre y ya vea su moneda.
    const fromUrl = parseDivisa(new URLSearchParams(window.location.search).get('divisa'));
    if (fromUrl) {
      setDivisaState(fromUrl);
      try { localStorage.setItem(STORAGE_KEY, fromUrl); } catch {}
      return;
    }
    try {
      const stored = parseDivisa(localStorage.getItem(STORAGE_KEY));
      if (stored) setDivisaState(stored);
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/fx-rate')
      .then(r => (r.ok ? r.json() : null))
      .then((data: unknown) => { if (!cancelled && data) setRates(mergeRates(data)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  function setDivisa(d: MayoristaDivisa) {
    setDivisaState(d);
    try { localStorage.setItem(STORAGE_KEY, d); } catch {}
  }

  const value: Value = {
    divisa,
    setDivisa,
    rates,
    fmt: (ars: number) => formatDivisa(ars, divisa, rates),
    nota: notaDivisa(divisa, rates),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Fuera del provider devuelve pesos con el respaldo: un componente mayorista
 * que se renderice suelto muestra el precio de siempre en vez de romper.
 */
export function useMayoristaDivisa(): Value {
  const ctx = useContext(Ctx);
  if (ctx) return ctx;
  return {
    divisa: 'ARS',
    setDivisa: () => {},
    rates: FX_FALLBACK,
    fmt: (ars: number) => formatDivisa(ars, 'ARS', FX_FALLBACK),
    nota: null,
  };
}
