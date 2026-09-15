'use client';

import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";

interface SectionHeaderProps {
  title: string;
  link?: string;
  linkLabel?: string;
  children?: React.ReactNode;
}

export default function SectionHeader({ title, link, linkLabel = "Ver todo", children }: SectionHeaderProps) {
  const { t } = useLocale();
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4 flex-wrap">
        <h2 className="text-[22px] md:text-[28px] font-semibold tracking-[-0.01em] leading-none">{t(title)}</h2>
        {children}
      </div>
      {link && (
        <Link href={link} className="text-[12px] text-foreground underline underline-offset-4 decoration-foreground/40 hover:decoration-foreground transition-colors">
          {t(linkLabel)}
        </Link>
      )}
    </div>
  );
}
