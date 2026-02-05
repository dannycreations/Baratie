import { clsx } from 'clsx';

import type { JSX, ReactNode, RefObject } from 'react';

interface SectionLayoutProps {
  readonly children?: ReactNode;
  readonly headerLeft: ReactNode;
  readonly contentClasses?: string;
  readonly headerRight?: ReactNode;
  readonly contentRef?: RefObject<HTMLDivElement | null>;
  readonly className?: string;
}

export const SectionLayout = ({
  headerLeft,
  headerRight,
  children,
  className = '',
  contentClasses = '',
  contentRef,
}: SectionLayoutProps): JSX.Element => {
  const panelClass = clsx('flex flex-col overflow-hidden rounded-lg bg-surface-secondary', className);
  const headerClass = clsx(
    'flex h-12 shrink-0 items-center justify-between border-b p-2',
    'text-content-primary border-border-primary bg-surface-tertiary',
  );
  const contentClass = clsx('grow overflow-auto p-3', contentClasses);

  return (
    <section className={panelClass}>
      <header className={headerClass}>
        <h2 className="min-w-0 truncate pr-2 font-semibold text-lg">{headerLeft}</h2>
        {headerRight && <div className="flex shrink-0 items-center gap-1">{headerRight}</div>}
      </header>
      <div ref={contentRef} className={contentClass}>
        {children}
      </div>
    </section>
  );
};
