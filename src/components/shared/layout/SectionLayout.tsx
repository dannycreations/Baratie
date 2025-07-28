import { memo, useId } from 'react';

import { useThemeStore } from '../../../stores/useThemeStore';

import type { HTMLAttributes, JSX, ReactNode } from 'react';

interface SectionLayoutProps extends HTMLAttributes<HTMLElement> {
  readonly children: ReactNode;
  readonly headerLeft: ReactNode;
  readonly contentClasses?: string;
  readonly headerRight?: ReactNode;
  readonly panelClasses?: string;
}

export const SectionLayout = memo<SectionLayoutProps>(
  ({ headerLeft, headerRight, children, panelClasses = '', contentClasses = '', ...rest }): JSX.Element => {
    const titleId = useId();
    const theme = useThemeStore((state) => state.theme);

    const panelClass = `flex flex-col overflow-hidden rounded-lg bg-${theme.surfaceSecondary} ${panelClasses}`.trim();
    const headerClass = `
      flex h-12 shrink-0 items-center justify-between border-b
      border-${theme.borderPrimary} bg-${theme.surfaceTertiary} p-2 text-${theme.contentPrimary}
    `;
    const contentClass = `grow overflow-auto p-3 ${contentClasses}`.trim();

    return (
      <section role="region" className={panelClass} aria-labelledby={titleId} {...rest}>
        <div className={headerClass}>
          <h2 id={titleId} className="min-w-0 truncate pr-2 text-lg font-semibold">
            {headerLeft}
          </h2>
          {headerRight && <div className="flex shrink-0 items-center gap-1">{headerRight}</div>}
        </div>
        <div className={contentClass}>{children}</div>
      </section>
    );
  },
);
