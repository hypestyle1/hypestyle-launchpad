import Link from 'next/link';
import { WHOLESALE_HOW_IT_WORKS } from '@/lib/mayorista-copy';

// Fila "Cómo funciona Hype Mayoristas": seis pilares, siempre visible,
// compacta. En el catálogo reemplaza al banner descartable de cuatro pasos.
// `detailed` la muestra con más aire (página pública).
export default function MayoristaHowItWorks({ detailed = false, showLink = true }: { detailed?: boolean; showLink?: boolean }) {
  return (
    <section className={`rounded-[16px] border border-border ${detailed ? 'p-6 sm:p-8' : 'bg-bg-alt/40 p-5'} mb-8`}>
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <p className="text-[11px] uppercase tracking-[0.2em] font-semibold text-foreground/70">Cómo funciona Hype Mayoristas</p>
        {showLink && (
          <Link href="/mayoristas/como-funciona" className="text-[11px] uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors">
            Ver todo →
          </Link>
        )}
      </div>
      <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 ${detailed ? 'gap-6' : 'gap-4'}`}>
        {WHOLESALE_HOW_IT_WORKS.map((b) => (
          <div key={b.title}>
            <p className={`${detailed ? 'text-[14px]' : 'text-[13px]'} font-semibold leading-tight`}>{b.title}</p>
            <p className="text-[12px] text-muted-foreground leading-snug mt-1">{b.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
