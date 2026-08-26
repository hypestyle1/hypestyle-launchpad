'use client';

import { useCallback, useEffect, useState } from 'react';

// Identidad del operador dentro del panel. Reemplaza las ~18 copias del mismo
// bloque (leer sessionStorage, llamar a auth/me, armar headers) que traía cada
// pantalla. Las pantallas migran a medida que se tocan.

export const WP_SECRET_KEY = 'hype_admin_key';

export interface AdminQuien {
  role: 'owner' | 'content';
  id: number | null;
  viaSharedKey?: boolean;
  secciones: string[];
}

export function useAdminAuth() {
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [quien, setQuien] = useState<AdminQuien | null>(null);
  // null = todavía no se sabe; false = sin credenciales válidas.
  const [autorizado, setAutorizado] = useState<boolean | null>(null);

  useEffect(() => { setAdminKey(sessionStorage.getItem(WP_SECRET_KEY)); }, []);

  const headers = useCallback((): Record<string, string> => {
    const k = typeof window !== 'undefined' ? sessionStorage.getItem(WP_SECRET_KEY) : null;
    return k ? { 'x-admin-key': k } : {};
  }, [adminKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let vivo = true;
    fetch('/api/admin/auth/me', { headers: headers() })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!vivo) return;
        if (d?.ok) { setQuien(d as AdminQuien); setAutorizado(true); }
        else setAutorizado(false);
      })
      .catch(() => { if (vivo) setAutorizado(false); });
    return () => { vivo = false; };
  }, [headers]);

  /** Guarda la clave compartida y fuerza re-chequeo de auth/me. */
  const ingresarConClave = useCallback((clave: string) => {
    sessionStorage.setItem(WP_SECRET_KEY, clave);
    setAdminKey(clave);
    setAutorizado(null);
  }, []);

  const puede = useCallback((s: string) => (quien?.secciones || []).includes(s), [quien]);

  return { adminKey, quien, autorizado, headers, puede, ingresarConClave };
}
