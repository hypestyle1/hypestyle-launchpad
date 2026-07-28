export function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-800 bg-amber-100 border border-amber-200 rounded-[4px] px-2 py-[3px]">
      Demostración
    </span>
  );
}

export default function DemoContentNotice({ className = '' }: { className?: string }) {
  return (
    <div
      role="note"
      className={`flex items-start gap-2.5 text-[12px] leading-relaxed text-amber-900 bg-amber-50 border border-amber-200 rounded-[8px] px-4 py-3 ${className}`}
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.1em] shrink-0 mt-[1px]">Contenido de demostración</span>
      <span className="text-amber-800/80">
        Estas reseñas son de muestra para previsualizar el diseño. No corresponden a compras ni clientes reales.
      </span>
    </div>
  );
}
