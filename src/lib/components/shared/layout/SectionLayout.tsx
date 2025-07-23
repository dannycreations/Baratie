import { memo, useId } from 'react';

import { useOverflowScroll } from '../../../hooks/useOverflowScroll';
import { useThemeStore } from '../../../stores/useThemeStore';

import type { HTMLAttributes, JSX, ReactNode } from 'react';

interface SectionLayoutProps extends HTMLAttributes<HTMLElement> {
  readonly children: ReactNode;
  readonly contentClasses?: string;
  readonly headerLeft: ReactNode;
  readonly headerRight?: ReactNode;
  readonly panelClasses?: string;
}

export const SectionLayout = memo<SectionLayoutProps>(
  ({ headerLeft, headerRight, children, panelClasses = '', contentClasses = '', ...rest }): JSX.Element => {
    const contentRef = useOverflowScroll<HTMLDivElement>({ xClasses: 'pb-2', yClasses: 'pr-2' });
    const titleId = useId();
    const theme = useThemeStore((state) => state.theme);

    const panelClass = `flex flex-col overflow-hidden rounded-lg bg-${theme.surfaceSecondary} ${panelClasses}`.trim();
    const headerClass = `flex h-12 shrink-0 items-center justify-between border-b border-${theme.borderPrimary} bg-${theme.surfaceTertiary} p-3 text-${theme.contentPrimary}`;
    const contentClass = `grow overflow-auto p-3 ${contentClasses}`.trim();

    return (
      <section role="region" aria-labelledby={titleId} className={panelClass} {...rest}>
        <div className={headerClass}>
          <h2 id={titleId} className="truncate pr-2 text-lg font-semibold">
            {headerLeft}
          </h2>
          {headerRight && <div className="flex shrink-0 items-center space-x-1.5">{headerRight}</div>}
        </div>
        <div ref={contentRef} className={contentClass}>
          {children}
        </div>
      </section>
    );
  },
);
