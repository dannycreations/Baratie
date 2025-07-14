import { memo, useId } from 'react';

import { useOverflowScroll } from '../../../hooks/useOverflowScroll';
import { useThemeStore } from '../../../stores/useThemeStore';
import { HeaderLayout } from './HeaderLayout';

import type { JSX, ReactNode } from 'react';

interface SectionLayoutProps {
  readonly ariaLive?: 'assertive' | 'off' | 'polite';
  readonly children: ReactNode;
  readonly className?: string;
  readonly contentClassName?: string;
  readonly headerActions?: ReactNode;
  readonly title: ReactNode;
}

export const SectionLayout = memo<SectionLayoutProps>(
  ({ title, headerActions, children, className = '', contentClassName = '', ariaLive }): JSX.Element => {
    const contentRef = useOverflowScroll<HTMLDivElement>({ xClassName: 'pr-2', yClassName: 'pb-2' });
    const titleId = useId();
    const theme = useThemeStore((state) => state.theme);

    const headerClass = [
      'flex',
      'h-12',
      'shrink-0',
      'items-center',
      'justify-between',
      `border-b border-${theme.borderPrimary}`,
      `bg-${theme.surfaceTertiary}`,
      'p-3',
      `text-${theme.contentPrimary}`,
    ]
      .filter(Boolean)
      .join(' ');
    const contentClass = ['grow', 'overflow-auto', 'p-3', contentClassName].filter(Boolean).join(' ');
    const containerClass = ['flex', 'flex-col', 'overflow-hidden', 'rounded-lg', `bg-${theme.surfaceSecondary}`, className].filter(Boolean).join(' ');

    return (
      <section role="region" aria-live={ariaLive} aria-labelledby={titleId} className={containerClass}>
        <div className={headerClass}>
          <HeaderLayout
            leftContent={
              <h2 id={titleId} className="text-lg font-semibold">
                {title}
              </h2>
            }
            rightContent={headerActions}
          />
        </div>
        <div ref={contentRef} className={contentClass}>
          {children}
        </div>
      </section>
    );
  },
);
