import Link from 'next/link';
import { FOOTER_CONDITIONS, WHATSAPP_URL } from '@/lib/mayorista-copy';

// Pie del portal mayorista: condiciones en una línea, contacto y links.
// Mismo tono que el sitio: blanco, negro, mayúsculas chicas con tracking.
export default function MayoristaFooter() {
  return (
    <footer className="mt-16 border-t border-border px-5 sm:px-8 py-8">
      <div className="max-w-6xl mx-auto grid gap-6 sm:grid-cols-[1fr_auto] items-start">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/50 mb-2">Condiciones</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted-foreground">
            {FOOTER_CONDITIONS.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] uppercase tracking-wide">
          <Link href="/mayoristas/como-funciona" className="text-foreground/70 hover:text-foreground transition-colors">Cómo funciona</Link>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-foreground/70 hover:text-foreground transition-colors">WhatsApp</a>
          <Link href="/" className="text-foreground/40 hover:text-foreground transition-colors">hypestyle.com.ar</Link>
        </nav>
      </div>
      <p className="max-w-6xl mx-auto mt-6 text-[10px] uppercase tracking-[0.2em] text-foreground/30">Hype. · Style &amp; Culture · Buenos Aires</p>
    </footer>
  );
}
