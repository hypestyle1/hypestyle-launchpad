import FlowHoverButton from '@/components/ui/flow-hover-button';

/**
 * Cabecera común de las secciones de la home post-Cyber (9/11).
 *
 * Editorial (ver feedback "secciones editoriales, no landing"): eyebrow chico
 * con tracking, título en caja baja y peso medio, bajada liviana. El CTA va al
 * costado del título — nunca abajo de la sección — y es FlowHoverButton: vidrio
 * beige de las cabeceras de colección y relleno negro en diagonal al hover.
 */
export default function HomeSectionHeader({
  eyebrow,
  title,
  sub,
  cta,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  cta?: { href: string; label: string };
}) {
  return (
    <header className="mb-5 flex items-end justify-between gap-4 md:mb-8 md:gap-10">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10px] uppercase tracking-[0.22em] text-text-light md:text-[11px]">{eyebrow}</p>
        )}
        <h2 className="mt-1.5 text-[24px] font-medium leading-[1.04] tracking-[-0.02em] md:mt-2 md:text-[36px]">
          {title}
        </h2>
        {sub && (
          <p className="mt-1.5 max-w-[52ch] text-[13px] leading-[1.5] text-text-light md:mt-2 md:text-[14.5px]">{sub}</p>
        )}
      </div>
      {cta && (
        <FlowHoverButton href={cta.href} size="sm" className="md:h-10 md:px-5 md:text-[12.5px]">
          {cta.label}
        </FlowHoverButton>
      )}
    </header>
  );
}
