'use client';

/**
 * Cabecera editorial compacta del sistema 2026 para páginas de catálogo:
 * kicker + título en tipo oración con el tracking firma + contador real +
 * descripción corta. Reemplaza a la banda oscura de ~260px: los productos
 * entran en la primera pantalla.
 */
export default function CatalogHeader({
  kicker,
  title,
  count,
  description,
}: {
  kicker: string;
  title: string;
  count?: number;
  description?: string;
}) {
  return (
    <header className="px-4 md:px-6 pt-6 md:pt-8 pb-4 md:pb-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2.5">{kicker}</p>
      <h1 className="flex items-baseline gap-2.5 text-[34px] md:text-[48px] font-semibold tracking-[-0.035em] leading-[1.02]">
        {title}
        {typeof count === 'number' && count > 0 && (
          <span className="text-[13px] font-normal tracking-normal text-muted-foreground tabular-nums">{count}</span>
        )}
      </h1>
      {description && <p className="text-[14px] text-muted-foreground mt-2.5 max-w-md leading-relaxed">{description}</p>}
    </header>
  );
}
