import { cn } from 'cnfast';

import type { JSX, ReactNode } from 'react';

interface SectionLayoutProps {
  readonly children?: ReactNode;
  readonly headerLeft: ReactNode;
  readonly contentClasses?: string;
  readonly headerRight?: ReactNode;
  readonly className?: string;
}

export const SectionLayout = ({ headerLeft, headerRight, children, className = '', contentClasses = '' }: SectionLayoutProps): JSX.Element => (
  <section className={cn('panel-container', className)}>
    <header className="panel-header">
      <h2 className="panel-header-title">{headerLeft}</h2>
      {headerRight && <div className="panel-header-actions">{headerRight}</div>}
    </header>
    <div className={cn('panel-content', contentClasses)}>{children}</div>
  </section>
);
