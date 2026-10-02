'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Pestañas de la sección Reseñas: las solicitudes (mails que salen) y la
// moderación (reseñas que entran). Van en el header de las dos pantallas.
const TABS = [
  { href: '/admin/reviews', label: 'Solicitudes', exact: true },
  { href: '/admin/reviews/moderacion', label: 'Moderación', exact: false },
];

export default function ReviewsTabs({ badge }: { badge?: number }) {
  const pathname = usePathname() || '';
  return (
    <nav className="flex items-center gap-1 bg-muted rounded-full p-0.5" aria-label="Secciones de reseñas">
      {TABS.map(t => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={`text-[12px] font-semibold rounded-full px-3 py-1 transition-colors flex items-center gap-1.5 ${
              active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {t.href === '/admin/reviews/moderacion' && !!badge && (
              <span className="text-[10px] font-bold bg-warning-soft text-warning rounded-full px-1.5 leading-4">{badge}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
