import type { Metadata } from 'next';
import Link from 'next/link';
import MayoristaHowItWorks from '@/components/mayorista/MayoristaHowItWorks';
import { HOW_IT_WORKS_SECTIONS, WHATSAPP_URL, MIN_ORDER_LABEL } from '@/lib/mayorista-copy';

// Página pública (sin sesión, ver middleware): la lee quien todavía no tiene
// cuenta. Explica el programa completo y lleva a pedir acceso o a ingresar.
export const metadata: Metadata = {
  title: 'Cómo funciona — Hype Mayoristas',
  robots: { index: false, follow: false, nocache: true },
};

const glassBar = {
  background: 'rgba(255, 255, 255, 0.82)',
  backdropFilter: 'blur(32px) saturate(200%)',
  WebkitBackdropFilter: 'blur(32px) saturate(200%)',
  borderBottom: '1px solid rgba(0,0,0,0.08)',
} as React.CSSProperties;

export default function ComoFuncionaPage() {
  return (
    <>
      <header className="flex items-center justify-between px-5 sm:px-8 py-4 sticky top-0 z-20" style={glassBar}>
        <Link href="/mayoristas/como-funciona" className="flex items-center gap-2.5">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-5 w-auto" />
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-foreground/40 hidden sm:inline">Mayoristas</span>
        </Link>
        <nav className="flex items-center gap-5 text-[12px] uppercase tracking-wide">
          <Link href="/mayoristas/login" className="text-foreground/70 hover:text-foreground transition-colors">Ingresar</Link>
          <Link href="/mayoristas/solicitud" className="px-4 py-2 rounded-full bg-bg-dark text-primary-foreground text-[11px] font-semibold hover:bg-bg-dark/85 transition-colors">Pedir acceso</Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
        <p className="text-[10px] uppercase tracking-[0.25em] text-foreground/50">Hype Mayoristas</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-2">Cómo funciona</h1>
        <p className="text-[14px] text-muted-foreground mt-3 max-w-2xl leading-relaxed">
          Vendemos a locales y proyectos que cuidan la marca. Comprás a la mitad del precio de venta al público en todo el catálogo,
          con stock en vivo y surtido libre. Los que piden seguido entran primero a cada drop, reciben material para sus redes y pueden ganar la exclusividad de su ciudad.
        </p>

        <div className="mt-8">
          <MayoristaHowItWorks detailed showLink={false} />
        </div>

        <div className="grid sm:grid-cols-2 gap-x-10 gap-y-8 mt-4">
          {HOW_IT_WORKS_SECTIONS.map((s) => (
            <section key={s.id} id={s.id}>
              <h2 className="text-[15px] font-semibold tracking-tight">{s.title}</h2>
              <ul className="mt-2 space-y-1.5">
                {s.items.map((it, i) => (
                  <li key={i} className="text-[13px] text-muted-foreground leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-px before:bg-foreground/40">{it}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-[16px] border border-foreground bg-bg-dark text-primary-foreground px-6 sm:px-10 py-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-primary-foreground/60">Empezá</p>
          <h2 className="text-2xl font-bold tracking-tight mt-2">Pedí tu cuenta mayorista</h2>
          <p className="text-[13px] text-primary-foreground/70 mt-2 max-w-xl">
            Sin costo, sin exclusividades por adelantado. Pedido mínimo {MIN_ORDER_LABEL} a precio mayorista.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <Link href="/mayoristas/solicitud" className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide rounded-full bg-primary-foreground text-bg-dark hover:bg-primary-foreground/90 transition-colors">Pedir acceso →</Link>
            <Link href="/mayoristas/login" className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide rounded-full border border-primary-foreground/40 text-primary-foreground hover:border-primary-foreground transition-colors">Ya tengo cuenta</Link>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/60 hover:text-primary-foreground transition-colors sm:ml-2">Hablar por WhatsApp</a>
          </div>
        </div>
      </main>
    </>
  );
}
