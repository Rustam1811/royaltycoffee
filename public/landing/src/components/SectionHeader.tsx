import type { ReactNode } from 'react';
import clsx from 'clsx';

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  align?: 'left' | 'center';
};

export function SectionHeader({ eyebrow, title, description, align = 'left' }: SectionHeaderProps) {
  return (
    <div className={clsx('mx-auto max-w-4xl', align === 'center' ? 'text-center' : 'text-left')}>
      {eyebrow && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#C68B59]">
          {eyebrow}
        </p>
      )}
      <h2 className="text-4xl font-bold text-[#2C1810] sm:text-5xl lg:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base leading-relaxed text-[#4A2C2A]/70 sm:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}

