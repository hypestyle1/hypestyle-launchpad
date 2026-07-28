// Estrella consistente con el path usado en el formulario público (app/review/[token]/ReviewClient.tsx).
function StarIcon({ filled, partial }: { filled: boolean; partial?: number }) {
  const path = 'M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L1.3 7.8l6.1-.7L10 1.5z';
  if (partial !== undefined && partial > 0 && partial < 1) {
    const id = `star-clip-${Math.round(partial * 100)}`;
    return (
      <svg viewBox="0 0 20 20" className="w-full h-full" aria-hidden="true">
        <defs>
          <clipPath id={id}>
            <rect x="0" y="0" width={20 * partial} height="20" />
          </clipPath>
        </defs>
        <path d={path} fill="none" stroke="currentColor" strokeWidth={1.2} className="text-foreground/25" />
        <path d={path} fill="currentColor" clipPath={`url(#${id})`} className="text-foreground" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" className="w-full h-full" aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.2}>
      <path d={path} className={filled ? 'text-foreground' : 'text-foreground/25'} />
    </svg>
  );
}

export default function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  const clamped = Math.min(5, Math.max(0, rating));
  return (
    <span
      className="inline-flex items-center gap-[2px]"
      role="img"
      aria-label={`${clamped} de 5 estrellas`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = clamped >= n;
        const partial = !filled && clamped > n - 1 ? clamped - (n - 1) : undefined;
        return (
          <span key={n} style={{ width: size, height: size }} aria-hidden="true">
            <StarIcon filled={filled} partial={partial} />
          </span>
        );
      })}
    </span>
  );
}
