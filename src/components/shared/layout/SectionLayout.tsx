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
  const headerClass = 'panel-header';
  const contentClass = clsx('panel-content', contentClasses);

  return (
    <section className={panelClass}>
      <header className={headerClass}>
        <h2 className="panel-header-title">{headerLeft}</h2>
        {headerRight && <div className="panel-header-actions">{headerRight}</div>}
      </header>
      <div ref={contentRef} className={contentClass}>
        {children}
      </div>
    </section>
  );
};
