import { memo, useId } from 'react';

import { useThemeStore } from '../../../stores/useThemeStore';

import type { JSX, ReactNode, RefObject } from 'react';

interface SectionLayoutProps {
  readonly children: ReactNode;
  readonly headerLeft: ReactNode;
  readonly contentClasses?: string;
  readonly headerRight?: ReactNode;
  readonly contentRef?: RefObject<HTMLDivElement | null>;
  readonly className?: string;
}

export const SectionLayout = memo<SectionLayoutProps>(
  ({ headerLeft, headerRight, children, className = '', contentClasses = '', contentRef }): JSX.Element => {
    const titleId = useId();
    const theme = useThemeStore((state) => state.theme);

    const panelClass = `flex flex-col overflow-hidden rounded-lg bg-${theme.surfaceSecondary} ${className}`.trim();
    const headerClass =
      `flex h-12 shrink-0 items-center justify-between p-2 text-${theme.contentPrimary} border-b border-${theme.borderPrimary} bg-${theme.surfaceTertiary}`.trim();
    const contentClass = `grow p-3 overflow-auto ${contentClasses}`.trim();

    return (
      <section className={panelClass}>
        <div className={headerClass}>
          <h2 id={titleId} className="min-w-0 truncate pr-2 font-semibold text-lg">
            {headerLeft}
          </h2>
          {headerRight && <div className="flex shrink-0 items-center gap-1">{headerRight}</div>}
        </div>
        <div ref={contentRef} className={contentClass}>
          {children}
        </div>
      </section>
    );
  },
);
