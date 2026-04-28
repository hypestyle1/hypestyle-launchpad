'use client';

import Link from "next/link";

interface SectionHeaderProps {
  title: string;
  link?: string;
  linkLabel?: string;
  children?: React.ReactNode;
}

export default function SectionHeader({ title, link, linkLabel = "Ver todo", children }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4 flex-wrap">
        <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tight">{title}</h2>
        {children}
      </div>
      {link && (
        <Link href={link} className="nav-link text-[12px] font-medium uppercase tracking-[0.1em] text-muted-foreground pb-0.5">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
