import { memo, useId } from 'react';

import { useThemeStore } from '../../../stores/useThemeStore';

import type { HTMLAttributes, JSX, ReactNode, RefObject } from 'react';

interface SectionLayoutProps extends HTMLAttributes<HTMLElement> {
  readonly children: ReactNode;
  readonly headerLeft: ReactNode;
  readonly contentClasses?: string;
  readonly headerRight?: ReactNode;
  readonly contentRef?: RefObject<HTMLDivElement | null>;
}

export const SectionLayout = memo<SectionLayoutProps>(
  ({ headerLeft, headerRight, children, className = '', contentClasses = '', contentRef, ...rest }): JSX.Element => {
    const titleId = useId();
    const theme = useThemeStore((state) => state.theme);

    const panelClass = `flex flex-col overflow-hidden rounded-lg bg-${theme.surfaceSecondary} ${className}`.trim();
    const headerClass = `
      flex h-12 shrink-0 items-center justify-between border-b
      border-${theme.borderPrimary} bg-${theme.surfaceTertiary} p-2 text-${theme.contentPrimary}
    `.trim();
    const contentClass = `grow overflow-auto p-3 ${contentClasses}`.trim();

    return (
      <section role="region" className={panelClass} aria-labelledby={titleId} {...rest}>
        <div className={headerClass}>
          <h2 id={titleId} className="min-w-0 truncate pr-2 text-lg font-semibold">
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
