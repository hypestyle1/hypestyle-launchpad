'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

// Tema del panel: light / dark / system, persistido por navegador. La clase
// `dark` se aplica sobre el wrapper .admin-theme (en AdminShell), nunca sobre
// <html>: el sitio público no tiene modo oscuro y no debe heredarlo.

export type AdminTheme = 'light' | 'dark' | 'system';
const THEME_KEY = 'hype_admin_theme';

export function useAdminTheme() {
  const [theme, setThemeState] = useState<AdminTheme>('system');
  const [dark, setDark] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') setThemeState(saved);
    setListo(true);
  }, []);

  useEffect(() => {
    if (!listo) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const aplicar = () => setDark(theme === 'dark' || (theme === 'system' && mq.matches));
    aplicar();
    mq.addEventListener('change', aplicar);
    return () => mq.removeEventListener('change', aplicar);
  }, [theme, listo]);

  const setTheme = useCallback((t: AdminTheme) => {
    localStorage.setItem(THEME_KEY, t);
    setThemeState(t);
  }, []);

  return { theme, setTheme, dark };
}

const OPCIONES: { valor: AdminTheme; Icono: typeof Sun; titulo: string }[] = [
  { valor: 'light', Icono: Sun, titulo: 'Claro' },
  { valor: 'system', Icono: Monitor, titulo: 'Según el sistema' },
  { valor: 'dark', Icono: Moon, titulo: 'Oscuro' },
];

export function ThemeToggle({ theme, onChange }: { theme: AdminTheme; onChange: (t: AdminTheme) => void }) {
  return (
    <div className="inline-flex items-center border border-border rounded-full p-0.5 bg-background" role="radiogroup" aria-label="Tema">
      {OPCIONES.map(({ valor, Icono, titulo }) => (
        <button
          key={valor}
          role="radio"
          aria-checked={theme === valor}
          title={titulo}
          onClick={() => onChange(valor)}
          className={`p-1.5 rounded-full transition-colors ${
            theme === valor ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Icono size={13} strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}
