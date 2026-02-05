import { clsx } from 'clsx';

import type { JSX, ReactNode } from 'react';

interface SectionLayoutProps {
  readonly children?: ReactNode;
  readonly headerLeft: ReactNode;
  readonly contentClasses?: string;
  readonly headerRight?: ReactNode;
  readonly contentRef?: ((element: HTMLDivElement | null) => void) | { readonly current: HTMLDivElement | null };
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
  const panelClass = clsx('panel-container', className);
  const headerClass = clsx('panel-header');
  const contentClass = clsx('panel-content', contentClasses);

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
