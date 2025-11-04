import { memo } from 'react';

import { useThemeStore } from '../../../stores/useThemeStore';
import { cn } from '../../../utilities/styleUtil';

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
    const theme = useThemeStore((state) => state.theme);

    const panelClass = cn('flex flex-col overflow-hidden rounded-lg', `bg-${theme.surfaceSecondary}`, className);
    const headerClass = cn(
      'flex h-12 shrink-0 items-center justify-between p-2 border-b',
      `text-${theme.contentPrimary}`,
      `border-${theme.borderPrimary}`,
      `bg-${theme.surfaceTertiary}`,
    );
    const contentClass = cn('grow p-3 overflow-auto', contentClasses);

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
  },
);
