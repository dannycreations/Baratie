import { memo } from 'react';

import { CardLayout } from './CardLayout';

import type { JSX, ReactNode } from 'react';

interface SectionLayoutProps {
  readonly ariaLive?: 'assertive' | 'off' | 'polite';
  readonly cardClassName?: string;
  readonly cardContentClassName?: string;
  readonly children?: ReactNode | (() => ReactNode);
  readonly headerActions?: ReactNode;
  readonly title: ReactNode;
}

export const SectionLayout = memo<SectionLayoutProps>(
  ({ title, headerActions, children, cardClassName, cardContentClassName, ariaLive }): JSX.Element => {
    const content = typeof children === 'function' ? children() : children;
    return (
      <CardLayout ariaLive={ariaLive} className={cardClassName} contentClassName={cardContentClassName} headerActions={headerActions} title={title}>
        {content}
      </CardLayout>
    );
  },
);
